const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function simulateFix3() {
    const senderId = "1461815108696157"; // ozgurtopkan IG ID
    const recipientId = "17841405829551252"; // Business IG ID

    console.log("Simulating Fix 3 for Sender:", senderId, "Recipient:", recipientId);

    // 1. Find Tenant
    const { data: conn } = await supabaseAdmin
        .from("channel_connections")
        .select("tenant_id")
        .eq("channel", "instagram")
        .contains("meta_identifiers", { ig_user_id: recipientId })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (!conn) {
        console.log("No tenant found!");
        return;
    }
    const tenantIdForEvents = conn.tenant_id;
    console.log("Found Tenant:", tenantIdForEvents);

    // 2. Find Conversation
    const { data: conv, error: convErr } = await supabaseAdmin.from('conversations')
        .select('id')
        .eq('external_thread_id', senderId)
        .eq('channel', 'instagram')
        .eq('tenant_id', tenantIdForEvents)
        .maybeSingle();

    if (convErr) {
        console.log("Conv Error:", convErr);
    }

    if (conv) {
        console.log("Found Conv:", conv.id);

        // 3. Update Messages
        const { data: msgs, error: updErr } = await supabaseAdmin.from('messages')
            .update({ status: 'read', is_read: true })
            .eq('conversation_id', conv.id)
            .eq('direction', 'OUT')
            .eq('is_read', false)
            .select('*');

        console.log("Updated rows count:", msgs?.length);
        if (updErr) console.log("Update Error:", updErr);
    } else {
        console.log("Could not find conversation!");
    }
}

simulateFix3();
