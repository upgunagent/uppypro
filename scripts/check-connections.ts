import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    console.log("--- Checking Channel Connections ---");
    const { data, error } = await supabase.from("channel_connections").select("*");

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Total Connections:", data?.length);
        console.table(data); // Will print nice table

        if (data && data.length > 0) {
            data.forEach(c => {
                console.log(`\nID: ${c.id}`);
                console.log(`Channel: ${c.channel}`);
                console.log(`Status: ${c.status}`);
                console.log(`Method: ${c.connection_method}`);
                console.log(`Meta:`, JSON.stringify(c.meta_identifiers, null, 2));
            });
        }
    }
}

run();
