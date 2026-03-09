// Let's manually fetch the exact webhook logs for the conversation 1796189024433209
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function checkLogDiff() {
    console.log("Checking exact Sender ID for conversation 'theozgurt'...");

    // The conversation thread ID for theozgurt:
    const { data: conv } = await supabaseAdmin.from('conversations')
        .select('*').eq('customer_handle', 'theozgurt').eq('channel', 'instagram').single();

    console.log("Conversations Customer Handle:", conv.customer_handle);
    console.log("Conversations External Thread ID (Customer IG ID):", conv.external_thread_id);

    // Now let's see WHO sent the message 'merhaba nasılsın' vs WHO read it
    const { data: msgs } = await supabaseAdmin.from('messages')
        .select('id, text, direction, sender, external_message_id, created_at, reactions')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false });

    console.log("\nMessages:");
    msgs.forEach(m => console.log(`[${m.direction}] ${m.text.substring(0, 20)} - User: ${m.sender} - ExtID: ${m.external_message_id?.substring(0, 20)}`));

    // We already know from webhook logs that the READ event's sender was: 1796189024433209 (Which matches!)
    // Oh, wait... earlier my debug_logic.js said: "No conv found for sender: 1796189024433209"
    // Let me check that query directly.
    const senderIdToFind = "1796189024433209";
    const { data: testConv } = await supabaseAdmin.from('conversations')
        .select('id').eq('external_thread_id', senderIdToFind).eq('channel', 'instagram').maybeSingle();

    console.log("\nLookup test for 1796189024433209:", testConv);
}

checkLogDiff();
