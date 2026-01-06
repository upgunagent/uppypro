import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { sendToChannel } from "@/lib/meta";

export async function POST(request: Request) {
    try {
        const apiKey = request.headers.get("x-api-key");
        const body = await request.json();
        const { tenant_id, conversation_id, text, sender } = body;

        // Validate API Key (Simple check against env or store)
        if (apiKey !== process.env.BOT_API_KEY) {
            // Also allow session auth if needed, but this is primarily for BOT integration
            // returning 401
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const supabaseAdmin = createAdminClient();

        // Insert Message
        const { error } = await supabaseAdmin.from("messages").insert({
            tenant_id,
            conversation_id,
            direction: "OUT",
            sender: sender || "BOT",
            text
        });

        if (error) throw error;

        if (process.env.MOCK_META_SEND === "true") {
            console.log(`[MOCK_META_SEND] To ${conversation_id}: ${text}`);
            return NextResponse.json({ success: true, mock: true });
        }

        // 1. Get Conversation Details
        const { data: conversation } = await supabaseAdmin
            .from("conversations")
            .select("tenant_id, channel, external_thread_id")
            .eq("id", conversation_id)
            .single();

        if (!conversation) {
            throw new Error("Conversation not found");
        }

        // 2. Send via Service
        if (conversation.channel === 'instagram' || conversation.channel === 'whatsapp') {
            const result = await sendToChannel(
                conversation.tenant_id,
                conversation.channel,
                conversation.external_thread_id,
                text
            );

            if (!result.success) {
                throw new Error(result.error);
            }
            console.log("Message Sent!", result.data);
        } else {
            console.log("Other channels not implemented yet in PRO send route.");
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Send Error", error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
