import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ManageSubscriptionForm } from "./manage-subscription-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function BillingPage({ params }: { params: Promise<{ tenantId: string }> }) {
    const { tenantId } = await params;
    const supabase = await createClient(); // Keep for auth check if needed, but mostly relying on page protection
    const adminDb = createAdminClient();

    const { data: tenant } = await adminDb.from("tenants").select("name").eq("id", tenantId).single();

    // Fetch latest subscription (bypass RLS)
    const { data: subscription } = await adminDb
        .from("subscriptions")
        .select("*")
        .eq("tenant_id", tenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    const { data: payments } = await adminDb
        .from("payments")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

    // Fetch Standard Pricing and Rate
    const { data: prices } = await adminDb
        .from("pricing")
        .select("*")
        .in("product_key", ["uppypro_inbox", "uppypro_ai"])
        .eq("billing_cycle", "monthly");

    // Import currency service
    const { getUsdExchangeRate } = await import("@/lib/currency");
    const usdRate = await getUsdExchangeRate();

    const inboxPriceUsd = prices?.find(p => p.product_key === "uppypro_inbox")?.monthly_price_usd || 19;
    const aiPriceUsd = prices?.find(p => p.product_key === "uppypro_ai")?.monthly_price_usd || 79;

    return (
        <div className="space-y-8 p-8 max-w-[1200px] mx-auto">
            <div>
                <Link href={`/admin/tenants/${tenantId}`} className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1 mb-4">
                    <ArrowLeft size={16} />
                    İşletme Detayına Dön
                </Link>
                <h1 className="text-3xl font-bold text-slate-900">Abonelik ve Fatura</h1>
                <p className="text-slate-500">{tenant?.name} için ödeme ve paket yönetimi.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Subscription Management */}
                <div className="space-y-6">
                    <ManageSubscriptionForm
                        tenantId={tenantId}
                        subscription={subscription}
                        inboxPrice={inboxPriceUsd}
                        aiPrice={aiPriceUsd}
                        usdRate={usdRate}
                    />
                </div>

                {/* Current Plan Details Read-only View */}
                <div className="space-y-6">
                    <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <h2 className="text-lg font-bold text-slate-900 mb-4">Plan Özeti</h2>
                        <div className="space-y-4">
                            <div className="flex justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-500">Ana Paket</span>
                                <span className="font-medium text-slate-900 capitalize">{subscription?.base_product_key?.replace('uppypro_', 'UppyPro ') || "-"}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-500">AI Paketi</span>
                                <span className="font-medium text-slate-900 capitalize">{subscription?.ai_product_key?.replace('uppypro_', 'UppyPro ') || "Yok"}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-500">Durum</span>
                                <Badge variant={subscription?.status === 'active' ? 'default' : 'secondary'} className={subscription?.status === 'active' ? 'bg-green-100 text-green-700' : ''}>
                                    {subscription?.status || "Pasif"}
                                </Badge>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-500">Fatura Dönemi</span>
                                <span className="font-medium text-slate-900 capitalize">{subscription?.billing_cycle === 'annual' ? 'Yıllık' : 'Aylık'}</span>
                            </div>
                            <div className="flex justify-between py-2">
                                <span className="text-slate-500">Tanımlı Ücret</span>
                                <span className="font-bold text-slate-900">
                                    {subscription?.custom_price_usd
                                        ? (
                                            <span className="flex flex-col items-end">
                                                <span>${subscription.custom_price_usd} (Özel)</span>
                                                <span className="text-xs text-slate-500 font-normal">
                                                    ≈ {(subscription.custom_price_usd * usdRate).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} TL
                                                </span>
                                            </span>
                                        )
                                        : subscription?.custom_price_try
                                            ? (
                                                <span className="flex flex-col items-end">
                                                    <span className="text-purple-600">${(subscription.custom_price_try / 100 / usdRate).toLocaleString('en-US', { maximumFractionDigits: 2 })} (TR Bazlı)</span>
                                                    <span className="text-xs text-slate-500 font-normal">
                                                        = {(subscription.custom_price_try / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                                                    </span>
                                                </span>
                                            )
                                            : (
                                                <span className="flex items-center gap-2">
                                                    <span>${subscription?.ai_product_key === 'uppypro_ai' ? aiPriceUsd : inboxPriceUsd}</span>
                                                    <span className="text-xs text-slate-500 font-normal">
                                                        (≈ {new Intl.NumberFormat('tr-TR').format((subscription?.ai_product_key === 'uppypro_ai' ? aiPriceUsd : inboxPriceUsd) * usdRate)} TL)
                                                    </span>
                                                </span>
                                            )
                                    }
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment History */}
            <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 mb-6">Ödeme Geçmişi</h2>
                <div className="relative w-full overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tarih</TableHead>
                                <TableHead>Tutar</TableHead>
                                <TableHead>Tip</TableHead>
                                <TableHead>Durum</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payments?.map((payment) => (
                                <TableRow key={payment.id}>
                                    <TableCell className="text-slate-600">
                                        {new Date(payment.created_at).toLocaleDateString("tr-TR")}
                                    </TableCell>
                                    <TableCell className="font-medium text-slate-900">{(payment.amount_try / 100).toFixed(2)} TL</TableCell>
                                    <TableCell className="capitalize text-slate-600">{payment.type?.replace('_', ' ')}</TableCell>
                                    <TableCell>
                                        <Badge variant={payment.status === 'success' ? 'default' : 'destructive'}>
                                            {payment.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {payments?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-slate-500">Ödeme kaydı bulunamadı.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
