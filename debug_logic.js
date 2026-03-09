const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function testWebhookLogic() {
    console.log("Simulating webhook logic for IG read at 11:09 sender: 1796189024433209 ...");

    const senderId = "1796189024433209";

    const { data: conv } = await supabaseAdmin.from('conversations')
        .select('id').eq('external_thread_id', senderId).eq('channel', 'instagram').maybeSingle();

    if (conv) {
        console.log(`Found Conv: ${conv.id}`);
        // Let's run a dry run select first to see what it would update
        const { data: wouldUpdate, error: selectErr } = await supabaseAdmin.from('messages')
            .select('id, text, is_read, direction, status')
            .eq('conversation_id', conv.id)
            .eq('direction', 'OUT')
            .eq('is_read', false); // THIS is what we use in the code

        console.log(`Query: direction=OUT, is_read=false`);
        console.log("Would update rows:", wouldUpdate?.length);
        wouldUpdate?.forEach(row => console.log(row));
    } else {
        console.log("No conv found for sender:", senderId);
    }
}

testWebhookLogic();
