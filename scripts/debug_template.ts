import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
    const { data } = await supabase.from('channel_connections').select('*').eq('channel', 'whatsapp').limit(1);
    if (!data || data.length === 0) return;

    const token = data[0].access_token_encrypted;
    const wabaId = data[0].meta_identifiers.waba_id;

    // Step 1: Create an upload session
    const imgUrl = 'https://sxddrjjiohqflealwfnw.supabase.co/storage/v1/object/public/whatsapp_templates/tanitim/test.jpg';

    console.log("Downloading image...");
    const imgRes = await fetch(imgUrl);
    const arrayBuffer = await imgRes.arrayBuffer();
    const imgBuffer = Buffer.from(arrayBuffer);
    const fileLength = imgBuffer.length;
    const fileType = 'image/jpeg';

    console.log(`Starting upload session using app/uploads alias, size ${fileLength}`);
    const sessionRes = await fetch(`https://graph.facebook.com/v19.0/app/uploads?file_length=${fileLength}&file_type=${fileType}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    const sessionJson = await sessionRes.json();
    console.dir(sessionJson);

    if (!sessionJson.id) {
        console.error("Failed to get session ID from app/uploads.");
        process.exit(1);
    }

    const sessionId = sessionJson.id;

    // Step 2: Upload the data
    console.log(`Uploading to session ${sessionId}...`);
    const uploadRes = await fetch(`https://graph.facebook.com/v19.0/${sessionId}`, {
        method: 'POST',
        headers: {
            'Authorization': `OAuth ${token}`,
            'file_offset': '0'
        },
        body: imgBuffer
    });

    const uploadJson = await uploadRes.json();
    console.dir(uploadJson);

    if (!uploadJson.h) {
        console.error("Failed to get file handle");
        process.exit(1);
    }

    const handle = uploadJson.h;

    // Step 3: Use handle in template
    const payload = {
        name: 'test_template_handle_' + Date.now(),
        language: 'tr',
        category: 'MARKETING',
        components: [
            {
                type: 'HEADER',
                format: 'IMAGE',
                example: { header_handle: [handle] }
            },
            {
                type: 'BODY',
                text: 'Mesai saatleri... uzun bi yazı {{1}}',
                example: { body_text: [['mail']] }
            }
        ]
    };

    console.log("Submitting template with handle...");
    const tplRes = await fetch(`https://graph.facebook.com/v19.0/${wabaId}/message_templates`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    console.dir(await tplRes.json(), { depth: null });
    process.exit(0);
}

check();
