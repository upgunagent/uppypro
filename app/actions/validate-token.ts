"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function validateToken(token: string) {
    const supabase = createAdminClient();

    try {
        // Fetch token from database
        const { data: tokenData, error: tokenError } = await supabase
            .from('invite_tokens')
            .select('*')
            .eq('token', token)
            .maybeSingle();

        if (tokenError || !tokenData) {
            return { valid: false, error: 'Token bulunamadı.' };
        }

        // Check if already used
        if (tokenData.used_at) {
            return { valid: false, error: 'Bu davet linki zaten kullanılmış.' };
        }

        // Check if expired
        const now = new Date();
        const expiresAt = new Date(tokenData.expires_at);
        if (now > expiresAt) {
            return { valid: false, error: 'Bu davet linkinin süresi dolmuş.' };
        }

        // Fetch user info
        const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(tokenData.user_id);

        if (userError || !user) {
            return { valid: false, error: 'Kullanıcı bulunamadı.' };
        }

        return {
            valid: true,
            userId: user.id,
            email: user.email
        };

    } catch (error: any) {
        console.error('Token validation error:', error);
        return { valid: false, error: 'Doğrulama hatası oluştu.' };
    }
}
