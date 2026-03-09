const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkIGReadWebhookLogs() {
    console.log("Checking recent IG READ logs...");
    const { data: logs } = await supabase.from('webhook_logs')
        .select('created_at, body')
        .order('created_at', { ascending: false })
        .limit(20);

    for (const log of logs) {
        if (log.body && log.body.entry) {
            const entry = log.body.entry[0];
            if (entry.messaging) {
                for (const msg of entry.messaging) {
                    if (msg.read) {
                        console.log(`[IG READ] at ${log.created_at} - Recipient (Tenant): ${msg.recipient?.id} - Sender: ${msg.sender?.id}`);
                    }
                }
            }
        }
    }
}
checkIGReadWebhookLogs();
