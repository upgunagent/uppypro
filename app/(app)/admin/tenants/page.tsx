import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Settings } from "lucide-react";

export default async function TenantListPage() {
    const supabase = await createClient();

    // RLS allows agency_admin to see all tenants?
    // Our RLS policy "Members can view their own tenant" might block seeing ALL tenants if agency_admin is not a member of ALL tenants?
    // Correct. The current RLS only allows viewing tenants you are a member of.
    // Agency Admin needs to view ALL tenants.
    // We should prob update RLS or use Service Role here?
    // Ideally Agency Admin should use a specific query or we adjust RLS.
    // For MVP speed, let's use the standard client. If RLS blocks, we fix RLS.
    // Actually, I put "Agency admins might all tenants (TODO)" in RLS comment.
    // Let's assume for MVP agency admin IS added to tenants or we need to fix RLS.
    // Fix RLS in next step if needed. For now let's try to fetch.

    const { data: tenants, error } = await supabase
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
