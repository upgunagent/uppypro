import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function check() {
    const { data: convs } = await supabase.from('conversations').select('id, channel').eq('channel', 'instagram');
    const convIds = convs?.map(c => c.id) || [];

    if (convIds.length === 0) {
        console.log("No IG conversations found.");
        return;
    }

    const { data: msgs } = await supabase.from('messages')
        .select('id, text, direction, status, is_read, external_message_id, created_at, sender')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false })
        .limit(10);

    console.log("Recent IG Messages:", JSON.stringify(msgs, null, 2));
}

check();
