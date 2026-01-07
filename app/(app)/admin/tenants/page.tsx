import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin"; // Use Admin Client for Super Admin View
import Link from "next/link";
import { Settings, ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";

export default async function TenantListPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    // 1. Verify Agency Admin Role
    // We check tenant_members for THIS user to see if they have 'agency_admin' role in ANY tenant? 
    // Or is there a specific 'admin' tenant? 
    // For this system, we assume if they have 'agency_admin' role in the record related to the user, they are super admin.
    // Let's check the first membership record for role.
    const { data: membership } = await supabase
        .from("tenant_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "agency_admin") // Strict check
        .maybeSingle();

    if (!membership) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-red-500 gap-4">
                <ShieldAlert size={48} />
                <h1 className="text-2xl font-bold">Yetkisiz Erişim</h1>
                <p className="text-gray-400">Bu sayfayı görüntülemek için "Süper Yönetici" yetkisine sahip olmalısınız.</p>
                <Link href="/panel/inbox">
                    <Button variant="outline">Panele Dön</Button>
                </Link>
            </div>
        );
    }

    // 2. Fetch ALL Tenants (Bypassing RLS with Admin Client)
    const adminDb = createAdminClient();
    const { data: tenants, error } = await adminDb
        .from("tenants")
        .select("*, subscriptions(*)");

    if (error) {
        return <div className="text-red-500">Hata: {error.message}</div>;
    }

    return (
        <div className="space-y-6 p-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">İşletmeler (Tenants)</h1>
                <Button>Yeni Ekle</Button>
            </div>

            <div className="grid gap-4">
                {tenants?.map((tenant) => {
                    const sub = tenant.subscriptions?.[0]; // Assuming 1 active sub for MVP logic
                    return (
                        <div key={tenant.id} className="p-4 border border-white/10 bg-white/5 rounded-xl flex justify-between items-center">
                            <div>
                                <h2 className="font-bold text-lg">{tenant.name}</h2>
                                <div className="text-sm text-gray-400">ID: {tenant.id}</div>
                                {sub && (
                                    <div className="flex gap-2 text-xs mt-2">
                                        <span className="px-2 py-0.5 rounded bg-primary/20 text-primary uppercase">{sub.base_product_key}</span>
                                        {sub.ai_product_key && <span className="px-2 py-0.5 rounded bg-secondary/20 text-secondary uppercase">{sub.ai_product_key}</span>}
                                        <span className="px-2 py-0.5 rounded bg-gray-700 text-gray-300 capitalize">{sub.status}</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Link href={`/admin/tenants/${tenant.id}`}>
                                    <Button variant="secondary" size="sm">Yönet</Button>
                                </Link>
                                <Link href={`/admin/tenants/${tenant.id}/ai`}>
                                    <Button variant="ghost" size="icon"><Settings size={18} /></Button>
                                </Link>
                            </div>
                        </div>
                    );
                })}
                {tenants?.length === 0 && (
                    <div className="p-12 text-center text-gray-500">
                        Kayıtlı işletme bulunamadı.
                    </div>
                )}
            </div>
        </div>
    );
}
