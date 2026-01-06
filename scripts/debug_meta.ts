
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from root
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing env vars");
    process.exit(1);
}

const adminClient = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    console.log("--- Webhook Logs (Last 5) ---");
    const { data: logs, error: logError } = await adminClient
        .from('webhook_logs')
        .select('created_at, body, error_message, headers')
        .order('created_at', { ascending: false })
        .limit(5);

    if (logError) console.error("Log Error:", logError);
    else {
        logs.forEach(l => {
            console.log(`[${l.created_at}] Status: ${l.error_message}`);
            console.log(`Body:`, JSON.stringify(l.body, null, 2));
            console.log(`Response:`, JSON.stringify(l.headers?.response || {}, null, 2));
            console.log("---");
        });
    }

    console.log("\n--- Bucket Info ('chat-media') ---");
    const { data: buckets, error: bucketError } = await adminClient
        .storage
        .listBuckets();

    if (bucketError) console.error("Bucket Error:", bucketError);
    else {
        const chatBucket = buckets.find(b => b.name === 'chat-media');
        console.log("Bucket Found:", chatBucket);
    }
}

run();
