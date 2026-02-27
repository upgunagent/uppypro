const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data: conns } = await supabase.from('channel_connections').select('meta_identifiers, access_token_encrypted').eq('channel', 'whatsapp');

    const conn = conns.find(c => c.meta_identifiers && c.meta_identifiers.waba_id);
    if (!conn) return console.log("No WA connection with waba_id found.");

    const wabaId = conn.meta_identifiers.waba_id;
    const token = conn.access_token_encrypted;

    const url = `https://graph.facebook.com/v21.0/${wabaId}/message_templates?name=uppypro_marketing`;
    const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}

check();
