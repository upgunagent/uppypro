import { createClient } from "@/lib/supabase/server";
import { CalendarView } from "@/components/calendar/calendar-view";
import { NoEmployeesWarning } from "@/components/calendar/no-employees-warning";

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

    const [{ data: billingInfo }, { data: tenant }] = await Promise.all([
        supabase
            .from("billing_info")
            .select("company_name, contact_phone")
            .eq("tenant_id", member.tenant_id)
            .single(),
        supabase
            .from("tenants")
            .select("resource_type_preference")
            .eq("id", member.tenant_id)
            .single(),
    ]);

    // Fetch Employees for this tenant
    const { data: employees } = await supabase
        .from("tenant_employees")
        .select("*")
        .eq("tenant_id", member.tenant_id)
        .order("name", { ascending: true });

    // Akıllı kaynak tipi tespiti:
    // Eğer DB'deki preference "employee" ama kaynaklar farklı tipteyse, gerçek tipi kullan
    let resourceType = tenant?.resource_type_preference || "employee";
    if (employees && employees.length > 0) {
        const types = [...new Set(employees.map((e: any) => e.resource_type || "employee"))];
        if (types.length === 1 && types[0] !== resourceType) {
            resourceType = types[0];
        }
    }

    const businessProfile = {
        full_name: profile?.full_name,
        avatar_url: profile?.avatar_url,
        company_name: billingInfo?.company_name,
        phone: billingInfo?.contact_phone
    };


    const hasEmployees = (employees && employees.length > 0);

    return (
        <div className="h-[calc(100vh/var(--zoom-factor)-4rem)] p-6 bg-slate-50 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Takvim</h1>
                        <p className="text-slate-500">Randevu ve etkinliklerinizi yönetin.</p>
                    </div>
                    {hasEmployees && (
                        <a
                            href="/panel/settings?tab=employees"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium transition-colors shadow-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                            Kaynaklarınızı Yönetin
                        </a>
                    )}
                </div>
            </div>

            {!hasEmployees && <NoEmployeesWarning />}

            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-4 overflow-y-auto overflow-x-hidden">
                <CalendarView
                    tenantId={member.tenant_id}
                    userId={user.id}
                    profile={businessProfile}
                    initialEmployees={employees || []}
                    resourceType={resourceType}
                />
            </div>
        </div>
    );
}
