// Let's create a final fix test for debug route logic

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function testFinalFix() {
    const senderId = "1796189024433209";

    // DO NOT USE maybeSingle() if you only match by external_thread_id !!!
    // One IG User can talk to MULTIPLE tenants.
    // So 'conversations' where external_thread_id = senderId will return MULTIPLE rows.
    // 'maybeSingle()' throws an error silently if there are multiple rows and returns NULL data !!!

    // We NEED the recipientId (which is the tenant's connected IG account ID) to find the exact conversation!
    const recipientId = "17841405829551252"; // The business IG account ID

    // First, find the tenant using recipientId
    const { data: conn } = await supabaseAdmin
        .from("channel_connections")
        .select("tenant_id")
        .eq("channel", "instagram")
        .contains("meta_identifiers", { ig_user_id: recipientId })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (!conn) {
        console.log("No tenant found");
        return;
    }

    const tenantId = conn.tenant_id;
    console.log("Found Tenant:", tenantId);

    // Now find the EXACT conversation
    const { data: conv } = await supabaseAdmin.from('conversations')
        .select('id').eq('external_thread_id', senderId).eq('channel', 'instagram').eq('tenant_id', tenantId).maybeSingle();

    if (conv) {
        console.log("SUCCESS! EXACT CONV FOUND:", conv.id);
        const { data, error } = await supabaseAdmin.from('messages')
            .update({ status: 'read', is_read: true, read_at: new Date().toISOString() })
            .eq('conversation_id', conv.id)
            .eq('direction', 'OUT')
            .eq('is_read', false)
            .select('id, text, is_read');

        console.log("Updated rows:", data?.length);
    } else {
        console.log("Still failing");
    }
}

testFinalFix();
