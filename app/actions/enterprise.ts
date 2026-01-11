"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { resend, EMAIL_FROM } from "@/lib/resend";
import { revalidatePath } from "next/cache";

export type EnterpriseInviteData = {
    companyName: string;
    fullName: string;
    email: string;
    phone: string;
    monthlyPrice: number; // In TL
};

export async function createEnterpriseInvite(data: EnterpriseInviteData) {
    const supabaseAdmin = createAdminClient();

    try {
        console.log("Creating Enterprise Invite:", data);

        // 1. Create User
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
            email: data.email,
            email_confirm: true,
            user_metadata: { full_name: data.fullName, phone: data.phone }
        });

        if (userError) throw new Error(`Kullanıcı oluşturulamadı: ${userError.message}`);
        const userId = userData.user.id;

        // 2. Create Tenant
        const { data: tenant, error: tenantError } = await supabaseAdmin
            .from("tenants")
            .insert({ name: data.companyName })
            .select()
            .single();

        if (tenantError) throw new Error(`Şirket oluşturulamadı: ${tenantError.message}`);

        // 3. Create Profile
        await supabaseAdmin.from("profiles").upsert({
            user_id: userId,
            full_name: data.fullName,
            phone: data.phone
        });

        // 4. Create Member
        await supabaseAdmin.from("tenant_members").insert({
            tenant_id: tenant.id,
            user_id: userId,
            role: 'tenant_owner'
        });

        // 5. Create Subscription (Pending -> Custom Price)
        // Storing price in Cent/Kurus (x100)
        await supabaseAdmin.from("subscriptions").insert({
            tenant_id: tenant.id,
            status: 'pending', // Waiting for payment
            base_product_key: 'uppypro_inbox',
            ai_product_key: 'uppypro_enterprise',
            billing_cycle: 'monthly',
            custom_price_try: data.monthlyPrice * 100
        });

        // 6. Generate Magic Link
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://uppypro.vercel.app";
        const redirectUrl = `${baseUrl}/auth/confirm`;

        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: "magiclink",
            email: data.email,
            options: {
                redirectTo: redirectUrl
            }
        });

        if (linkError) throw new Error(`Link oluşturulamadı: ${linkError.message}`);

        const actionLink = linkData.properties.action_link;

        // 7. Send Email - Ultra minimal to prevent Gmail clipping
        await resend.emails.send({
            from: EMAIL_FROM,
            to: data.email,
            subject: 'UppyPro Kurumsal Davet',
            html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:30px;background:#fff;border-radius:8px">
<h2 style="color:#1e293b;margin:0 0 20px">Kurumsal Üyeliğiniz Hazır</h2>
<p style="color:#64748b;margin:0 0 20px">Sayın <b>${data.fullName}</b>, <b>${data.companyName}</b> için abonelik tanımlandı.</p>
<p style="color:#64748b;margin:0 0 20px"><b>Paket:</b> UppyPro Kurumsal<br><b>Aylık:</b> ${data.monthlyPrice.toLocaleString('tr-TR')} TL</p>
<a href="${actionLink}" style="display:inline-block;background:#ea580c;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Aboneliği Başlat</a>
</div></body></html>`
        });

        return { success: true };

    } catch (error: any) {
        console.error("Enterprise Invite Error:", error);
        return { error: error.message };
    }
}

export async function activateSubscription(tenantId: string, cardData: { cardHolder: string, cardNumber: string }) {
    const admin = createAdminClient();

    // 1. Save Payment Method (Mock)
    const lastFour = cardData.cardNumber.slice(-4);

    // In a real scenario, we would call Iyzico/Stripe createCard here and get a token.
    // We simulate getting a token "card_mock_..."
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

    // 2. Activate Subscription
    const { error } = await admin.from("subscriptions").update({
        status: 'active'
    }).eq('tenant_id', tenantId);

    if (error) return { error: error.message };
    return { success: true };
}
