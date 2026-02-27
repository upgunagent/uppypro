import { createClient } from "@/lib/supabase/server";
import { CalendarView } from "@/components/calendar/calendar-view";

export default async function CalendarPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return <div>Giriş yapmanız gerekiyor</div>;

    // Get Tenant
    const { data: member } = await supabase
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", user.id)
        .single();

    if (!member) return <div>Organizasyon bulunamadı</div>;

    // Get Profile for Email Notifications (Business Info)
    const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("user_id", user.id)
        .single();

    const { data: billingInfo } = await supabase
        .from("billing_info")
        .select("company_name, contact_phone")
        .eq("tenant_id", member.tenant_id)
        .single();

    const businessProfile = {
        full_name: profile?.full_name,
        avatar_url: profile?.avatar_url,
        company_name: billingInfo?.company_name,
        phone: billingInfo?.contact_phone
    };



    // Fetch Events Initial Data (Optional - usually client side fetch is better for range changes)
    // But we can pass some initial data or just let the client component fetch.
    // For simplicity with big-calendar, client-side fetching based on view range is common.

    // Fetch Employees for this tenant
    const { data: employees } = await supabase
        .from("tenant_employees")
        .select("*")
        .eq("tenant_id", member.tenant_id)
        .order("name", { ascending: true });

    return (
        <div className="h-[calc(100vh-4rem)] p-6 bg-slate-50 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Takvim</h1>
                    <p className="text-slate-500">Randevu ve etkinliklerinizi yönetin.</p>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-4 overflow-hidden">
                <CalendarView
                    tenantId={member.tenant_id}
                    userId={user.id}
                    profile={businessProfile}
                    initialEmployees={employees || []}
                />
            </div>
        </div>
    );
}
