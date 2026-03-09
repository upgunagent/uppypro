const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function inspectOzgur() {
    console.log("Looking for all recent conversations in IG");

    // Find all recent convs
    const { data: convs } = await supabaseAdmin.from('conversations')
        .select('id, external_thread_id, customer_handle')
        .eq('channel', 'instagram')
        .order('updated_at', { ascending: false })
        .limit(5);

    for (const conv of convs) {
        console.log(`Conv: ${conv.customer_handle} - ExID: ${conv.external_thread_id} - ConvID: ${conv.id}`);
        // see recent msgs for this conv
        const { data: msgs } = await supabaseAdmin.from('messages')
            .select('text, is_read, direction, status, external_message_id, created_at')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(3);

        msgs.forEach(m => console.log(`   [${m.direction}] "${m.text?.substring(0, 10)}" | R:${m.is_read} | ID: ${m.external_message_id?.substring(0, 10)}... | at ${m.created_at}`));
    }
}

inspectOzgur();
