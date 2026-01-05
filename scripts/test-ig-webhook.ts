import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    console.log("🔍 Finding connected Instagram account...");

    // 1. Get the first Instagram connection
    const { data: connections, error } = await supabase
        .from("channel_connections")
        .select("*")
        .eq("channel", "instagram")
        .eq("status", "connected")
        .limit(1);

    if (error) {
        console.error("DB Error:", error.message);
        return;
    }

    if (!connections || connections.length === 0) {
        console.error("❌ No connected Instagram account found in DB.");
        console.log("Please connect via Settings page first.");
        return;
    }

    const conn = connections[0];
    const identifiers = conn.meta_identifiers as any;
    const igUserId = identifiers.ig_user_id || identifiers.mock_id;
    const username = identifiers.username || "Unknown";

    console.log(`✅ Found Account: @${username} (ID: ${igUserId})`);

    // 2. Prepare Mock Webhook Payload
    // Mimics real Meta structure
    const payload = {
        object: "instagram",
        entry: [
            {
                id: igUserId, // The account receiving the message (Business Account)
                time: Date.now(),
                messaging: [
                    {
                        sender: {
                            id: "123456789_CUSTOMER_ID" // Fake customer ID
                        },
                        recipient: {
                            id: igUserId // OUR Business ID
                        },
                        timestamp: Date.now(),
                        message: {
                            mid: "mid_" + Date.now(),
                            text: "Merhaba! Bu bir test mesajıdır. 🚀"
                        }
                    }
                ]
            }
        ]
    };

    console.log("🚀 Sending Simulated Webhook to http://localhost:3000/api/webhooks/meta ...");

    try {
        const response = await fetch("http://localhost:3000/api/webhooks/meta", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        console.log("Response Status:", response.status);
        console.log("Response Body:", result);

        if (response.ok && result.success) {
            console.log("\n✅ SUCCESS! Message should appear in your Inbox.");
            console.log("Go to: http://localhost:3000/panel/inbox");
        } else {
            console.log("\n❌ Failed to process webhook.");
        }

    } catch (err) {
        console.error("Network Error (Is server running?):", err);
    }
}

run();
