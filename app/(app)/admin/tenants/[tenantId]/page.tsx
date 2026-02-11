import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageSquare, ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { AdminSettingsTabs, AdminConnectionTabs } from "./admin-settings-tabs";
import { AdminBillingForm } from "./admin-billing-form";
import { AdminAiSettingsForm } from "./admin-ai-settings-form";
import { ManageSubscriptionForm } from "./billing/manage-subscription-form";
import { ChannelCard } from "@/components/channel-card";

export default async function TenantDetail({ params }: { params: Promise<{ tenantId: string }> }) {
    const supabase = await createClient(); // For auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return <div>Yetkisiz Erişim</div>;

    const { tenantId } = await params;
    const adminDb = createAdminClient();

    // 1. Fetch Tenant & Owner
    const { data: tenant } = await adminDb.from("tenants").select("*").eq("id", tenantId).single();
    if (!tenant) return <div>İşletme bulunamadı</div>;

    const { data: ownerMember } = await adminDb
        .from("tenant_members")
        .select("user_id, profiles(*)")
        .eq("tenant_id", tenantId)
        .eq("role", "tenant_owner") // Fixed: Matches DB enum value
        .limit(1)
        .maybeSingle();

    const ownerProfile = ownerMember?.profiles || {};

    // 2. Fetch Settings Data
    const { data: channels } = await adminDb.from("channel_connections").select("*").eq("tenant_id", tenantId);
    const { data: agentSettings } = await adminDb.from("agent_settings").select("*").eq("tenant_id", tenantId).maybeSingle();
    const { data: billingInfo } = await adminDb.from("billing_info").select("*").eq("tenant_id", tenantId).single();

    // 3. Fetch Subscription & Payments
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
        .order("created_at", { ascending: false })
        .limit(10);

    // Helpers
    const wa = channels?.find((c) => c.channel === "whatsapp");
    const ig = channels?.find((c) => c.channel === "instagram");

    // Fetch Standard Pricing (USD) and Live Rate
    const { data: prices } = await adminDb
        .from("pricing")
        .select("*")
        .in("product_key", ["uppypro_inbox", "uppypro_ai"])
        .eq("billing_cycle", "monthly");

    // Import dynamically to avoid top-level await issues if any, though standard import works
    const { getUsdExchangeRate } = await import("@/lib/currency");
    const usdRate = await getUsdExchangeRate();

    const inboxPriceUsd = prices?.find(p => p.product_key === "uppypro_inbox")?.monthly_price_usd || 19;
    const aiPriceUsd = prices?.find(p => p.product_key === "uppypro_ai")?.monthly_price_usd || 79;

    // Calculate TL estimate
    const inboxPrice = Math.round(inboxPriceUsd * usdRate * 100); // in cents
    const aiPrice = Math.round(aiPriceUsd * usdRate * 100); // in cents

    // Check Package for Header
    const sub = subscription;
    const isEnterprise = sub?.ai_product_key === 'uppypro_enterprise';
    const isPro = sub?.ai_product_key === 'uppypro_ai';

    // Composed Content

    // Tab 1: Connections
    const channelsContent = (
        <div className="flex flex-wrap gap-6">
            <div className="w-full max-w-[380px] pointer-events-none">
                {/* Read-only / Visual only since actions are user-scoped currently */}
                <ChannelCard type="whatsapp" connection={wa} />
            </div>
            <div className="w-full max-w-[380px] pointer-events-none">
                <ChannelCard type="instagram" connection={ig} />
            </div>
            <p className="w-full text-xs text-slate-400 mt-2">* Kanal bağlantıları şu an sadece işletme paneli üzerinden yönetilebilir.</p>
        </div>
    );
    const aiContent = <AdminAiSettingsForm settings={agentSettings} tenantId={tenantId} />;
    const connectionTab = <AdminConnectionTabs channelsContent={channelsContent} aiContent={aiContent} />;

    // Tab 2: Profile (Billing Info)
    const profileTab = <AdminBillingForm billingInfo={billingInfo} tenantId={tenantId} ownerProfile={ownerProfile} />;

    // Tab 3: Subscription
    const subscriptionTab = (
        <div className="space-y-8">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <ManageSubscriptionForm
                    tenantId={tenantId}
                    subscription={subscription}
                    inboxPrice={inboxPriceUsd}
                    aiPrice={aiPriceUsd}
                    usdRate={usdRate}
                />

                {/* Plan Summary Card - Reusing Logic from previous page manually or component */}
                <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm h-fit">
                    <h3 className="font-bold text-lg text-slate-900 mb-6">Plan Özeti</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-slate-50">
                            <span className="text-slate-500">Ana Paket</span>
                            <span className="font-medium text-slate-900">UppyPro Inbox</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-50">
                            <span className="text-slate-500">AI Paketi</span>
                            <span className="font-medium text-slate-900">
                                {isEnterprise ? "UppyPro Kurumsal" : isPro ? "UppyPro AI" : "Yok"}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-50">
                            <span className="text-slate-500">Durum</span>
                            <Badge variant={sub?.status === 'active' ? 'default' : 'secondary'} className={sub?.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}>
                                {sub?.status === 'active' ? "Aktif" : "Pasif"}
                            </Badge>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-50">
                            <span className="text-slate-500">Fatura Dönemi</span>
                            <span className="font-medium text-slate-900">Aylık</span>
                        </div>
                        <div className="flex justify-between items-center py-2 pt-4">
                            <span className="text-slate-500">Tanımlı Ücret</span>
                            <span className="font-bold text-lg text-slate-900">
                                {sub?.custom_price_usd
                                    ? (
                                        <div className="flex flex-col items-end">
                                            <span className="text-purple-600">${sub.custom_price_usd} (Özel)</span>
                                            <span className="text-xs text-slate-500 font-normal">
                                                ≈ {(sub.custom_price_usd * usdRate).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} TL
                                            </span>
                                        </div>
                                    )
                                    : sub?.custom_price_try
                                        ? (
                                            <div className="flex flex-col items-end">
                                                <span className="text-purple-600">${(sub.custom_price_try / 100 / usdRate).toLocaleString('en-US', { maximumFractionDigits: 2 })} (TR Bazlı)</span>
                                                <span className="text-xs text-slate-500 font-normal">
                                                    = {(sub.custom_price_try / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                                                </span>
                                            </div>
                                        )
                                        : (
                                            <div className="flex flex-col items-end">
                                                <span>${isPro ? aiPriceUsd : inboxPriceUsd}</span>
                                                <span className="text-xs text-slate-500 font-normal">
                                                    ≈ {new Intl.NumberFormat('tr-TR').format((isPro ? aiPriceUsd : inboxPriceUsd) * usdRate)} TL
                                                </span>
                                            </div>
                                        )
                                }
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment History */}
            <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-lg text-slate-900 mb-6">Ödeme Geçmişi</h3>
                <Table>
                    <TableHeader className="bg-slate-50">
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
                                <TableCell>{new Date(payment.created_at).toLocaleDateString("tr-TR")}</TableCell>
                                <TableCell>{(payment.amount / 100).toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}</TableCell>
                                <TableCell className="capitalize">{payment.type}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">Ödendi</Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                        {(!payments || payments.length === 0) && (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                                    Kayıt bulunamadı.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 p-8 pl-10 max-w-[1400px]">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/admin/tenants">
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{tenant.name}</h1>
                        <p className="text-slate-500">İşletme Detayları ve Yönetim Paneli</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">

                    <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 text-sm shadow-sm text-slate-700 flex items-center gap-2">
                        Paket:
                        {isEnterprise ? (
                            <span className="text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded">Kurumsal</span>
                        ) : isPro ? (
                            <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">UppyPro AI</span>
                        ) : (
                            <span className="text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded">Inbox</span>
                        )}
                    </div>
                </div>
            </div>

            <AdminSettingsTabs
                connectionTab={connectionTab}
                profileTab={profileTab}
                subscriptionTab={subscriptionTab}
            />
        </div>
    );
}
