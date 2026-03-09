const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing DB credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMessages() {
    console.log("Checking recent IG conversations and their messages...");
    const { data: convs, error: convErr } = await supabase
        .from('conversations')
        .select('id, external_thread_id, customer_handle, channel')
        .eq('channel', 'instagram')
        .order('updated_at', { ascending: false })
        .limit(2);

    if (convErr) {
        console.error("Conv Error:", convErr);
        return;
    }

    for (const conv of convs) {
        console.log(`\nConv: ${conv.customer_handle} (ID: ${conv.id}, Thread: ${conv.external_thread_id})`);

        const { data: msgs, error: msgErr } = await supabase
            .from('messages')
            .select('id, text, direction, sender, status, is_read, external_message_id, created_at, reactions')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(5);

        if (msgErr) {
            console.error("Msg Error:", msgErr);
            continue;
        }

        for (const m of msgs) {
            console.log(`  [${m.direction} - ${m.sender}] Status: ${m.status}, Read: ${m.is_read}, ExtID: ${m.external_message_id}`);
            console.log(`    Text: "${m.text?.substring(0, 30)}" | Reactions: ${JSON.stringify(m.reactions)}`);
        }
    }
}

async function checkRecentLogs() {
    console.log("\nChecking last 5 IG webhook logs...");
    const { data, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error("Error fetching logs:", error);
        return;
    }

    for (const log of data) {
        if (log.body && log.body.entry) {
            const entry = log.body.entry[0];
            if (entry.messaging) {
                for (const msg of entry.messaging) {
                    if (msg.read || msg.reaction) {
                        console.log(`[LOG] Event: ${msg.read ? 'READ' : 'REACTION'} at ${log.created_at}`);
                        console.log(JSON.stringify(msg, null, 2));
                    }
                }
            }
        }
    }
}

async function run() {
    await checkMessages();
    await checkRecentLogs();
}

run();
