
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(supabaseUrl, supabaseServiceKey);

async function checkLatestConversation() {
    console.log("Checking latest conversation...");
    const { data: convs, error } = await admin
        .from("conversations")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1);

    if (error) {
        console.error("Error fetching conversation:", error);
        return;
    }

    if (!convs || convs.length === 0) {
        console.log("No conversations found.");
        return;
    }

    const conv = convs[0];
    console.log("Latest Conversation:", conv);
    console.log("ID:", conv.id);
    console.log("Tenant ID:", conv.tenant_id);

    // Check if agent settings exist for this tenant
    const { data: settings, error: settingsError } = await admin
        .from("agent_settings")
        .select("*")
        .eq("tenant_id", conv.tenant_id)
        .single();

    console.log("Agent Settings:", settings, settingsError);
}

checkLatestConversation();
