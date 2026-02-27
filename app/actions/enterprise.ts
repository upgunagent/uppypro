"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { resend, EMAIL_FROM } from "@/lib/resend";
import { revalidatePath } from "next/cache";

export type EnterpriseInviteData = {
    billingType: 'corporate' | 'individual';
    companyName: string;
    fullName: string;
    contactName: string;
    email: string;
    phone: string;
    taxOffice?: string;
    taxNumber?: string;
    tckn?: string;
    address: string;
    city: string;
    district: string;
    planKey: string; // New field replacing monthlyPrice
};

export async function createEnterpriseInvite(data: EnterpriseInviteData) {
    const supabaseAdmin = createAdminClient();

    try {
        console.log("Creating Enterprise Invite:", data);

        const isFreePlan = data.planKey === 'uppypro_corporate_free';
        let priceTl = 0;
        let totalWithKdv = 0;
        let productName = "UppyPro Kurumsal Ücretsiz";

        if (!isFreePlan) {
            // Fetch Price for selected plan
            const { data: pricingData, error: priceError } = await supabaseAdmin
                .from('pricing')
                .select('monthly_price_try, iyzico_pricing_plan_reference_code, products(name)')
                .eq('product_key', data.planKey)
                .eq('billing_cycle', 'monthly')
                .single();

            if (priceError || !pricingData) {
                throw new Error("Seçilen planın fiyat bilgisi bulunamadı.");
            }

            priceTl = pricingData.monthly_price_try;
            totalWithKdv = priceTl * 1.2;
            productName = (pricingData.products as any)?.name || `UppyPro Kurumsal (${data.planKey.replace('uppypro_corporate_', '').toUpperCase()})`;
        }

        // 1. Create User
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
            email: data.email,
            email_confirm: true,
            user_metadata: { full_name: data.contactName, phone: data.phone }
        });

        if (userError) throw new Error(`Kullanıcı oluşturulamadı: ${userError.message}`);
        const userId = userData.user.id;

        // 2. Create Tenant
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
            full_name: data.contactName,
            phone: data.phone
        });

        // 4. Create Member
        await supabaseAdmin.from("tenant_members").insert({
            tenant_id: tenant.id,
            user_id: userId,
            role: 'tenant_owner'
        });

        // 5. Save Billing Info
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
                tckn: data.tckn,
                address_full: data.address,
                address_city: data.city,
                address_district: data.district,
                contact_email: data.email,
                contact_phone: data.phone
            }, { onConflict: 'tenant_id' });
        }

        // 6. Create Subscription
        // We assume 'uppypro_inbox' is base, and 'planKey' is the AI/Tier level (e.g. corporate_medium)
        // Or if corporate plan includes base, we set both? 
        // Our system likely uses AI key for pricing tier.

        await supabaseAdmin.from("subscriptions").insert({
            tenant_id: tenant.id,
            status: isFreePlan ? 'active' : 'pending',
            base_product_key: 'uppypro_inbox',
            ai_product_key: data.planKey, // Use the selected plan key
            billing_cycle: 'monthly',
            custom_price_usd: null, // Clear USD
            // Start the period immediately if it's a free plan
            ...(isFreePlan ? {
                current_period_start: new Date().toISOString(),
                current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            } : {})
        });

        // 7. Generate Link
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://uppypro.vercel.app";
        let inviteLink = "";

        if (isFreePlan) {
            // Free plan users don't need checkout. Directly send a password setup link.
            const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
                type: "recovery",
                email: data.email,
                options: {
                    redirectTo: `${baseUrl}/update-password`
                }
            });

            if (linkError || !linkData) {
                throw new Error(`Şifre belirleme linki oluşturulamadı: ${linkError?.message}`);
            }
            inviteLink = linkData.properties.action_link;
        } else {
            // Generate Invite Token for Paid Checkout
            const token = crypto.randomUUID();
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            await supabaseAdmin.from("enterprise_invite_tokens").insert({
                token,
                tenant_id: tenant.id,
                user_id: userId,
                email: data.email,
                expires_at: expiresAt.toISOString()
            });

            inviteLink = `${baseUrl}/enterprise-invite?token=${token}`;
        }

        const logoUrl = `${baseUrl}/brand-logo-text.png`;
        const entityName = data.billingType === 'corporate' ? data.companyName : data.fullName;

        const formattedPrice = isFreePlan ? "Ücretsiz" : priceTl.toLocaleString('tr-TR', { minimumFractionDigits: 0 }) + " TL + KDV";
        const formattedTotal = isFreePlan ? "0" : totalWithKdv.toLocaleString('tr-TR', { minimumFractionDigits: 2 });
        const ctaText = isFreePlan ? "Hesabı Aktifleştir →" : "Aboneliği Başlat →";
        const emailMessage = isFreePlan
            ? `<strong>${entityName}</strong> için UppyPro kurumsal aboneliğiniz tanımlanmıştır. Aşağıdaki butona tıklayarak hemen şifrenizi belirleyip giriş yapabilirsiniz.`
            : `<strong>${entityName}</strong> için UppyPro kurumsal aboneliğiniz tanımlanmıştır. Aşağıdaki butona tıklayarak aboneliğinizi başlatabilirsiniz.`;
        const infoMessage = isFreePlan
            ? "ℹ️ Hesabınızı kullanmaya başlamak için butonla şifrenizi belirlemeniz yeterlidir. Kredi kartı gerekmez."
            : "ℹ️ Aboneliğinizi başlatmak için aşağıdaki butona tıklayın. Sözleşme onayı ve ödeme adımlarını tamamladıktan sonra hesabınız aktif olacaktır.";

        await resend.emails.send({
            from: EMAIL_FROM,
            to: data.email,
            subject: 'UppyPro Kurumsal Davet',
            html: `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kurumsal Üyeliğiniz Hazır</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #334155; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; }
        .header { background-color: #ffffff; padding: 40px 20px 20px 20px; text-align: center; border-bottom: 1px solid #f1f5f9; }
        .logo { max-height: 50px; margin-bottom: 20px; }
        .header h1 { color: #0f172a; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
        .content { padding: 40px 30px; }
        .greeting { font-size: 16px; color: #334155; margin-bottom: 24px; }
        .details-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
        .details-title { font-weight: 600; color: #0f172a; margin-bottom: 16px; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; }
        .detail-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
        .detail-label { color: #64748b; }
        .detail-value { font-weight: 600; color: #0f172a; }
        .message { font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
        .footer { background-color: #f8fafc; padding: 30px; text-align: center; font-size: 13px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
        .info-box { background-color: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; padding: 16px; border-radius: 8px; font-size: 14px; margin-bottom: 24px; line-height: 1.5; }
        .cta-button { display: inline-block; background-color: #ea580c; color: #ffffff !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; border: 1px solid #ea580c; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="${logoUrl}" alt="UPGUN AI" class="logo">
            <h1>Kurumsal Üyeliğiniz Hazır 🎉</h1>
        </div>
        <div class="content">
            <p class="greeting">Sayın <strong>${data.contactName}</strong>,</p>
            <p class="message">${emailMessage}</p>

            <div class="details-card">
                <div class="details-title">Abonelik Bilgileri</div>
                <div class="detail-row">
                    <span class="detail-label">Paket:</span>
                    <span class="detail-value">${productName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Aylık Ücret:</span>
                    <span class="detail-value">${formattedPrice}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Toplam (KDV Dahil):</span>
                    <span class="detail-value">${formattedTotal} ${isFreePlan ? 'TL' : 'TL / Ay'}</span>
                </div>
            </div>

            <div class="info-box">
                ${infoMessage}
            </div>

            <div style="text-align: center; margin: 32px 0;">
                <a href="${inviteLink}" style="display: inline-block; background-color: #ea580c; color: #ffffff !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; border: 1px solid #ea580c;">${ctaText}</a>
            </div>

            <p class="message" style="margin-top: 40px;">
                Herhangi bir sorunuz olursa bizimle iletişime geçmekten çekinmeyin.
                <br><br>
                Saygılarımızla,<br>
                <strong>UPGUN AI Ekibi</strong><br>
                <a href="mailto:info@upgunai.com" style="color: #64748b; text-decoration: none; font-size: 14px;">info@upgunai.com</a>
            </p>
        </div>
        <div class="footer">
            <p style="margin-bottom: 10px;">© ${new Date().getFullYear()} UPGUN AI. Tüm hakları saklıdır.</p>
            <p>UPGUN AI - Office İstanbul, Nisbetiye Mh. Gazi Güçnar Sk. No: 4, Zincirlikuyu, Beşiktaş, İstanbul</p>
        </div>
    </div>
</body>
</html>`
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
    // 3. Mark invite token as used (if provided) - REMOVED
    // Token should only be used when password is set
    /*
    if (cardData.inviteToken) {
        await admin.from("enterprise_invite_tokens").update({
            used_at: new Date().toISOString()
        }).eq('token', cardData.inviteToken);
    }
    */

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
