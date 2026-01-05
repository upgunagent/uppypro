import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

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

        // Send to Meta
        if (process.env.MOCK_META_SEND === "true") {
            console.log(`[MOCK_META_SEND] To ${conversation_id}: ${text}`);
            return NextResponse.json({ success: true, mock: true });
        }

        // 1. Get Conversation Details (Channel & Recipient ID)
        const { data: conversation } = await supabaseAdmin
            .from("conversations")
            .select("channel, external_thread_id")
            .eq("id", conversation_id)
            .single();

        if (!conversation) {
            throw new Error("Conversation not found");
        }

        if (conversation.channel === 'instagram') {
            // 2. Get Access Token for Tenant
            const { data: connection } = await supabaseAdmin
                .from("channel_connections")
                .select("access_token_encrypted")
                .eq("tenant_id", tenant_id)
                .eq("channel", "instagram")
                .eq("status", "connected")
                .single();

            if (!connection || !connection.access_token_encrypted) {
                throw new Error("Instagram connection not found or disconnected");
            }

            const accessToken = connection.access_token_encrypted; // Decrypt if encrypted

            // 3. Send via Graph API
            const recipientId = conversation.external_thread_id;
            console.log(`Sending IG Message to ${recipientId}...`);

            const res = await fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${accessToken}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    recipient: { id: recipientId },
                    message: { text: text }
                })
            });

            const data = await res.json();

            if (data.error) {
                console.error("Meta Send Error:", data.error);
                throw new Error(data.error.message);
            }

            console.log("IG Message Sent!", data);
        } else {
            console.log("Other channels not implemented yet in PRO send route.");
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Send Error", error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
