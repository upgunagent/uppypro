import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { RepairTenantButton } from "@/components/repair-tenant-button";
import { ChannelCard } from "@/components/channel-card";
import { TrendyolCard } from "@/components/trendyol/trendyol-card";
import { ConnectionGuide } from "@/components/settings/connection-guide";
import { SettingsTabs, ConnectionTabs, WhatsappTemplatesTabs } from "./settings-tabs";
import { BillingForm } from "./billing-form";
import { AiSettingsForm } from "./ai-settings-form";
import { EmailSettingsForm } from "./email-settings-form";
import { AlertTriangle } from "lucide-react";
import { SubscriptionCard } from "./subscription-card";
import { PaymentMethodsCard } from "./payment-methods-card";
import { PasswordChangeCard } from "./password-change-card";
import { LocationsCard } from "@/components/settings/locations-card";
import { TemplatesCard } from "@/components/settings/templates-card";
import { EmployeeSettingsTab } from "@/components/settings/employee-settings-tab";
import { ChatSettingsTab } from "./chat-settings-tab";
import { TemplateBuilder } from "@/components/settings/template-builder";
import { CampaignBuilder } from "@/components/settings/campaign-builder";
import { CampaignReportsCard } from "@/components/settings/campaign-reports-card";
import { CustomerListsCard } from "@/components/settings/customer-lists-card";

import { getPackageName, isKurumsal, isTrendyolAllowed } from "@/lib/subscription-utils";

export default async function SettingsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: member, error: memberErr } = await supabase
        .from("tenant_members")
        .select("tenant_id, role")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

    if (memberErr) {
        console.error("Tenant member fetch error in settings:", memberErr);
        throw new Error("İşletme bilgisi alınırken geçici bir ağ veya veritabanı hatası oluştu. Lütfen sayfayı yenileyin.");
    }

    if (!member) return <div className="p-12"><RepairTenantButton /></div>;

    // Fetch all necessary data in parallel
    const [
        { data: tenant },
        { data: profile },
        { data: channels },
        { data: agentSettings },
        { data: billingInfo },
        { data: subscription },
        { data: paymentMethods },
        { data: tenant_locations },
        { data: employees },
        { data: cannedResponses },
        { data: emailSettings },
        { data: tours }
    ] = await Promise.all([
        supabase.from("tenants").select("*").eq("id", member.tenant_id).single(),
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("channel_connections").select("*").eq("tenant_id", member.tenant_id),
        supabase.from("agent_settings").select("*").eq("tenant_id", member.tenant_id).single(),
        supabase.from("billing_info").select("*").eq("tenant_id", member.tenant_id).single(),
        supabase.from("subscriptions").select("*").eq("tenant_id", member.tenant_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from("payment_methods").select("*").eq("tenant_id", member.tenant_id),
        supabase.from("tenant_locations").select("*").eq("tenant_id", member.tenant_id).order("created_at", { ascending: false }),
        supabase.from("tenant_employees").select("*").eq("tenant_id", member.tenant_id).order("name", { ascending: true }),
        supabase.from("canned_responses").select("*").eq("tenant_id", member.tenant_id).order("shortcut", { ascending: true }),
        supabase.from("email_settings").select("*").eq("tenant_id", member.tenant_id).maybeSingle(),
        supabase.from("tours").select("id, name, tour_type, capacity, is_active, price_per_person, departure_time, route").eq("tenant_id", member.tenant_id).order("sort_order")
    ]);

    // Fetch pricing for both plans to support upgrade/downgrade UI
    let pricing = null;
    let allPrices = [];

    // Always fetch pricing for standard plans + the current subscription's plan
    const productKeys = ['uppypro_inbox', 'uppypro_ai', 'uppypro_ai_trendyol'];
    if (subscription?.ai_product_key && !productKeys.includes(subscription.ai_product_key)) {
        productKeys.push(subscription.ai_product_key);
    }

    const { data: prices } = await supabase.from("pricing")
        .select("*")
        .in("product_key", productKeys)
        .eq("billing_cycle", subscription?.billing_cycle || 'monthly');

    allPrices = prices || [];

    if (subscription) {
        const productKey = subscription.ai_product_key || 'uppypro_inbox';
        pricing = allPrices.find(p => p.product_key === productKey);
    }


    const wa = channels?.find((c) => c.channel === "whatsapp");
    const ig = channels?.find((c) => c.channel === "instagram");
    const ty = channels?.find((c) => c.channel === "trendyol");
    const isKurumsalPackage = isKurumsal(subscription);
    const isTrendyolAccess = isTrendyolAllowed(subscription);

    // Compose Tabs Content

    // 1. Connection Tab Content (Sub-tabs: Channels & AI)
    const channelsContent = (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ChannelCard type="whatsapp" connection={wa} />
                <ChannelCard type="instagram" connection={ig} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TrendyolCard connection={ty} isKurumsal={isTrendyolAccess} />
            </div>
            <ConnectionGuide />
        </div>
    );
    const aiContent = (
        <div className="space-y-6">
            <AiSettingsForm settings={agentSettings} subscription={subscription} tenantId={member.tenant_id} />
            <EmailSettingsForm settings={emailSettings} />
        </div>
    );

    const connectionTab = <ConnectionTabs channelsContent={channelsContent} aiContent={aiContent} />;

    // 1.5 WhatsApp Templates Tab
    const existingTab = (
        <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 text-orange-800 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                    <strong>Bilgilendirme:</strong> Şablon ve pazarlama (marketing) gönderim ücretleri doğrudan Meta (WhatsApp) tarafından ücretlendirilir. Lütfen <a href="https://business.facebook.com/billing_hub/" target="_blank" rel="noreferrer" className="underline font-medium hover:text-orange-900">Meta Fatura Ayarlarınızda</a> kredi kartınızın kayıtlı olduğundan emin olun.
                </div>
            </div>
            <TemplatesCard tenantId={member.tenant_id} />
        </div>
    );
    const builderTab = <TemplateBuilder tenantId={member.tenant_id} />;
    const campaignTab = <CampaignBuilder tenantId={member.tenant_id} />;
    const reportsTab = <CampaignReportsCard tenantId={member.tenant_id} />;
    const customerListsTab = <CustomerListsCard tenantId={member.tenant_id} />;

    const whatsappTemplatesTab = <WhatsappTemplatesTabs existingTab={existingTab} builderTab={builderTab} campaignTab={campaignTab} reportsTab={reportsTab} customerListsTab={customerListsTab} />;

    // 2. Profile/Billing Tab Content
    const profileTab = (
        <div className="space-y-6">
            <BillingForm billingInfo={billingInfo} profile={profile} />
            <LocationsCard tenantId={member.tenant_id} initialLocations={tenant_locations || []} />
        </div>
    );

    // 3. Subscription Tab Content
    const { getUsdExchangeRate } = await import("@/lib/currency");
    const { getSubscriptionDetails } = await import("@/lib/iyzico");
    const { PaymentHistoryTable } = await import("@/components/subscription/payment-history-table");
    const { getInvoicesForTenant } = await import("@/app/actions/invoice");

    const usdRate = await getUsdExchangeRate();

    let iyzicoSubscriptionDetails = null;
    if (subscription?.iyzico_subscription_reference_code) {
        const details = await getSubscriptionDetails(subscription.iyzico_subscription_reference_code);
        if (details?.status === 'success') {
            iyzicoSubscriptionDetails = details;
        }
    }

    // Fatura bilgilerini çek
    const invoices = await getInvoicesForTenant(member.tenant_id);

    const subscriptionTab = (
        <div className="space-y-6">
            <SubscriptionCard
                subscription={subscription}
                price={pricing}
                allPrices={allPrices}
                customPriceTry={subscription?.custom_price_try}
                customPriceUsd={subscription?.custom_price_usd}
                priceUsd={pricing?.monthly_price_usd}
                usdRate={usdRate}
            />

            <div className="space-y-4">
                <h3 className="font-bold text-lg text-slate-900">Ödeme Geçmişi</h3>
                <PaymentHistoryTable orders={iyzicoSubscriptionDetails?.orders || []} invoices={invoices} />
            </div>

            <PaymentMethodsCard methods={paymentMethods || []} subscription={subscription} />
            <PasswordChangeCard />
        </div>
    );

    // 4. Employee Tab Content
    const employeeTab = (
        <EmployeeSettingsTab
            tenantId={member.tenant_id}
            initialEmployees={employees || []}
            initialResourceType={tenant?.resource_type_preference || "employee"}
            initialTours={tours || []}
        />
    );

    // 5. Chat Settings Tab Content
    const chatSettingsTab = (
        <ChatSettingsTab
            tenantId={member.tenant_id}
            initialAiEnabled={tenant?.ai_auto_correct_enabled ?? true}
            initialResponses={cannedResponses || []}
        />
    );

    return (
        <div className="space-y-8 p-8 max-w-[1200px]">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">İşletme Ayarları</h1>
                    <p className="text-slate-500">İşletme bilgilerinizi, bağlantılarınızı ve aboneliğinizi yönetin.</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 text-sm shadow-sm text-slate-700">
                    Paket: <span className="text-primary font-bold">{getPackageName(subscription)}</span>
                </div>
            </div>

            <Suspense fallback={null}>
                <SettingsTabs
                    connectionTab={connectionTab}
                    profileTab={profileTab}
                    whatsappTemplatesTab={whatsappTemplatesTab}
                    subscriptionTab={subscriptionTab}
                    employeeTab={employeeTab}
                    chatSettingsTab={chatSettingsTab}
                />
            </Suspense>
        </div>
    );
}
