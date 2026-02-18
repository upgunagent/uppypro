
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionCheckoutFormResult, getSubscriptionDetails, getCustomerDetails } from "@/lib/iyzico";

export default async function DebugIyzicoPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return <div>Access Denied</div>;

    const { data: member } = await supabase
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", user.id)
        .single();

    if (!member) return <div>No tenant found</div>;

    const { data: subscription } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("tenant_id", member.tenant_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (!subscription) return <div>No subscription found</div>;

    const token = subscription.iyzico_checkout_token;
    const refCode = subscription.iyzico_subscription_reference_code;
    const custRef = subscription.iyzico_customer_reference_code;

    let checkoutResult = null;
    let subDetails = null;
    let custDetails = null;
    let error = null;

    try {
        if (token) {
            checkoutResult = await getSubscriptionCheckoutFormResult(token);
        }
        if (refCode) {
            subDetails = await getSubscriptionDetails(refCode);
        }
        if (custRef) {
            custDetails = await getCustomerDetails(custRef);
        }
    } catch (e: any) {
        error = e.message;
    }

    return (
        <div className="p-8 space-y-8 font-mono text-sm">
            <h1 className="text-2xl font-bold">Iyzico Debugger</h1>

            <div className="bg-slate-100 p-4 rounded overflow-auto max-h-[400px]">
                <h2 className="font-bold mb-2">Subscription Info (DB)</h2>
                <pre>{JSON.stringify(subscription, null, 2)}</pre>
            </div>

            {error && (
                <div className="bg-red-100 p-4 rounded text-red-700">
                    <h2 className="font-bold">Error</h2>
                    <pre>{error}</pre>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded overflow-auto border max-h-[600px]">
                    <h2 className="font-bold mb-2">Checkout Form Result (Token: {token})</h2>
                    <pre>{JSON.stringify(checkoutResult, null, 2)}</pre>
                </div>

                <div className="bg-slate-50 p-4 rounded overflow-auto border max-h-[600px]">
                    <h2 className="font-bold mb-2">Subscription Details (Ref: {refCode})</h2>
                    <pre>{JSON.stringify(subDetails, null, 2)}</pre>
                </div>

                <div className="bg-slate-50 p-4 rounded overflow-auto border max-h-[600px]">
                    <h2 className="font-bold mb-2">Customer Details (Ref: {custRef})</h2>
                    <pre>{JSON.stringify(custDetails, null, 2)}</pre>
                </div>
            </div>
        </div>
    );
}
