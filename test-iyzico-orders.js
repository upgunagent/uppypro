require('ts-node/register');
require('dotenv').config({ path: '.env.local' });
const { getSubscriptionDetails } = require('./lib/iyzico');

async function main() {
    console.log("Fetching details...");
    const { createClient } = require('@supabase/supabase-js');

    // Auth issue fixed by loading dotenv BEFORE requiring iyzico.ts
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: subs } = await supabase.from('subscriptions').select('id, iyzico_subscription_reference_code').not('iyzico_subscription_reference_code', 'is', null).order('created_at', { ascending: false }).limit(5);

    if (subs) {
        for (let s of subs) {
            const ref = s.iyzico_subscription_reference_code;
            const details = await getSubscriptionDetails(ref);
            if (details.orders && details.orders.length > 0) {
                console.log("REF:", ref, "Sub ID:", s.id);
                // Output essential fields of the order
                const mappedOrders = details.orders.map(o => ({
                    referenceCode: o.referenceCode,
                    price: o.price,
                    orderStatus: o.orderStatus,
                    paymentStatus: o.paymentStatus,
                    createdDate: o.createdDate,
                    startPeriod: o.startPeriod,
                    endPeriod: o.endPeriod,
                }));
                console.log(JSON.stringify(mappedOrders, null, 2));
                console.log("-----------------------------------------");
            } else {
                console.log("REF:", ref, "- No orders found", details.errorMessage ? `Error: ${details.errorMessage}` : "");
            }
        }
    }
}

main().catch(console.error);
