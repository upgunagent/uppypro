import { createAdminClient } from "@/lib/supabase/admin";
import { TicketsClient } from "./tickets-client";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminTicketsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return redirect("/login");

    const adminClient = createAdminClient();
    const { data: member } = await adminClient
        .from("tenant_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "agency_admin")
        .maybeSingle();

    if (!member) {
        return redirect("/panel/inbox");
    }

    return <TicketsClient userId={user.id} />;
}
