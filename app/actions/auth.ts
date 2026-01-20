"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { resend, EMAIL_FROM } from "@/lib/resend";

type SignupData = {
    email: string;
    password: string;
    fullName: string;
    companyName: string;
    phone: string;
    planIdx: { tier: string; cycle: string };
};

export async function signupAction(data: SignupData) {
    const supabaseAdmin = createAdminClient();

    try {
        // 1. Create User (Confirm Email Automatically)
        // This bypasses the need for SMTP and email verification
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
            email: data.email,
            password: data.password,
            email_confirm: true, // Auto confirm
            user_metadata: { full_name: data.fullName, phone: data.phone }
        });

        if (userError) throw new Error(`Kullanıcı oluşturulurken hata: ${userError.message}`);
        if (!userData.user) throw new Error("Kullanıcı oluşturulamadı (Bilinmeyen hata)");

        const userId = userData.user.id;

        // 2. Create Tenant
        const { data: tenant, error: tenantError } = await supabaseAdmin
            .from("tenants")
            .insert({ name: data.companyName })
            .select()
            .single();

        if (tenantError) throw new Error(`İşletme oluşturulurken hata: ${tenantError.message}`);

        // 3. Ensure Profile Exists & Update
        // Data trigger on auth.users usually creates profile, but we upsert to be sure and update metadata
        const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .upsert({ user_id: userId, full_name: data.fullName });

        if (profileError) console.error("Profile upsert warning:", profileError);

        // 4. Link User to Tenant (Owner)
        const { error: memberError } = await supabaseAdmin
            .from("tenant_members")
            .insert({
                tenant_id: tenant.id,
                user_id: userId,
                role: 'tenant_owner'
            });

        if (memberError) throw new Error(`Üyelik bağlantısı hatası: ${memberError.message}`);

        // 5. Create Subscription (Pending)
        const baseProductKey = 'base_inbox';
        // tier comes as "starter", "medium" etc. We mapped it in DBseed as "ai_starter"
        const aiProductKey = data.planIdx.tier === 'none' ? null : `ai_${data.planIdx.tier}`;

        const { error: subError } = await supabaseAdmin
            .from("subscriptions")
            .insert({
                tenant_id: tenant.id,
                status: 'pending',
                base_product_key: baseProductKey,
                ai_product_key: aiProductKey,
                billing_cycle: data.planIdx.cycle
            });

        if (subError) throw new Error(`Abonelik oluşturma hatası: ${subError.message}`);

        // 6. Send Welcome Email
        try {
            await resend.emails.send({
                from: EMAIL_FROM,
                to: data.email,
                subject: 'UppyPro\'ya Hoş Geldiniz! 🚀',
                html: `
                    <h1>Merhaba ${data.fullName},</h1>
                    <p>UppyPro'ya hoş geldiniz! Hesabınız başarıyla oluşturuldu.</p>
                    <p>Şirketiniz: <strong>${data.companyName}</strong></p>
                    <p>Panelinize giriş yaparak hemen başlayabilirsiniz.</p>
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" style="display:inline-block;padding:10px 20px;background:#ea580c;color:white;text-decoration:none;border-radius:5px;">Panele Git</a>
                `
            });
        } catch (mailErr) {
            console.error("Welcome email failed:", mailErr);
            // Don't fail the whole signup for email error
        }

        return { success: true };

    } catch (error: any) {
        console.error("Signup Action Error:", error);
        return { success: false, error: error.message };
    }
}

export async function updateUserPassword(password: string) {
    const supabaseAdmin = createAdminClient();
    const supabase = await createAdminClient(); // We need auth context, but admin client is easier for update without old password if using admin.updateUserById.
    // Actually, to respect session, we should use createClient() but for password update usually it requires re-auth.
    // Let's use supabaseAdmin.auth.admin.updateUserById which bypasses "old password" check, 
    // BUT we must ensure the user is who they say they are.
    // The previous pattern uses createClient() in the component to get the user, then calls this action.

    // Better Approach: Use createClient() (Standard Client) to get the session user ID, 
    // then use Admin Client to forcefully update the password.
    // This avoids "Old Password" requirement if Supabase enforces it on standard client.

    const { createClient } = await import("@/lib/supabase/server");
    const supabaseServer = await createClient();

    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();

    if (authError || !user) {
        return { error: "Oturum süresi dolmuş veya geçersiz. Lütfen tekrar giriş yapın." };
    }

    try {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(
            user.id,
            { password: password }
        );

        if (error) throw error;

        return { success: true };
    } catch (e: any) {
        console.error("Password Update Error:", e);
        return { error: e.message || "Şifre güncellenemedi." };
    }
}
