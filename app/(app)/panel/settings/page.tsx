import { createClient } from "@/lib/supabase/server";
import { RepairTenantButton } from "@/components/repair-tenant-button";
import { ChannelCard } from "@/components/channel-card";
import { SettingsTabs, ConnectionTabs } from "./settings-tabs";
import { BillingForm } from "./billing-form";
import { AiSettingsForm } from "./ai-settings-form";
import { SubscriptionCard } from "./subscription-card";
import { PaymentMethodsCard } from "./payment-methods-card";
import { PasswordChangeCard } from "./password-change-card";

import { getPackageName } from "@/lib/subscription-utils";

export default async function SettingsPage() {
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
        { data: paymentMethods }
    ] = await Promise.all([
        supabase.from("tenants").select("*").eq("id", member.tenant_id).single(),
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("channel_connections").select("*").eq("tenant_id", member.tenant_id),
        supabase.from("agent_settings").select("*").eq("tenant_id", member.tenant_id).single(),
        supabase.from("billing_info").select("*").eq("tenant_id", member.tenant_id).single(),
        supabase.from("subscriptions").select("*").eq("tenant_id", member.tenant_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from("payment_methods").select("*").eq("tenant_id", member.tenant_id)
    ]);

    // Fetch pricing if subscription exists
    // Fetch pricing if subscription exists
    let pricing = null;
    if (subscription) {
        // If ai_product_key is null, it's the standard Inbox plan
        const productKey = subscription.ai_product_key || 'uppypro_inbox';

        const { data } = await supabase.from("pricing")
            .select("*")
            .eq("product_key", productKey)
            .eq("billing_cycle", subscription.billing_cycle || 'monthly')
            .limit(1)
            .maybeSingle();
        pricing = data;
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

    const connectionTab = <ConnectionTabs channelsContent={channelsContent} aiContent={aiContent} />;

    // 2. Profile/Billing Tab Content
    const profileTab = <BillingForm billingInfo={billingInfo} profile={profile} />;

    // 3. Subscription Tab Content
    const { getUsdExchangeRate } = await import("@/lib/currency");
    const usdRate = await getUsdExchangeRate();

    const subscriptionTab = (
        <div className="space-y-6">
            <SubscriptionCard
                subscription={subscription}
                price={pricing}
                customPriceTry={subscription?.custom_price_try}
                customPriceUsd={subscription?.custom_price_usd}
                priceUsd={pricing?.monthly_price_usd}
                usdRate={usdRate}
            />
            <PaymentMethodsCard methods={paymentMethods || []} />
            <PasswordChangeCard />
        </div>
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
                connectionTab={connectionTab}
                profileTab={profileTab}
                subscriptionTab={subscriptionTab}
            />
        </div>
    );
}
