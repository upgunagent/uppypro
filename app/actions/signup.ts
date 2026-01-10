"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { resend, EMAIL_FROM } from "@/lib/resend";
import { WizardData } from "@/components/wizard/steps";

export async function completeSignupWithInvite(data: WizardData, cardData?: { cardHolder: string, cardNumber: string, expiry: string, cvc: string }) {
    const supabaseAdmin = createAdminClient();
    let createdUserId: string | null = null;

    try {
        console.log("Starting signup for:", data.email);

        // 1. Create User (Without Password, Auto Confirm)
        // We create the user first.
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
            email: data.email,
            email_confirm: true,
            user_metadata: { full_name: data.fullName, phone: data.phone }
        });

        if (userError) throw userError; // Throw to catch block
        if (!userData.user) throw new Error("Kullanıcı bulunamadı.");

        createdUserId = userData.user.id;

        // 2. Generate Invite/Recovery Link
        // We use 'recovery' type effectively as 'set password'
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: "recovery",
            email: data.email,
            options: {
                redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/update-password`
            }
        });

        if (linkError) throw new Error(`Link oluşturma hatası: ${linkError.message}`);
        const inviteLink = linkData.properties.action_link;

        // 3. Create Tenant
        // Use company name if corporate, else full name
        const tenantName = data.billingType === 'corporate' ? data.companyName : data.fullName;

        const { data: tenant, error: tenantError } = await supabaseAdmin
            .from("tenants")
            .insert({ name: tenantName })
            .select()
            .single();

        if (tenantError) throw new Error(`İşletme oluşturma hatası: ${tenantError.message}`);

        // 4. Create Profile
        const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .upsert({ user_id: createdUserId, full_name: data.fullName, phone: data.phone }); // Added phone mapping

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

        // --- PAYMENT METHOD SAVING (MOCK) ---
        if (cardData) {
            const lastFour = cardData.cardNumber.slice(-4);
            await supabaseAdmin.from("payment_methods").insert({
                tenant_id: tenant.id,
                provider: 'iyzico',
                card_alias: `card_std_${Date.now()}`,
                last_four: lastFour || '0000',
                card_family: 'Visa', // Mock
                card_association: 'Credit Card', // Mock
                is_default: true
            });
        }
        // ------------------------------------

        // 6. Create Subscription
        // Map plan string from wizard to product keys
        // Wizard Plans: "base", "ai_starter", "ai_medium", "ai_pro"
        // DB Schema expectations: 
        // base_product_key: 'base_inbox' (always for paid plans usually, or derived)
        // ai_product_key: 'uppypro_ai', 'uppypro_enterprise' etc. need to map correctly.

        // Let's create a mapping based on my observation of pricing.
        // Assuming 'base' -> UppyPro Inbox
        // 'ai_starter' -> UppyPro AI (implied)
        // 'ai_medium' -> UppyPro AI (higher tier?) - user said "UppyPro AI" and "UppyPro Kurumsal".
        // Let's map simplified for now based on what I know or use generic logic.

        let baseKey = 'uppypro_inbox';
        let aiKey = null;

        if (data.plan === 'ai_starter' || data.plan === 'ai_medium') {
            aiKey = 'uppypro_ai';
        } else if (data.plan === 'ai_pro') {
            aiKey = 'uppypro_ai'; // or 'uppypro_enterprise' if that maps to 'Kurumsal'
        }

        // Wait, user defined: 
        // 1. Inbox (Base)
        // 2. AI (Inbox + AI)
        // 3. Kurumsal (Inbox + Automation + AI)

        // In Wizard StepSummary:
        // base -> UppyPro Inbox
        // ai_starter -> UppyPro AI Başlangıç
        // ai_medium -> UppyPro AI Orta
        // ai_pro -> UppyPro AI Profesyonel

        // I will map:
        // base -> base_inbox, ai=null
        // ai_starter/medium -> base_inbox, ai='uppypro_ai'
        // ai_pro -> base_inbox, ai='uppypro_enterprise' (assuming Pro == Kurumsal for now, or just AI)

        if (data.plan === 'ai_pro') {
            aiKey = 'uppypro_enterprise';
        } else if (data.plan.startsWith('ai_')) {
            aiKey = 'uppypro_ai';
        }

        const { error: subError } = await supabaseAdmin
            .from("subscriptions")
            .insert({
                tenant_id: tenant.id,
                status: 'active', // Mark active directly as payment is "mocked/done"
                base_product_key: baseKey,
                ai_product_key: aiKey,
                billing_cycle: 'monthly'
            });

        if (subError) throw new Error(`Abonelik hatası: ${subError.message}`);

        // 7. Save Billing Info
        // We have billing details in wizard data
        if (data.billingType === 'corporate') {
            await supabaseAdmin.from("billing_info").upsert({
                tenant_id: tenant.id,
                company_name: data.companyName,
                tax_office: data.taxOffice,
                tax_number: data.taxNumber,
                address: data.address,
                city: data.city,
                district: data.district,
                tax_id: data.taxNumber // usually tax_number column calls this
            }, { onConflict: 'tenant_id' });
        }

        // 8. Send Invite Email
        const planName = data.plan === 'base' ? 'UppyPro Inbox'
            : data.plan.includes('ai') ? 'UppyPro AI' : 'UppyPro';

        const logoUrl = 'https://upgunai.com/brand-logo-text.png';

        await resend.emails.send({
            from: EMAIL_FROM,
            to: data.email,
            subject: 'UppyPro Üyeliğiniz Oluşturuldu - Şifrenizi Belirleyin',
            html: `
                <div style="display: none; font-size: 1px; color: #fefefe; line-height: 1px; font-family: sans-serif; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
                    Hoş geldiniz! Üyeliğiniz başarıyla oluşturuldu, panelinize erişmek için şifrenizi belirleyin.
                </div>
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; border: 1px solid #e2e8f0; border-radius: 12px;">
                    <img src="${logoUrl}" alt="UPGUN AI" style="height: 32px; margin-bottom: 24px;" />
                    
                    <h2 style="color: #1e293b; margin-bottom: 16px;">Hoş Geldiniz! 🎉</h2>
                    <p style="color: #64748b; margin-bottom: 24px;">
                        <strong>${tenantName}</strong> olarak <strong>${planName}</strong> paketiniz başarıyla oluşturuldu.
                        Panelinize erişmek için lütfen şifrenizi belirleyin.
                    </p>

                    <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 24px; text-align: left;">
                        <p style="margin: 4px 0; font-size: 14px; color: #64748b;">Paket: <strong style="color: #0f172a;">${planName}</strong></p>
                        <p style="margin: 4px 0; font-size: 14px; color: #64748b;">Kullanıcı: <strong style="color: #0f172a;">${data.email}</strong></p>
                    </div>

                    <a href="${inviteLink}" style="display: inline-block; background-color: #ea580c; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                        Şifremi Belirle ve Giriş Yap
                    </a>

                    <p style="font-size: 12px; color: #94a3b8; margin-top: 32px;">
                        Bu bağlantı güvenliğiniz için tek kullanımlıktır.
                    </p>
                </div>
            `
        });

        return { success: true };

    } catch (e: any) {
        console.error("Complete Signup Error:", e);

        // ROLLBACK: If user was created but process failed, delete the user
        if (createdUserId) {
            console.log("Rolling back user creation:", createdUserId);
            await supabaseAdmin.auth.admin.deleteUser(createdUserId);
        }

        // Translate specific errors
        if (e.message?.includes("already been registered")) {
            return { error: "Bu e-posta adresi zaten kayıtlı. Lütfen farklı bir adres deneyin." };
        }

        return { error: e.message };
    }
}
