require('ts-node/register');
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function main() {
    console.log("Checking latest subscriptions...");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: subs, error: subError } = await supabase
        .from('subscriptions')
        .select(`
            id, tenant_id, status, created_at, updated_at, agreement_pdf_url, iyzico_checkout_token,
            iyzico_subscription_reference_code
        `)
        .order('created_at', { ascending: false })
        .limit(3);

    console.log("Latest Subscriptions:");
    if (subError) console.error(subError);
    else console.log(JSON.stringify(subs, null, 2));
}

main().catch(console.error);
