require('ts-node/register');
require('dotenv').config({ path: '.env.local' });
const { getSubscriptionDetails } = require('./lib/iyzico');

async function main() {
    const ref = "766dfecc-1752-4092-9691-8cd3bb31234c";
    console.log("Fetching details for:", ref);

    const details = await getSubscriptionDetails(ref);
    if (details.orders && details.orders.length > 0) {
        console.log("ORDERS FOUND:");
        console.log(JSON.stringify(details.orders, null, 2));
    } else {
        console.log("No orders found", details.errorMessage ? `Error: ${details.errorMessage}` : "");
    }
}

main().catch(console.error);
