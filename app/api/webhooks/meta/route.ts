
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "uppypro_verify_token";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
        return new NextResponse(challenge, {
            status: 200,
            headers: {
                "Content-Type": "text/plain",
            },
        });
    }
    return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const supabaseAdmin = createAdminClient();

        for (const entry of body.entry || []) {
            const changes = entry.changes?.[0]?.value;
            const messaging = entry.messaging?.[0];

            let eventData = null;
            let channel: 'whatsapp' | 'instagram' = 'whatsapp';
            let recipientId = null; // To find tenant

            if (changes?.messages) {
                // WhatsApp
                const msg = changes.messages[0];
                eventData = {
                    external_msg_id: msg.id,
                    text: msg.text?.body || "[Media/Other]",
                    sender_id: msg.from,
                    timestamp: msg.timestamp
                };
                recipientId = changes.metadata?.phone_number_id;
                channel = 'whatsapp';
            } else if (messaging) {
                // Instagram
                // messaging.recipient.id is the Instagram Account ID (Scoped)
                eventData = {
                    external_msg_id: messaging.message?.mid,
                    text: messaging.message?.text || "[Media/Other]",
                    sender_id: messaging.sender?.id, // Customer's scoped ID
                    timestamp: messaging.timestamp
                };
                recipientId = messaging.recipient?.id; // OUR Instagram Account ID
                channel = 'instagram';
            }

            if (!eventData || !recipientId) continue;

            // 1. Find Tenant
            let tenantId = null;

            if (channel === 'instagram') {
                // ... instagram logic ...
                // Keep existing logic but add logs if needed
                const { data: conn } = await supabaseAdmin
                    .from("channel_connections")
                    .select("tenant_id")
                    .eq("channel", "instagram")
                    .contains("meta_identifiers", { ig_user_id: recipientId })
                    .maybeSingle();

                if (conn) tenantId = conn.tenant_id;
            } else {
                // WhatsApp
                console.log("[Meta Webhook] Searching for tenant with phone_id:", recipientId);

                // Try finding by exact phone_number_id
                let { data: connection } = await supabaseAdmin
                    .from("channel_connections")
                    .select("tenant_id")
                    .eq("channel", "whatsapp")
                    .contains("meta_identifiers", { phone_number_id: recipientId })
                    .maybeSingle();

                // If not found, try 'mock_id' (legacy/fallback)
                if (!connection) {
                    const { data: connection2 } = await supabaseAdmin
                        .from("channel_connections")
                        .select("tenant_id")
                        .eq("channel", "whatsapp")
                        .contains("meta_identifiers", { mock_id: recipientId })
                        .maybeSingle();
                    connection = connection2;
                }

                if (connection) {
                    tenantId = connection.tenant_id;
                    console.log("[Meta Webhook] Found tenant:", tenantId);
                } else {
                    console.log("[Meta Webhook] Tenant NOT found for phone_id:", recipientId);
                }
            }

            if (!tenantId) {
                console.log("Tenant not found for recipient:", recipientId);
                continue;
            }

            // 2. Find/Create Conversation
            let { data: conversation } = await supabaseAdmin
                .from("conversations")
                .select("*")
                .match({ tenant_id: tenantId, channel: channel, external_thread_id: eventData.sender_id })
                .maybeSingle();

            if (!conversation) {
                const { data: newConv } = await supabaseAdmin
                    .from("conversations")
                    .insert({
                        tenant_id: tenantId,
                        channel: channel,
                        external_thread_id: eventData.sender_id,
                        customer_handle: eventData.sender_id,
                        mode: 'HUMAN'
                    })
                    .select()
                    .single();
                conversation = newConv;
            }

            // 3. Insert Message
            const { error: msgError } = await supabaseAdmin
                .from("messages")
                .insert({
                    tenant_id: tenantId,
                    conversation_id: conversation.id,
                    direction: 'IN',
                    sender: 'CUSTOMER',
                    text: eventData.text,
                    external_message_id: eventData.external_msg_id
                });

            if (msgError && msgError.code !== '23505') {
                console.error("Message insert error", msgError);
            }

            // 4. n8n Trigger Logic (unchanged)
            const { data: settings } = await supabaseAdmin
                .from("agent_settings")
                .select("*")
                .eq("tenant_id", tenantId)
                .single();

            if (settings?.ai_operational_enabled && settings?.n8n_webhook_url && conversation?.mode === 'BOT') {
                try {
                    await fetch(settings.n8n_webhook_url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            message: eventData.text,
                            conversation_id: conversation.id,
                            tenant_id: tenantId,
                            sender_id: eventData.sender_id,
                            channel: channel
                        })
                    });
                } catch (e) {
                    console.error("n8n Trigger Failed", e);
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Webhook Error", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 200 });
    }
}
