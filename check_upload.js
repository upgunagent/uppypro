const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data: conns } = await supabase.from('channel_connections').select('meta_identifiers, access_token_encrypted').eq('channel', 'whatsapp');
    const conn = conns.find(c => c.meta_identifiers && c.meta_identifiers.phone_number_id);
    if (!conn) return console.log("No WA connection with phone_number_id found.");

    const senderId = conn.meta_identifiers.phone_number_id;
    const accessToken = conn.access_token_encrypted;
    const mediaLink = "https://sxddrjjiohqflealwfnw.supabase.co/storage/v1/object/public/whatsapp_templates/32556dda-24d6-42a8-a828-e933ff651b7d/uppypro_marketing_en_1771944011464.png";

    console.log("Downloading from Supabase:", mediaLink);
    const response = await fetch(mediaLink);
    const blob = await response.blob();
    console.log("Downloaded blob size:", blob.size);

    const formData = new FormData();
    formData.append("messaging_product", "whatsapp");
    formData.append("file", blob, "image.png");

    console.log("Uploading to WA Media API...", senderId);
    const uploadRes = await fetch(`https://graph.facebook.com/v21.0/${senderId}/media`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${accessToken}` },
        body: formData
    });
    const uploadData = await uploadRes.json();
    console.log("WA Upload Response:", JSON.stringify(uploadData, null, 2));
}

check();
