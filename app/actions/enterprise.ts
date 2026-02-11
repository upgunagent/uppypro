"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { resend, EMAIL_FROM } from "@/lib/resend";
import { revalidatePath } from "next/cache";

export type EnterpriseInviteData = {
    billingType: 'corporate' | 'individual';
    companyName: string;
    fullName: string; // If individual, this is the person's name. If corporate, this is the contact person's name.
    contactName: string;
    email: string;
    phone: string;
    taxOffice?: string;
    taxNumber?: string;
    tckn?: string;
    address: string;
    city: string;
    district: string;
    monthlyPrice: number; // In USD
};

export async function createEnterpriseInvite(data: EnterpriseInviteData) {
    const supabaseAdmin = createAdminClient();

    try {
        console.log("Creating Enterprise Invite:", data);

        // 1. Create User
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
            email: data.email,
            email_confirm: true,
            user_metadata: { full_name: data.contactName, phone: data.phone }
        });

        if (userError) throw new Error(`Kullanıcı oluşturulamadı: ${userError.message}`);
        const userId = userData.user.id;

        // 2. Create Tenant
        // Use company name if corporate, else full name
        const tenantName = data.billingType === 'corporate' ? data.companyName : data.fullName;

        const { data: tenant, error: tenantError } = await supabaseAdmin
            .from("tenants")
            .insert({
                name: tenantName
            })
            .select()
            .single();

        if (tenantError) throw new Error(`Şirket oluşturulamadı: ${tenantError.message}`);

        // 3. Create Profile
        await supabaseAdmin.from("profiles").upsert({
            user_id: userId,
            full_name: data.contactName, // Profile name is contact person
            phone: data.phone
        });

        // 4. Create Member
        await supabaseAdmin.from("tenant_members").insert({
            tenant_id: tenant.id,
            user_id: userId,
            role: 'tenant_owner'
        });

        // 5. Save Billing Info (Correct Table: billing_info)
        if (data.billingType === 'corporate') {
            const { error: billingError } = await supabaseAdmin.from("billing_info").upsert({
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

            if (billingError) console.error("Billing Info Error:", billingError);
        } else {
            // Individual billing
            const { error: billingError } = await supabaseAdmin.from("billing_info").upsert({
                tenant_id: tenant.id,
                billing_type: 'individual',
                full_name: data.fullName,
                tckn: data.tckn,
                address_full: data.address,
                address_city: data.city,
                address_district: data.district,
                contact_email: data.email,
                contact_phone: data.phone
            }, { onConflict: 'tenant_id' });

            if (billingError) console.error("Billing Info Error:", billingError);
        }

        // 6. Create Subscription (Pending -> Custom Price USD)
        await supabaseAdmin.from("subscriptions").insert({
            tenant_id: tenant.id,
            status: 'pending', // Waiting for payment
            base_product_key: 'uppypro_inbox',
            ai_product_key: 'uppypro_enterprise',
            billing_cycle: 'monthly',
            custom_price_usd: data.monthlyPrice
        });

        // 7. Generate Invite Token (Custom, not Supabase magic link)
        const token = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        await supabaseAdmin.from("enterprise_invite_tokens").insert({
            token,
            tenant_id: tenant.id,
            email: data.email,
            expires_at: expiresAt.toISOString()
        });

        // 8. Send Email with invite link
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://uppypro.vercel.app";
        const inviteLink = `${baseUrl}/enterprise-invite?token=${token}`;

        await resend.emails.send({
            from: EMAIL_FROM,
            to: data.email,
            subject: 'UppyPro Kurumsal Davet',
            html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:30px;background:#fff;border-radius:8px">
<h2 style="color:#1e293b;margin:0 0 20px">Kurumsal Üyeliğiniz Hazır</h2>
<p style="color:#64748b;margin:0 0 20px">Sayın <b>${data.contactName}</b>, <b>${data.billingType === 'corporate' ? data.companyName : data.fullName}</b> için abonelik tanımlandı.</p>
<p style="color:#64748b;margin:0 0 20px"><b>Paket:</b> UppyPro Kurumsal<br><b>Aylık:</b> $${data.monthlyPrice.toLocaleString('en-US')}</p>
<a href="${inviteLink}" style="display:inline-block;background:#ea580c;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Aboneliği Başlat</a>
</div></body></html>`
        });

        return { success: true };

    } catch (error: any) {
        console.error("Enterprise Invite Error:", error);
        return { error: error.message };
    }
}

export async function activateSubscription(tenantId: string, cardData: { cardHolder: string, cardNumber: string, inviteToken?: string, amount?: number }) {
    const admin = createAdminClient();

    // ... (existing payment method record logic)
    // 1. Save Payment Method (Mock)
    const lastFour = cardData.cardNumber.slice(-4);
    const { error: pmError } = await admin.from("payment_methods").insert({
        tenant_id: tenantId,
        provider: 'iyzico',
        card_alias: `card_mock_${Date.now()}`,
        last_four: lastFour,
        card_family: 'Visa', // Mock
        card_association: 'Credit Card', // Mock
        is_default: true
    });

    if (pmError) {
        console.error("Payment Method Save Error:", pmError);
        return { error: "Ödeme yöntemi kaydedilemedi." };
    }

    // 0. Record Payment (The Collection Logic)
    if (cardData.amount) {
        await admin.from("payments").insert({
            tenant_id: tenantId,
            amount: Math.round(cardData.amount * 100), // Save as cents (TRY)
            amount_try: Math.round(cardData.amount * 100), // Legacy/Backup
            currency: 'TRY',
            status: 'success',
            type: 'subscription_activation',
            provider_payment_id: `mock_pay_${Date.now()}`
        });
    }

    // 2. Activate Subscription
    const now = new Date();
    // ...
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const { error } = await admin.from("subscriptions").update({
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: nextMonth.toISOString()
    }).eq('tenant_id', tenantId);

    if (error) return { error: error.message };

    // 3. Mark invite token as used (if provided)
    if (cardData.inviteToken) {
        await admin.from("enterprise_invite_tokens").update({
            used_at: new Date().toISOString()
        }).eq('token', cardData.inviteToken);
    }

    // 4. Generate Auto-Login Link (Recovery Link) for Password Setup
    // First, find the owner of this tenant
    const { data: member } = await admin
        .from("tenant_members")
        .select("user_id")
        .eq("tenant_id", tenantId)
        .eq("role", "owner")
        .single();

    if (member) {
        // Generate a recovery link that redirects to /update-password
        // This effectively logs the user in so they can set their password
        const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
            type: "recovery",
            email: await getUserEmail(admin, member.user_id),
            options: {
                redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/update-password`
            }
        });

        if (linkData && !linkError) {
            return { success: true, redirectUrl: linkData.properties.action_link };
        }
    }

    return { success: true, redirectUrl: "/login" };
}

// Helper to get email properly
async function getUserEmail(admin: any, userId: string) {
    const { data: user } = await admin.auth.admin.getUserById(userId);
    return user?.user?.email;
}

export async function setPasswordEnterprise(inviteToken: string, password: string) {
    const admin = createAdminClient();

    // 1. Validate Token (again, to be safe)
    const { data: invite } = await admin
        .from("enterprise_invite_tokens")
        .select("*")
        .eq("token", inviteToken)
        .single();

    if (!invite) return { error: "Geçersiz veya süresi dolmuş token." };

    // 2. Find the user
    // We fetch any member of this tenant (since it's a new enterprise, there's only one user)
    const { data: member } = await admin
        .from("tenant_members")
        .select("user_id")
        .eq("tenant_id", invite.tenant_id)
        .limit(1)
        .single();

    if (!member) return { error: "Kullanıcı (Tenant Member) bulunamadı." };

    // 3. Update Password
    const { error: updateError } = await admin.auth.admin.updateUserById(
        member.user_id,
        { password: password }
    );

    if (updateError) return { error: updateError.message };

    // 4. Ideally, verify email if not verified
    await admin.auth.admin.updateUserById(member.user_id, { email_confirm: true });

    return { success: true };
}
