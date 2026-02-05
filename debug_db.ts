
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
    console.log("Checking logs...");
    const { data: logs, error: logError } = await sb.from('webhook_logs').select('*').order('created_at', { ascending: false }).limit(2);
    if (logError) console.error("Log Error:", logError);
    else console.log(JSON.stringify(logs, null, 2));

    console.log("Checking connections...");
    const { data: conns, error: connError } = await sb.from('channel_connections').select('*');
    if (connError) console.error("Conn Error:", connError);
    else console.log('Connections:', JSON.stringify(conns, null, 2));
}

run();
