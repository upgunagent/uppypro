import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MessageSquare, Settings, CreditCard } from "lucide-react";

export default async function TenantDetail({ params }: { params: { tenantId: string } }) {
    const supabase = await createClient();
    const { data: tenant } = await supabase.from("tenants").select("*").eq("id", params.tenantId).single();

    if (!tenant) return <div>İşletme bulunamadı</div>;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">{tenant.name}</h1>
                <p className="text-gray-400">Genel Bakış</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link href={`/admin/tenants/${params.tenantId}/ai`}>
                    <div className="p-6 glass rounded-xl border border-white/10 hover:border-primary/50 transition-colors group cursor-pointer">
                        <Settings className="w-8 h-8 text-primary mb-4 group-hover:scale-110 transition-transform" />
                        <h3 className="text-xl font-bold">AI Konfigürasyonu</h3>
                        <p className="text-sm text-gray-400 mt-2">n8n webhook URL ve AI aktiflik durumunu yönetin.</p>
                    </div>
                </Link>

                <Link href={`/admin/tenants/${params.tenantId}/billing`}>
                    <div className="p-6 glass rounded-xl border border-white/10 hover:border-primary/50 transition-colors group cursor-pointer">
                        <CreditCard className="w-8 h-8 text-secondary mb-4 group-hover:scale-110 transition-transform" />
                        <h3 className="text-xl font-bold">Abonelik & Fatura</h3>
                        <p className="text-sm text-gray-400 mt-2">Paket detayı, ödeme geçmişi ve faturalar.</p>
                    </div>
                </Link>

                <Link href={`/panel/inbox?tenantId=${params.tenantId}`}>
                    <div className="p-6 glass rounded-xl border border-white/10 hover:border-primary/50 transition-colors group cursor-pointer">
                        <MessageSquare className="w-8 h-8 text-green-400 mb-4 group-hover:scale-110 transition-transform" />
                        <h3 className="text-xl font-bold">Inbox Görüntüle</h3>
                        <p className="text-sm text-gray-400 mt-2">Müşterinin inbox ekranını (admin olarak) görüntüleyin.</p>
                    </div>
                </Link>
            </div>
        </div>
    );
}
