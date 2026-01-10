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

        // 6. Generate Magic/Recovery Link
        // Redirect to /complete-payment page
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: "recovery",
            email: data.email,
            options: {
                redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/complete-payment`
            }
        });

        if (linkError) throw new Error(`Link oluşturulamadı: ${linkError.message}`);

        const actionLink = linkData.properties.action_link;

        // 7. Send Email
        const logoUrl = `${process.env.NEXT_PUBLIC_APP_URL}/brand-logo-text.png`;

        await resend.emails.send({
            from: EMAIL_FROM,
            to: data.email,
            subject: 'UppyPro Kurumsal Abonelik Daveti',
            html: `
                <div style="display: none; font-size: 1px; color: #fefefe; line-height: 1px; font-family: sans-serif; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
                    Kurumsal üyeliğiniz oluşturuldu, aboneliği başlatmak için ödeme işlemini tamamlayın.
                </div>
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; border: 1px solid #e2e8f0; border-radius: 12px;">
                    <img src="${logoUrl}" alt="UPGUN AI" style="height: 32px; margin-bottom: 24px;" />
                    
                    <h2 style="color: #1e293b; margin-bottom: 16px;">Kurumsal Üyeliğiniz Hazırlandı</h2>
                    <p style="color: #64748b; margin-bottom: 24px;">
                        Sayın <strong>${data.fullName}</strong>, <strong>${data.companyName}</strong> için UppyPro Kurumsal abonelik tanımlaması yapılmıştır.
                    </p>

                    <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 24px; text-align: left;">
                        <p style="margin: 4px 0; font-size: 14px; color: #64748b;">Paket: <strong style="color: #0f172a;">UppyPro Kurumsal</strong></p>
                        <p style="margin: 4px 0; font-size: 14px; color: #64748b;">Aylık Ücret: <strong style="color: #0f172a;">${data.monthlyPrice.toLocaleString('tr-TR')} TL</strong></p>
                    </div>

                    <p style="color: #64748b; margin-bottom: 24px;">
                        Aboneliğinizi başlatmak için aşağıdaki butona tıklayarak ödeme işlemini tamamlayınız.
                    </p>

                    <a href="${actionLink}" style="display: inline-block; background-color: #ea580c; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                        Aboneliği Oluştur
                    </a>
                </div>
            `
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
