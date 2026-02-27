const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.log("No env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase
        .from('webhook_logs')
        .select('body, error_message, headers, created_at')
        .in('error_message', ['OUTBOUND_ERROR', 'OUTBOUND_SUCCESS'])
        .order('created_at', { ascending: false })
        .limit(2);

    if (error) console.error("Error:", error);
    else console.log(JSON.stringify(data, null, 2));
}

check();
