
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
    let bodyText = "";
    const supabaseAdmin = createAdminClient();

    try {
        // 1. Read Raw Text
        bodyText = await request.text();

        // 2. Parse JSON
        let body;
        try {
            body = JSON.parse(bodyText);
        } catch (e) {
            console.error("JSON Parse Error", e);
            body = { error: "Invalid JSON", raw: bodyText };
        }

        // 3. LOG RAW WEBHOOK TO DB
        await supabaseAdmin.from("webhook_logs").insert({
            body: body,
            headers: Object.fromEntries(request.headers), // Capture headers
            error_message: body.error ? "JSON Parse Error" : null
        });

        if (!body.entry) {
            return NextResponse.json({ success: true, note: "No entry found (verification or empty)" });
        }

        for (const entry of body.entry || []) {
            const changes = entry.changes?.[0]?.value;
            const messaging = entry.messaging?.[0] || entry.standby?.[0];
            // ... rest of the code ...

            let eventData = {
                external_msg_id: '',
                text: '',
                sender_id: '',
                sender_name: null as string | null,
                timestamp: '',
                type: 'text',
                media_url: null as string | null,
                media_type: null as string | null
            };
            let channel: 'whatsapp' | 'instagram' = 'whatsapp';
            let recipientId = null; // To find tenant

            // FILTER: Ignore Status Updates (WhatsApp)
            if (changes?.statuses) {
                console.log("Ignoring value 'statuses' update");
                continue;
            }

            if (changes?.messages) {
                // WhatsApp Logic
                const msg = changes.messages[0];
                eventData.external_msg_id = msg.id;
                eventData.sender_id = msg.from;
                eventData.timestamp = msg.timestamp;

                // WhatsApp Contact Name
                if (changes.contacts) {
                    const contact = changes.contacts.find((c: any) => c.wa_id === msg.from);
                    if (contact?.profile?.name) {
                        eventData.sender_name = contact.profile.name;
                    }
                }

                // ... (existing message parsing)
                // Determine Type
                const msgType = msg.type;
                if (msgType === 'text') {
                    eventData.text = msg.text?.body || "";
                    eventData.type = 'text';
                } else if (msgType === 'image') {
                    eventData.type = 'image';
                    eventData.media_url = msg.image?.id;
                    eventData.media_type = msg.image?.mime_type;
                    eventData.text = msg.image?.caption || "[Photo]";
                } else if (msgType === 'video') {
                    eventData.type = 'video';
                    eventData.media_url = msg.video?.id;
                    eventData.media_type = msg.video?.mime_type;
                    eventData.text = msg.video?.caption || "[Video]";
                } else if (msgType === 'document') {
                    eventData.type = 'document';
                    eventData.media_url = msg.document?.id;
                    eventData.media_type = msg.document?.mime_type;
                    eventData.text = msg.document?.caption || msg.document?.filename || "[Document]";
                } else if (msgType === 'audio' || msgType === 'voice') {
                    eventData.type = 'audio';
                    eventData.media_url = (msg.audio || msg.voice)?.id;
                    eventData.media_type = (msg.audio || msg.voice)?.mime_type;
                    eventData.text = "[Audio]";
                } else {
                    eventData.text = `[${msgType}]`;
                    eventData.type = 'text';
                }

                recipientId = changes.metadata?.phone_number_id;
                channel = 'whatsapp';

            } else if (messaging) {
                // Instagram Logic

                // FILTER: Ignore Echoes (Messages sent by us)
                if (messaging.message?.is_echo) {
                    console.log("Ignoring Instagram Echo message");
                    continue;
                }

                // FILTER: Ignore Delivery/Read Watermarks
                if (messaging.delivery || messaging.read) {
                    console.log("Ignoring Instagram delivery/read");
                    continue;
                }

                eventData.external_msg_id = messaging.message?.mid;
                eventData.sender_id = messaging.sender?.id;
                eventData.timestamp = messaging.timestamp;

                // Check attachments
                const attachments = messaging.message?.attachments;
                if (attachments && attachments.length > 0) {
                    const att = attachments[0];
                    eventData.type = att.type;
                    eventData.media_url = att.payload?.url;
                    eventData.text = "[Media]";
                } else {
                    eventData.text = messaging.message?.text || "";
                    eventData.type = 'text';
                }

                recipientId = messaging.recipient?.id;
                channel = 'instagram';
            }

            // FINAL SAFETY CHECK: Don't insert empty junk
            if (!eventData || !recipientId || (!eventData.text && !eventData.media_url)) {
                console.log("Skipping invalid/empty event payload");
                continue;
            }

            // 1. Find Tenant (AND Get Access Token)
            let tenantId = null;
            let accessToken = null;

            if (channel === 'instagram') {
                // ... instagram logic ...
                // Keep existing logic but add logs if needed
                const { data: conn } = await supabaseAdmin
                    .from("channel_connections")
                    .select("tenant_id, access_token_encrypted")
                    .eq("channel", "instagram")
                    .contains("meta_identifiers", { ig_user_id: recipientId })
                    .maybeSingle();

                if (conn) {
                    tenantId = conn.tenant_id;
                    accessToken = conn.access_token_encrypted;

                    // FETCH PROFILE
                    if (accessToken && eventData.sender_id) {
                        try {
                            const igProfileUrl = `https://graph.facebook.com/v21.0/${eventData.sender_id}?fields=username,name&access_token=${accessToken}`;
                            const profileRes = await fetch(igProfileUrl);
                            const profileData = await profileRes.json();
                            if (profileData.username) {
                                eventData.sender_name = profileData.username; // Prefer username for IG
                            }
                        } catch (e) {
                            console.error("Failed to fetch IG profile:", e);
                        }
                    }
                }
            } else {
                // WhatsApp
                console.log("[Meta Webhook] Searching for tenant with phone_id:", recipientId);

                // Try finding by exact phone_number_id
                let { data: connection } = await supabaseAdmin
                    .from("channel_connections")
                    .select("tenant_id, access_token_encrypted")
                    .eq("channel", "whatsapp")
                    .contains("meta_identifiers", { phone_number_id: recipientId })
                    .maybeSingle();

                // If not found, try 'mock_id' (legacy/fallback)
                if (!connection) {
                    const { data: connection2 } = await supabaseAdmin
                        .from("channel_connections")
                        .select("tenant_id, access_token_encrypted")
                        .eq("channel", "whatsapp")
                        .contains("meta_identifiers", { mock_id: recipientId })
                        .maybeSingle();
                    connection = connection2;
                }

                if (connection) {
                    tenantId = connection.tenant_id;
                    accessToken = connection.access_token_encrypted;
                    console.log("[Meta Webhook] Found tenant:", tenantId);
                } else {
                    console.log("[Meta Webhook] Tenant NOT found for phone_id:", recipientId);
                }
            }

            if (!tenantId) {
                console.log("Tenant not found for recipient:", recipientId);
                continue;
            }

            // --- PROCESS MEDIA IF NEEDED ---
            if (eventData.media_url && accessToken) {
                // For WhatsApp: media_url is currently an ID.
                // For Instagram: media_url is currently a URL (CDN).
                // Our utility handles both, but knows that WA needs fetching.

                // Import lazily or use the one imported at top if I update imports
                const { processIncomingMedia } = await import("@/lib/meta"); // Dynamic import to avoid circular dep issues if any

                const permanentUrl = await processIncomingMedia(tenantId, eventData.media_url, channel as 'whatsapp' | 'instagram', accessToken);

                if (permanentUrl) {
                    console.log(`[Meta Webhook] Replaced raw media with permanent URL: ${permanentUrl}`);
                    eventData.media_url = permanentUrl;
                } else {
                    console.warn("[Meta Webhook] Failed to process media, falling back to raw (likely broken for WA)");
                }
            }


            // 2. Find/Create Conversation
            let { data: conversation } = await supabaseAdmin
                .from("conversations")
                .select("*")
                .match({ tenant_id: tenantId, channel: channel, external_thread_id: eventData.sender_id })
                .maybeSingle();

            // Decided Handle Name
            let handleToUse = eventData.sender_name || eventData.sender_id;

            // WhatsApp Formatting: Name (Number)
            if (channel === 'whatsapp' && eventData.sender_name) {
                handleToUse = `${eventData.sender_name} (+${eventData.sender_id})`;
            }

            if (!conversation) {
                // Fetch settings to determine initial mode
                const { data: settings } = await supabaseAdmin
                    .from("agent_settings")
                    .select("ai_operational_enabled")
                    .eq("tenant_id", tenantId)
                    .single();

                const initialMode = settings?.ai_operational_enabled ? 'BOT' : 'HUMAN';

                const { data: newConv } = await supabaseAdmin
                    .from("conversations")
                    .insert({
                        tenant_id: tenantId,
                        channel: channel,
                        external_thread_id: eventData.sender_id,
                        customer_handle: handleToUse,
                        mode: initialMode
                    })
                    .select()
                    .single();
                conversation = newConv;
            } else {
                // UPDATE if name is better (and wasn't set before or was just ID)
                // We check if current handle is just the ID, or if we want to enable syncing always.
                // Usually syncing always is fine as long as name isn't null.
                if (eventData.sender_name) {
                    // Re-calculate desired handle to ensure it matches current format preference
                    let desiredHandle = eventData.sender_name;
                    if (channel === 'whatsapp') {
                        desiredHandle = `${eventData.sender_name} (+${eventData.sender_id})`;
                    }

                    if (conversation.customer_handle !== desiredHandle) {
                        await supabaseAdmin
                            .from("conversations")
                            .update({ customer_handle: desiredHandle })
                            .eq("id", conversation.id);
                    }
                }
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
                    external_message_id: eventData.external_msg_id,
                    message_type: eventData.type,
                    media_url: eventData.media_url,
                    media_type: eventData.media_type
                });

            if (msgError && msgError.code !== '23505') {
                console.error("Message insert error", msgError);
            }

            // 3.5 Update Conversation 'updated_at' to bring it to top
            await supabaseAdmin
                .from("conversations")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", conversation.id);

            // 4. n8n Trigger Logic
            const { data: settings } = await supabaseAdmin
                .from("agent_settings")
                .select("*")
                .eq("tenant_id", tenantId)
                .single();

            let n8nStatus = "SKIPPED";
            let skipReason = "";

            if (!settings?.ai_operational_enabled) skipReason = "AI Disabled in Settings";
            else if (!settings?.n8n_webhook_url) skipReason = "No Webhook URL";
            else if (conversation?.mode !== 'BOT') skipReason = `Conversation Mode is ${conversation?.mode}`;

            if (!skipReason) {
                try {
                    console.log(`[n8n] Triggering webhook: ${settings.n8n_webhook_url}`);
                    const response = await fetch(settings.n8n_webhook_url, {
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

                    if (response.ok) {
                        n8nStatus = "SUCCESS";
                    } else {
                        n8nStatus = `FAILED (${response.status})`;
                        console.error(`[n8n] Webhook failed with status: ${response.status}`);
                    }
                } catch (e: any) {
                    console.error("n8n Trigger Failed", e);
                    n8nStatus = `ERROR: ${e.message}`;
                }
            } else {
                n8nStatus = `SKIPPED: ${skipReason}`;
            }

            // Update Log if we captured the ID (Need to change L42 to return ID first)
            // Since L42 doesn't return ID currently, let's just do a fire-and-forget log update for debugging
            // For now, I will just log to console as Vercel logs are the primary source for the user if they check.
            // But to be helpful, I'll insert a NEW log specifically for n8n attempt if it fails.

            if (n8nStatus !== "SUCCESS") {
                await supabaseAdmin.from("webhook_logs").insert({
                    body: {
                        event: "n8n_trigger_attempt",
                        status: n8nStatus,
                        tenant_id: tenantId,
                        settings: settings,
                        conversation_mode: conversation?.mode
                    },
                    error_message: n8nStatus
                });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Webhook Error", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 200 });
    }
}
