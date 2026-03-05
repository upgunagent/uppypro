require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function check() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log("Fetching logs for 905491013425...");
    const { data, error } = await supabase
        .from('customer_campaign_logs')
        .select('id, status, phone_number, error_message, created_at')
        .eq('phone_number', '905491013425')
        .order('created_at', { ascending: false })
        .limit(3);

    if (error) console.error("Error:", error);
    else console.log(JSON.stringify(data, null, 2));
}

check();
