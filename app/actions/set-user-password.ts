"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function setUserPassword(token: string, password: string) {
    const supabase = createAdminClient();

    try {
        // Validate token first
        let { data: tokenData, error: tokenError } = await supabase
            .from('invite_tokens')
            .select('*')
            .eq('token', token)
            .maybeSingle();

        let tableName = 'invite_tokens';

        // If not found in standard tokens, check enterprise tokens
        if (!tokenData) {
            const { data: entToken, error: entError } = await supabase
                .from('enterprise_invite_tokens')
                .select('*')
                .eq('token', token)
                .maybeSingle();

            if (entToken && !entError) {
                tokenData = entToken;
                tableName = 'enterprise_invite_tokens';
            }
        }

        if (tokenError || !tokenData) {
            return { success: false, error: 'Geçersiz token.' };
        }

        if (tokenData.used_at) {
            return { success: false, error: 'Bu link zaten kullanılmış.' };
        }

        if (new Date() > new Date(tokenData.expires_at)) {
            return { success: false, error: 'Link süresi dolmuş.' };
        }

        // Set user password
        const { error: updateError } = await supabase.auth.admin.updateUserById(
            tokenData.user_id,
            { password }
        );

        if (updateError) {
            console.error('Password update error:', updateError);
            return { success: false, error: 'Şifre güncellenemedi.' };
        }

        // Mark token as used
        await supabase
            .from(tableName)
            .update({ used_at: new Date().toISOString() })
            .eq('token', token);

        // Get user email for sign-in
        const { data: { user } } = await supabase.auth.admin.getUserById(tokenData.user_id);

        if (!user?.email) {
            return { success: false, error: 'Kullanıcı bilgisi alınamadı.' };
        }

        return {
            success: true,
            email: user.email,
            password: password // Return for auto-login on client
        };

    } catch (error: any) {
        console.error('Set password error:', error);
        return { success: false, error: 'Bir hata oluştu.' };
    }
}
