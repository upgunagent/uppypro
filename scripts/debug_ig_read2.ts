import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function check() {
    const { data: convs } = await supabase.from('conversations').select('id, channel, external_thread_id').eq('channel', 'instagram').order('created_at', { ascending: false }).limit(2);
    console.log("IG Convs:", JSON.stringify(convs, null, 2));

    if (convs && convs.length > 0) {
        const { data: msgs } = await supabase.from('messages')
            .select('id, text, direction, is_read, external_message_id, created_at, sender')
            .eq('conversation_id', convs[0].id)
            .eq('direction', 'OUT')
            .order('created_at', { ascending: false })
            .limit(3);

        console.log("Recent OUT messages for conv:", msgs);
    }
}

check();
