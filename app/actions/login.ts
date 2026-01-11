"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export async function signInAction(prevState: any, formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
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
