
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

            // FINAL SAFETY CHECK
            if (!eventData || !recipientId || (!eventData.text && !eventData.media_url)) {
                console.log("Skipping invalid/empty event payload");
                continue;
            }

            // 1. Find Tenant (AND Get Access Token)
            let tenantId = null;
            let accessToken = null;

            if (channel === 'instagram') {
                const { data: conn } = await supabaseAdmin
                    .from("channel_connections")
                    .select("tenant_id, access_token_encrypted")
                    .eq("channel", "instagram")
                    .contains("meta_identifiers", { ig_user_id: recipientId })
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (conn) {
                    tenantId = conn.tenant_id;
                    accessToken = conn.access_token_encrypted;

                    if (accessToken && eventData.sender_id) {
                        try {
                            const igProfileUrl = `https://graph.facebook.com/v21.0/${eventData.sender_id}?fields=username,name,profile_pic&access_token=${accessToken}`;
                            const profileRes = await fetch(igProfileUrl);
                            const profileData = await profileRes.json();
                            if (profileData.username) {
                                eventData.sender_name = profileData.username;
                            }
                            // Download profile pic to Supabase Storage for permanent URL
                            if (profileData.profile_pic) {
                                try {
                                    const { uploadProfilePic } = await import("@/lib/meta");
                                    const permanentUrl = await uploadProfilePic(eventData.sender_id, profileData.profile_pic);
                                    if (permanentUrl) {
                                        (eventData as any).profile_pic = permanentUrl;
                                    } else {
                                        // Fallback to CDN URL if upload fails
                                        (eventData as any).profile_pic = profileData.profile_pic;
                                    }
                                } catch (uploadErr) {
                                    console.error("Failed to upload profile pic:", uploadErr);
                                    (eventData as any).profile_pic = profileData.profile_pic;
                                }
                            }
                        } catch (e) {
                            console.error("Failed to fetch IG profile:", e);
                        }
                    }
                }
            } else {
                let { data: connection } = await supabaseAdmin
                    .from("channel_connections")
                    .select("tenant_id, access_token_encrypted")
                    .eq("channel", "whatsapp")
                    .contains("meta_identifiers", { phone_number_id: recipientId })
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (!connection) {
                    const { data: connection2 } = await supabaseAdmin
                        .from("channel_connections")
                        .select("tenant_id, access_token_encrypted")
                        .eq("channel", "whatsapp")
                        .contains("meta_identifiers", { mock_id: recipientId })
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();
                    connection = connection2;
                }

                if (connection) {
                    tenantId = connection.tenant_id;
                    accessToken = connection.access_token_encrypted;
                }
            }

            if (!tenantId) {
                console.log("Tenant not found for recipient:", recipientId);
                continue;
            }

            // --- PROCESS MEDIA IF NEEDED ---
            if (eventData.media_url && accessToken) {
                const { processIncomingMedia } = await import("@/lib/meta");
                const permanentUrl = await processIncomingMedia(tenantId, eventData.media_url, channel as 'whatsapp' | 'instagram', accessToken);

                if (permanentUrl) {
                    eventData.media_url = permanentUrl;
                }
            }

            // 2. Find/Create Conversation
            let { data: conversation } = await supabaseAdmin
                .from("conversations")
                .select("*")
                .match({ tenant_id: tenantId, channel: channel, external_thread_id: eventData.sender_id })
                .maybeSingle();

            let handleToUse = eventData.sender_name || eventData.sender_id;
            if (channel === 'whatsapp' && eventData.sender_name) {
                handleToUse = `${eventData.sender_name} (+${eventData.sender_id})`;
            }

            const currentProfilePic = (eventData as any).profile_pic || null;

            if (!conversation) {
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
                        mode: initialMode,
                        profile_pic: currentProfilePic
                    })
                    .select()
                    .single();
                conversation = newConv;
            } else {
                const updates: any = {};
                let needsUpdate = false;

                if (eventData.sender_name) {
                    let desiredHandle = eventData.sender_name;
                    if (channel === 'whatsapp') {
                        desiredHandle = `${eventData.sender_name} (+${eventData.sender_id})`;
                    }
                    if (conversation.customer_handle !== desiredHandle) {
                        updates.customer_handle = desiredHandle;
                        needsUpdate = true;
                    }
                }

                if (currentProfilePic && conversation.profile_pic !== currentProfilePic) {
                    updates.profile_pic = currentProfilePic;
                    needsUpdate = true;
                }

                if (needsUpdate) {
                    await supabaseAdmin
                        .from("conversations")
                        .update(updates)
                        .eq("id", conversation.id);
                }
            }

            // 3. Insert USER Message
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

            if (msgError) {
                if (msgError.code === '23505') {
                    console.log(`[Webhook] Duplicate message ID ${eventData.external_msg_id}, skipping AI trigger.`);
                    continue; // Skip n8n and rest of loop for this entry
                }
                console.error("Message insert error", msgError);
            }

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

            // RE-FETCH FRESH MODE: Ensure we don't trigger AI if user just switched to HUMAN
            const { data: freshConv } = await supabaseAdmin
                .from("conversations")
                .select("mode")
                .eq("id", conversation.id)
                .single();

            const currentRealMode = freshConv?.mode || conversation.mode;

            let n8nStatus = "SKIPPED";
            let skipReason = "";

            if (!settings?.ai_operational_enabled) skipReason = "AI Disabled";
            else if (!settings?.n8n_webhook_url) skipReason = "No Webhook URL";
            else if (currentRealMode !== 'BOT') skipReason = `Mode is ${currentRealMode}`;

            if (!skipReason) {
                try {
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

                        // --- HANDLE n8n RESPONSE ---
                        try {
                            const resJson = await response.json();
                            let replyText = "";

                            if (Array.isArray(resJson)) {
                                replyText = resJson[0]?.output || resJson[0]?.text || resJson[0]?.message;
                            } else {
                                replyText = resJson.output || resJson.text || resJson.message;
                            }

                            // CHECK FOR SPAM / DEFAULT RESPONSE
                            if (replyText && replyText !== "Workflow was started") {
                                console.log(`[n8n] Received Reply: ${replyText.substring(0, 50)}...`);

                                await supabaseAdmin
                                    .from("messages")
                                    .insert({
                                        tenant_id: tenantId,
                                        conversation_id: conversation.id,
                                        direction: 'OUT',
                                        sender: 'BOT',
                                        text: replyText, // Verified content
                                        message_type: 'text',
                                        is_read: true
                                    });

                                const { sendToChannel } = await import("@/lib/meta");
                                await sendToChannel(
                                    tenantId,
                                    channel as "whatsapp" | "instagram",
                                    eventData.sender_id,
                                    replyText
                                );
                            } else if (replyText === "Workflow was started") {
                                console.warn("[n8n] Workflow returned default 'Workflow was started' message. Ignoring.");
                                n8nStatus = "SUCCESS_BUT_NO_OUTPUT_CONFIGURED";
                            }
                        } catch (parseError) {
                            console.warn("[n8n] Could not parse response JSON", parseError);
                        }
                    } else {
                        n8nStatus = `FAILED (${response.status})`;
                    }
                } catch (e: any) {
                    n8nStatus = `ERROR: ${e.message}`;
                }
            } else {
                n8nStatus = `SKIPPED: ${skipReason}`;
            }

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

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 200 });
    }
}
