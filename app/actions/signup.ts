"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { resend, EMAIL_FROM } from "@/lib/resend";
import { WizardData } from "@/components/wizard/steps";
import { initializeSubscriptionPayment } from "@/actions/payment";

export async function completeSignupWithInvite(data: WizardData) {
    const supabaseAdmin = createAdminClient();
    let createdUserId: string | null = null;

    try {
        console.log("[SIGNUP-DEBUG] Starting signup for:", data.email);
        console.log("[SIGNUP-DEBUG] Data:", JSON.stringify(data));

        // 1. Create User (Without Password, Auto Confirm)
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
            email: data.email,
            email_confirm: true,
            user_metadata: { full_name: data.fullName, phone: data.phone }
        });

        if (userError) {
            console.error("[SIGNUP-DEBUG] Create User Error:", userError);
            throw new Error(`[USER-CREATE] ${userError.message}`);
        }

        if (userError) throw userError;
        if (!userData.user) throw new Error("Kullanıcı bulunamadı.");

        createdUserId = userData.user.id;

        // 2. Generate Invite Token
        const { data: tokenData, error: tokenError } = await supabaseAdmin
            .from('invite_tokens')
            .insert({ user_id: createdUserId })
            .select()
            .single();

        if (tokenError) throw new Error(`Token oluşturma hatası: ${tokenError.message}`);

        // 3. Create Tenant
        const tenantName = data.billingType === 'corporate' ? data.companyName : data.fullName;

        const { data: tenant, error: tenantError } = await supabaseAdmin
            .from("tenants")
            .insert({
                name: tenantName,
                marketing_consent: data.marketing || false
            })
            .select()
            .single();

        if (tenantError) throw new Error(`İşletme oluşturma hatası: ${tenantError.message}`);

        // 4. Create Profile
        const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .upsert({ user_id: createdUserId, full_name: data.fullName, phone: data.phone });

        if (profileError) throw new Error(`Profil oluşturma hatası: ${profileError.message}`);

        // 5. Create Members Link
        const { error: memberError } = await supabaseAdmin
            .from("tenant_members")
            .insert({
                tenant_id: tenant.id,
                user_id: createdUserId,
                role: 'tenant_owner'
            });

        if (memberError) throw new Error(`Üyelik hatası: ${memberError.message}`);

        // 6. Create Subscription (Pending)
        let baseKey = 'uppypro_inbox';
        let aiKey = null;

        if (data.plan === 'ai_pro') {
            aiKey = 'uppypro_enterprise';
        } else if (data.plan.startsWith('ai_')) {
            aiKey = 'uppypro_ai';
        }

        const { error: subError } = await supabaseAdmin
            .from("subscriptions")
            .insert({
                tenant_id: tenant.id,
                status: 'pending',
                base_product_key: baseKey,
                ai_product_key: aiKey,
                billing_cycle: 'monthly'
            });

        if (subError) throw new Error(`Abonelik hatası: ${subError.message}`);

        // 7. Save Billing Info
        if (data.billingType === 'corporate') {
            await supabaseAdmin.from("billing_info").upsert({
                tenant_id: tenant.id,
                billing_type: 'company',
                company_name: data.companyName,
                tax_office: data.taxOffice,
                tax_number: data.taxNumber,
                address_full: data.address,
                address_city: data.city,
                address_district: data.district,
                contact_email: data.email,
                contact_phone: data.phone
            }, { onConflict: 'tenant_id' });
        } else {
            await supabaseAdmin.from("billing_info").upsert({
                tenant_id: tenant.id,
                billing_type: 'individual',
                full_name: data.fullName,
                tckn: data.tcKn,
                address_full: data.address,
                address_city: data.city,
                address_district: data.district,
                contact_email: data.email,
                contact_phone: data.phone
            }, { onConflict: 'tenant_id' });
        }

        // 8. Initialize Iyzico
        const productKey = aiKey || baseKey;
        const { data: prices } = await supabaseAdmin.from("pricing").select("iyzico_pricing_plan_reference_code").eq("product_key", productKey).single();

        let planCode = prices?.iyzico_pricing_plan_reference_code;

        if (!planCode) {
            console.error("Plan code not found for", productKey);
            // Fail gracefully? Or allow signup but payment manual?
            // Since this is payment flow, fail.
            throw new Error("Ödeme planı bulunamadı. Lütfen yönetici ile iletişime geçin.");
        }

        const result = await initializeSubscriptionPayment({
            pricingPlanReferenceCode: planCode,
            user: {
                id: data.email,
                email: data.email,
                name: data.fullName,
                phone: data.phone,
                address: `${data.address} ${data.district}/${data.city}`,
                identityNumber: data.tcKn || '11111111111'
            },
            tenantId: tenant.id
        });

        if (result.error) {
            throw new Error(result.error);
        }

        return {
            success: true,
            checkoutFormContent: result.checkoutFormContent,
            inviteToken: tokenData.token
        };

    } catch (e: any) {
        console.error("Complete Signup Error:", e);
        if (createdUserId) {
            await supabaseAdmin.auth.admin.deleteUser(createdUserId);
        }
        if (e.message?.includes("already been registered")) {
            return { error: "Bu e-posta adresi zaten kayıtlı. Giriş yapmayı deneyin." };
        }
        return { error: `[SIGNUP-ERR] ${e.message}` || "Bir hata oluştu." };
    }
}
