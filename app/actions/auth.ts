"use server";

import { createAdminClient } from "@/lib/supabase/admin";

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

        return { success: true };

    } catch (error: any) {
        console.error("Signup Action Error:", error);
        return { success: false, error: error.message };
    }
}
