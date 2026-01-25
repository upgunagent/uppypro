
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local from parent directory
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugInbox() {
    console.log("--- Debugging Inbox Conversation Data ---");

    // 1. Fetch top 5 recent conversations
    const { data: convs, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(5);

    if (convError) {
        console.error("Error fetching conversations:", convError);
        return;
    }

    console.log(`Found ${convs.length} conversations.`);

    for (const conv of convs) {
        console.log(`\nConversation ID: ${conv.id}`);
        console.log(`Tenant ID: ${conv.tenant_id}`);
        console.log(`Channel: ${conv.channel}`);
        console.log(`Handle: ${conv.customer_handle}`);

        // 2. Fetch messages for this conversation (mimic InboxPage query)
        const { data: messages, error: msgError } = await supabase
            .from("messages")
            .select("*")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: true });

        if (msgError) {
            console.error("  Error fetching messages:", msgError);
        } else {
            console.log(`  Message Count: ${messages.length}`);
            if (messages.length > 0) {
                console.log("  First Message Sample:");
                console.log(JSON.stringify(messages[0], null, 2));

                // Check for text field explicitly
                const hasText = 'text' in messages[0];
                console.log(`  Has 'text' field: ${hasText}`);
                if (hasText) {
                    console.log(`  Text content: "${messages[0].text}"`);
                }
            } else {
                console.log("  [WARNING] No messages found for this conversation!");
            }
        }
    }
}

debugInbox();
