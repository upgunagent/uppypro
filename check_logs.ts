import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkLogs() {
    console.log("Checking last 5 webhook logs...");

    const { data, error } = await supabase
        .from("webhook_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error fetching logs:", error);
        return;
    }

    data.forEach(log => {
        console.log("------------------------------------------------");
        console.log(`ID: ${log.id} | Time: ${log.created_at}`);
        console.log("Body Preview:", JSON.stringify(log.body).substring(0, 200) + "...");
        if (log.error_message) {
            console.log("ERROR/STATUS:", log.error_message);
        }
    });
}

checkLogs();
