import { createClient } from "@/lib/supabase/server";
import { HelpClient } from "./help-client";

export const dynamic = "force-dynamic";

export default async function HelpPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return <div>Giriş yapmanız gerekiyor</div>;

    const { data: member } = await supabase
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

    if (!member?.tenant_id) {
        return <div className="p-12 text-center text-red-500">İşletme bilginiz alınamadı, lütfen sayfayı yenileyin.</div>;
    }

    return <HelpClient tenantId={member.tenant_id} userId={user.id} />;
}
