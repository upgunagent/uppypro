const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentLogs() {
    console.log("Fetching the absolute latest IG READ webhooks and current DB status for the conversation...\n");

    // 1. Get the conversation ID for 'theozgurt'
    const { data: conv } = await supabase.from('conversations')
        .select('id, external_thread_id').eq('customer_handle', 'theozgurt').maybeSingle();

    if (!conv) {
        console.log("Conversation not found.");
        return;
    }

    console.log(`Target Conversation ID: ${conv.id}`);

    // 2. Fetch the latest 5 messages from that conversation to see their exact read status right now
    const { data: msgs } = await supabase.from('messages')
        .select('id, text, is_read, status, direction, created_at, external_message_id')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(6);

    console.log("--- CURRENT MESSAGES IN DB ---");
    msgs.forEach(m => {
        console.log(`[${m.direction}] "${m.text?.substring(0, 20)}" | Status: ${m.status} | is_read: ${m.is_read} | ID: ${m.id}`);
    });

    console.log("\n--- RECENT WEBHOOK LOGS ---");
    const { data: logs } = await supabase.from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(25);

    for (const log of logs) {
        if (log.body && log.body.entry) {
            const entry = log.body.entry[0];
            if (entry.messaging) {
                for (const msg of entry.messaging) {
                    if (msg.read) {
                        console.log(`[IG READ] at ${log.created_at} - sender: ${msg.sender?.id}`);
                    }
                }
            } else if (entry.changes) {
                const changes = entry.changes[0];
                if (changes.value && changes.value.statuses) {
                    const status = changes.value.statuses[0];
                    if (status.status === 'read') {
                        // console.log(`[WA READ] at ${log.created_at} - ID: ${status.id}`);
                    }
                }
            }
        }
    }
}

checkRecentLogs();
