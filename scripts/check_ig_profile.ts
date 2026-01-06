import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    console.log("Checking Instagram Profile Fetch...");

    // 1. Get Access Token
    const { data: connections, error } = await supabase
        .from('channel_connections')
        .select('*')
        .eq('channel', 'instagram')
        .eq('status', 'connected');

    if (error || !connections || connections.length === 0) {
        console.error("No connected Instagram channel found.", error);
        return;
    }

    const conn = connections[0];
    const token = conn.access_token_encrypted;
    console.log("Found Token for Tenant:", conn.tenant_id);

    // 2. Target User ID (from screenshot/user report)
    const targetUserId = '1461815108696157';

    // 3. Test Graph API
    const url = `https://graph.facebook.com/v21.0/${targetUserId}?fields=username,name,profile_pic&access_token=${token}`;
    console.log("Fetching:", url.replace(token, 'REDACTED'));

    try {
        const res = await fetch(url);
        const data = await res.json();
        console.log("API Response:", JSON.stringify(data, null, 2));

        if (data.username) {
            console.log("SUCCESS! Username found:", data.username);

            // OPTIONAL: Update DB immediately?
            console.log("Updating conversation in DB...");
            const { error: updateError } = await supabase
                .from('conversations')
                .update({ customer_handle: data.username })
                .eq('external_thread_id', targetUserId)
                .eq('channel', 'instagram')
                .select();

            if (updateError) console.error("DB Update Failed:", updateError);
            else console.log("DB Updated Successfully!");

        } else {
            console.error("FAILED to get username. Possible permission issue or ID mismatch.");
        }

    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

main();
