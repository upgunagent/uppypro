import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge"; // I need to create Badge or use simple spans
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"; // Need to create Table or use manual HTML

export default async function BillingPage({ params }: { params: { tenantId: string } }) {
    const supabase = await createClient();

    const { data: subscription } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("tenant_id", params.tenantId)
        .single();

    const { data: payments } = await supabase
        .from("payments")
        .select("*")
        .eq("tenant_id", params.tenantId)
        .order("created_at", { ascending: false });

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Abonelik ve Fatura</h1>
                <p className="text-gray-400">Ödeme geçmişi ve mevcut plan durumu.</p>
            </div>

            {/* Subscription Status Card */}
            <div className="p-6 glass rounded-xl border border-white/10">
                <h2 className="text-xl font-bold mb-4">Mevcut Plan</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-sm text-gray-400">Ana Paket</div>
                        <div className="font-medium text-lg capitalize">{subscription?.base_product_key?.replace('_', ' ')}</div>
                    </div>
                    <div>
                        <div className="text-sm text-gray-400">AI Paketi</div>
                        <div className="font-medium text-lg capitalize">{subscription?.ai_product_key?.replace('_', ' ') || "Yok"}</div>
                    </div>
                    <div>
                        <div className="text-sm text-gray-400">Durum</div>
                        <div className="font-medium text-lg capitalize text-primary">{subscription?.status}</div>
                    </div>
                    <div>
                        <div className="text-sm text-gray-400">Fatura Dönemi</div>
                        <div className="font-medium text-lg capitalize">{subscription?.billing_cycle === 'annual' ? 'Yıllık' : 'Aylık'}</div>
                    </div>
                </div>
            </div>

            {/* Payment History */}
            <div className="p-6 glass rounded-xl border border-white/10">
                <h2 className="text-xl font-bold mb-4">Ödeme Geçmişi</h2>
                <div className="relative w-full overflow-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-gray-400 border-b border-white/10">
                            <tr>
                                <th className="py-3">Tarih</th>
                                <th className="py-3">Tutar</th>
                                <th className="py-3">Tip</th>
                                <th className="py-3">Durum</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {payments?.map((payment) => (
                                <tr key={payment.id} className="hover:bg-white/5">
                                    <td className="py-3">
                                        {new Date(payment.created_at).toLocaleDateString("tr-TR")}
                                    </td>
                                    <td className="py-3">{(payment.amount_try / 100).toFixed(2)} TL</td>
                                    <td className="py-3 capitalize">{payment.type?.replace('_', ' ')}</td>
                                    <td className="py-3">
                                        <span className={payment.status === 'success' ? 'text-green-400' : 'text-red-400'}>
                                            {payment.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {payments?.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="py-4 text-center text-gray-500">Ödeme kaydı yok.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
