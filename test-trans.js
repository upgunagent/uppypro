require('ts-node/register');
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const iyzico = require('./lib/iyzico');

async function main() {
    console.log("Fetching transactions the way the server does...");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const adminDb = createClient(supabaseUrl, supabaseKey);

    const { data: subscriptions } = await adminDb
        .from("subscriptions")
        .select(`
            id,
            tenant_id,
            status,
            iyzico_subscription_reference_code,
            base_product_key,
            ai_product_key,
            billing_cycle,
            tenants!inner (
                id,
                name,
                owner_email
            )
        `)
        .not("iyzico_subscription_reference_code", "is", null);

    console.log(`Found ${subscriptions ? subscriptions.length : 0} subscriptions with ref code.`);

    const allTransactions = [];

    for (const sub of subscriptions || []) {
        try {
            const details = await iyzico.getSubscriptionDetails(sub.iyzico_subscription_reference_code);
            if (details?.status === 'success' && details.orders) {
                console.log(`Found ${details.orders.length} orders for ${sub.iyzico_subscription_reference_code}`);
                for (const order of details.orders) {
                    const tenant = sub.tenants;
                    allTransactions.push({
                        orderReferenceCode: order.referenceCode,
                        subscriptionReferenceCode: sub.iyzico_subscription_reference_code,
                        tenantName: tenant?.name || '-',
                        orderStatus: order.orderStatus || order.paymentStatus || 'UNKNOWN',
                    });
                }
            } else {
                console.log(`Failed/No orders for ${sub.iyzico_subscription_reference_code}`);
            }
        } catch (e) {
            console.error(`[TRANSACTIONS] Error fetching details for ${sub.iyzico_subscription_reference_code}:`, e);
        }
    }

    console.log("Total Transactions found (Before Filter):", allTransactions.length);
}

main().catch(console.error);
