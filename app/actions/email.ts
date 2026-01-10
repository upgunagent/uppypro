"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { resend, EMAIL_FROM } from "@/lib/resend";

export async function sendPasswordResetEmail(email: string) {
    const supabaseAdmin = createAdminClient();

    try {
        // Generate Recovery Link
        const { data, error } = await supabaseAdmin.auth.admin.generateLink({
            type: "recovery",
            email: email,
            options: {
                redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/update-password`
            }
        });

        if (error) {
            console.error("Link generation error:", error);
            return { error: "Link oluşturulamadı." };
        }

        const { user, properties } = data;
        const resetLink = properties.action_link;

        // Send Email via Resend
        const { error: emailError } = await resend.emails.send({
            from: EMAIL_FROM,
            to: email,
            subject: 'UppyPro Şifre Sıfırlama',
            html: `
                <h1>Şifrenizi Sıfırlayın</h1>
                <p>Hesabınız için şifre sıfırlama talebinde bulundunuz.</p>
                <p>Aşağıdaki bağlantıya tıklayarak şifrenizi yenileyebilirsiniz:</p>
                <a href="${resetLink}" style="display:inline-block;padding:10px 20px;background:#ea580c;color:white;text-decoration:none;border-radius:5px;">Şifremi Sıfırla</a>
                <p>Eğer bu talebi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
            `
        });

        if (emailError) {
            console.error("Resend error:", emailError);
            return { error: "E-posta gönderilemedi." };
        }

        return { success: true };

    } catch (err: any) {
        console.error("Reset Password Action Error:", err);
        return { error: err.message };
    }
}
