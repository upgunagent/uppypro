const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyFix() {
    const senderId = "1796189024433209";

    const { data: conv } = await supabase.from('conversations')
        .select('id').eq('external_thread_id', senderId).eq('channel', 'instagram').maybeSingle();

    if (conv) {
        const { data, error } = await supabase.from('messages')
            .update({ status: 'read', is_read: true, read_at: new Date().toISOString() })
            .eq('conversation_id', conv.id)
            .eq('direction', 'OUT')
            .eq('is_read', false)
            .select('id, text, is_read');

        console.log("Updated rows:", data);
        if (error) console.error("Error:", error);
    }
}

verifyFix();
