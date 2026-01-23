
import { AppSidebar } from "@/components/app-sidebar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";

export default async function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        redirect("/login");
    }

    // Determine Role
    // For MVP: Check tenant_members. If user is in tenant_members with agency_admin, they are admin.
    // We need to fetch this.

    const { data: memberData } = await supabase
        .from("tenant_members")
        .select("role, tenant_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

    const role = memberData?.role || null;
    const tenantId = memberData?.tenant_id;

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <AppSidebar role={role} tenantId={tenantId} />
            <main className="flex-1 ml-0 md:ml-[88px] flex flex-col h-[100dvh] overflow-y-auto pb-16 md:pb-0 md:mb-0">
                {children}
            </main>
            <MobileBottomNav />
        </div>
    );
}
