"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export async function signInAction(prevState: any, formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const turnstileToken = formData.get("cf-turnstile-response") as string | null;

    // Turnstile doğrulama süreci
    if (turnstileToken) {
        const verifyEndpoint = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
        const secret = process.env.TURNSTILE_SECRET_KEY;

        if (!secret) {
            console.error("TURNSTILE_SECRET_KEY eksik!");
            return { error: "Güvenlik yapılandırma hatası." };
        }

        try {
            const res = await fetch(verifyEndpoint, {
                method: "POST",
                body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(turnstileToken)}`,
                headers: {
                    "content-type": "application/x-www-form-urlencoded"
                }
            });

            const data = await res.json();

            if (!data.success) {
                console.error("Turnstile verification failed:", data);
                return { error: "Güvenlik doğrulaması (CAPTCHA) başarısız oldu. Lütfen tekrar deneyin." };
            }
        } catch (err) {
            console.error("Turnstile fetch error:", err);
            return { error: "Güvenlik hizmetine ulaşılamadı. Lütfen daha sonra tekrar deneyin." };
        }
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return { error: "Kullanıcı adı veya şifre hatalı." };
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        // Check for agency_admin role
        const adminDb = createAdminClient();

        const { data: membership } = await adminDb
            .from("tenant_members")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "agency_admin")
            .maybeSingle();

        if (membership) {
            return redirect("/admin/tenants");
        }
    }

    return redirect("/panel/inbox");
}
