import { createClient } from "@/lib/supabase/server";
import { RepairTenantButton } from "@/components/repair-tenant-button";
import { ChannelCard } from "@/components/channel-card";
import { SettingsTabs, ConnectionTabs } from "./settings-tabs";
import { BillingForm } from "./billing-form";
import { AiSettingsForm } from "./ai-settings-form";
import { SubscriptionCard } from "./subscription-card";
import { PaymentMethodsCard } from "./payment-methods-card";
import { PasswordChangeCard } from "./password-change-card";
import { LocationsCard } from "@/components/settings/locations-card";
import { TemplatesCard } from "@/components/settings/templates-card";
import { EmployeeSettingsTab } from "@/components/settings/employee-settings-tab";

import { getPackageName } from "@/lib/subscription-utils";

interface SettingsPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function SettingsPage(props: SettingsPageProps) {
    const searchParams = await props.searchParams;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: member } = await supabase
        .from("tenant_members")
        .select("tenant_id, role")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

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
        { data: employees }
    ] = await Promise.all([
        supabase.from("tenants").select("*").eq("id", member.tenant_id).single(),
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("channel_connections").select("*").eq("tenant_id", member.tenant_id),
        supabase.from("agent_settings").select("*").eq("tenant_id", member.tenant_id).single(),
        supabase.from("billing_info").select("*").eq("tenant_id", member.tenant_id).single(),
        supabase.from("subscriptions").select("*").eq("tenant_id", member.tenant_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from("payment_methods").select("*").eq("tenant_id", member.tenant_id),
        supabase.from("tenant_locations").select("*").eq("tenant_id", member.tenant_id).order("created_at", { ascending: false }),
        supabase.from("tenant_employees").select("*").eq("tenant_id", member.tenant_id).order("name", { ascending: true })
    ]);

    // Fetch pricing for both plans to support upgrade/downgrade UI
    let pricing = null;
    let allPrices = [];

    // Always fetch pricing for standard plans + the current subscription's plan
    const productKeys = ['uppypro_inbox', 'uppypro_ai'];
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

    // Compose Tabs Content

    // 1. Connection Tab Content (Sub-tabs: Channels & AI)
    const channelsContent = (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChannelCard type="whatsapp" connection={wa} />
            <ChannelCard type="instagram" connection={ig} />
        </div>
    );
    const aiContent = <AiSettingsForm settings={agentSettings} subscription={subscription} />;
    const templatesContent = <TemplatesCard tenantId={member.tenant_id} />;

    const connectionTab = <ConnectionTabs channelsContent={channelsContent} templatesContent={templatesContent} aiContent={aiContent} />;

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

            <SettingsTabs
                defaultValue={searchParams.tab as string || "connections"}
                connectionTab={connectionTab}
                profileTab={profileTab}
                subscriptionTab={subscriptionTab}
                employeeTab={employeeTab}
            />
        </div>
    );
}
