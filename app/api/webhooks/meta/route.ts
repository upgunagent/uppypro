
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { processWithBuiltInAI } from "@/lib/ai/agent";

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "uppypro_verify_token";
const GOOGLE_CLOUD_API_KEY = process.env.GOOGLE_CLOUD_API_KEY || "";

// Cooldown map: conversation_id → last error message sent timestamp
// Prevents sending repeated error messages to the same customer
const lastErrorMessageSent = new Map<string, number>();
const ERROR_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const FALLBACK_ERROR_MESSAGE = "Şu anda geçici bir teknik sorun yaşıyoruz. Lütfen yaklaşık 5 dakika bekleyip son mesajınızı tekrar gönderir misiniz? Anlayışınız için teşekkür ederiz 🙏";

// Normalize phone number: strip all non-digits, ensure consistent format
function normalizePhone(phone: string): string {
    // Remove all non-digit characters
    let digits = phone.replace(/\D/g, '');
    // If starts with 0 (Turkish local format like 05xx), remove leading 0 and add 90
    if (digits.startsWith('0') && digits.length === 11) {
        digits = '9' + digits; // 05332076252 -> 905332076252
    }
    // If it's 10 digits (no country code), assume Turkish
    if (digits.length === 10 && digits.startsWith('5')) {
        digits = '90' + digits; // 5332076252 -> 905332076252
    }
    return digits;
}

// Google Cloud Speech-to-Text: Transcribe audio to text
async function transcribeAudio(audioUrl: string, mimeType: string | null): Promise<string | null> {
    if (!GOOGLE_CLOUD_API_KEY) {
        console.log("[STT] No GOOGLE_CLOUD_API_KEY configured, skipping transcription");
        return null;
    }

    try {
        // 1. Download audio file
        const audioRes = await fetch(audioUrl);
        if (!audioRes.ok) {
            console.error("[STT] Failed to download audio:", audioRes.status);
            return null;
        }

        const buffer = await audioRes.arrayBuffer();
        const audioBytes = Buffer.from(buffer);

        // Skip if audio is too large (>10MB) or too small
        if (audioBytes.byteLength > 10 * 1024 * 1024) {
            console.log("[STT] Audio too large, skipping transcription");
            return null;
        }
        if (audioBytes.byteLength < 100) {
            console.log("[STT] Audio too small, skipping transcription");
            return null;
        }

        const base64Audio = audioBytes.toString('base64');

        // 2. Determine encoding based on mime type
        let encoding = "OGG_OPUS"; // Default for WhatsApp
        let sampleRateHertz = 16000;

        if (mimeType) {
            const mime = mimeType.toLowerCase();
            if (mime.includes('ogg') || mime.includes('opus')) {
                encoding = "OGG_OPUS";
                sampleRateHertz = 16000;
            } else if (mime.includes('mp4') || mime.includes('m4a') || mime.includes('aac')) {
                encoding = "MP3"; // Google STT handles MP4/AAC under MP3
                sampleRateHertz = 16000;
            } else if (mime.includes('mp3') || mime.includes('mpeg')) {
                encoding = "MP3";
                sampleRateHertz = 16000;
            } else if (mime.includes('webm')) {
                encoding = "WEBM_OPUS";
                sampleRateHertz = 16000;
            } else if (mime.includes('wav')) {
                encoding = "LINEAR16";
                sampleRateHertz = 16000;
            }
        }

        // 3. Call Google Speech-to-Text API
        const sttResponse = await fetch(
            `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_CLOUD_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    config: {
                        encoding,
                        sampleRateHertz,
                        languageCode: "tr-TR",
                        alternativeLanguageCodes: ["en-US", "de-DE", "ar-SA"],
                        model: "default",
                        enableAutomaticPunctuation: true
                    },
                    audio: {
                        content: base64Audio
                    }
                })
            }
        );

        if (!sttResponse.ok) {
            const errText = await sttResponse.text();
            console.error("[STT] API error:", sttResponse.status, errText);
            return null;
        }

        const sttResult = await sttResponse.json();
        const transcript = sttResult.results
            ?.map((r: any) => r.alternatives?.[0]?.transcript)
            .filter(Boolean)
            .join(" ");

        if (transcript) {
            console.log(`[STT] Transcription successful: "${transcript.substring(0, 50)}..."`);
            return transcript;
        }

        console.log("[STT] No transcription result");
        return null;
    } catch (error) {
        console.error("[STT] Transcription failed:", error);
        return null;
    }
}

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
                media_type: null as string | null,
                payload: null as any
            };
            let channel: 'whatsapp' | 'instagram' = 'whatsapp';
            let recipientId = null; // To find tenant

            // PROCESS Status Updates (WhatsApp) for Campaign/Message Logs
            if (changes?.statuses) {
                const statusObj = changes.statuses[0];
                if (statusObj && statusObj.id) {
                    const messageId = statusObj.id; // Meta Message ID
                    const msgStatus = statusObj.status; // 'sent', 'delivered', 'read', 'failed'

                    let updatePayload: any = { status: msgStatus };

                    if (msgStatus === 'delivered') updatePayload.delivered_at = new Date().toISOString();
                    if (msgStatus === 'read') updatePayload.read_at = new Date().toISOString();
                    if (msgStatus === 'failed') {
                        updatePayload.error_message = JSON.stringify(statusObj.errors);
                        updatePayload.failed_at = new Date().toISOString();
                    }

                    // 1. Update Campaign Logs
                    await supabaseAdmin.from('customer_campaign_logs')
                        .update(updatePayload)
                        .eq('meta_message_id', messageId);

                    // 2. Update Direct Messages
                    await supabaseAdmin.from('messages')
                        .update({
                            status: msgStatus,
                            ...(msgStatus === 'read' ? { is_read: true } : {})
                        })
                        .eq('external_message_id', messageId);
                }
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

                // Handle Reactions separately (don't create a new message)
                const msgType = msg.type;
                if (msgType === 'reaction') {
                    const reactionEmoji = msg.reaction?.emoji || null;
                    const reactedMsgId = msg.reaction?.message_id;
                    if (reactedMsgId) {
                        const recipientIdForReaction = changes.metadata?.phone_number_id;
                        if (reactionEmoji) {
                            // Add/Update reaction on the original message
                            await supabaseAdmin.from('messages')
                                .update({ reactions: { emoji: reactionEmoji, sender_id: msg.from } })
                                .eq('external_message_id', reactedMsgId);
                        } else {
                            // Empty emoji = reaction removed
                            await supabaseAdmin.from('messages')
                                .update({ reactions: null })
                                .eq('external_message_id', reactedMsgId);
                        }
                    }
                    continue; // Don't create a new message for reactions
                }

                // Determine Type
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
                } else if (msgType === 'location') {
                    eventData.type = 'location';
                    eventData.text = msg.location?.name || msg.location?.address || "[Konum]";
                    eventData.payload = {
                        latitude: msg.location?.latitude,
                        longitude: msg.location?.longitude,
                        name: msg.location?.name,
                        address: msg.location?.address,
                        url: msg.location?.url
                    };
                } else if (msgType === 'button') {
                    eventData.text = msg.button?.text || "[Buton Yanıtı]";
                    eventData.type = 'text';
                } else if (msgType === 'interactive') {
                    if (msg.interactive?.type === 'button_reply') {
                        eventData.text = msg.interactive.button_reply?.title || "[Buton Yanıtı]";
                    } else if (msg.interactive?.type === 'list_reply') {
                        eventData.text = msg.interactive.list_reply?.title || "[Liste Yanıtı]";
                    } else {
                        eventData.text = "[Etkileşimli Mesaj]";
                    }
                    eventData.type = 'text';
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

                // Process Delivery/Read Watermarks or Reactions
                if (messaging.delivery || messaging.read || messaging.reaction) {
                    // WE MUST FIND THE TENANT FIRST. ONE IG USER CAN TALK TO MULTIPLE TENANTS!
                    const recipientIdForTenant = messaging.recipient?.id;
                    let tenantIdForEvents = null;

                    if (recipientIdForTenant) {
                        // Try ig_user_id first
                        let { data: conn } = await supabaseAdmin
                            .from("channel_connections")
                            .select("tenant_id")
                            .eq("channel", "instagram")
                            .contains("meta_identifiers", { ig_user_id: recipientIdForTenant })
                            .order('created_at', { ascending: false })
                            .limit(1)
                            .maybeSingle();
                        
                        // Fallback: try page_id (IGSID can differ from ig_user_id)
                        if (!conn) {
                            const { data: conn2 } = await supabaseAdmin
                                .from("channel_connections")
                                .select("tenant_id")
                                .eq("channel", "instagram")
                                .eq("status", "connected")
                                .order('created_at', { ascending: false })
                                .limit(1)
                                .maybeSingle();
                            conn = conn2;
                        }
                        if (conn) tenantIdForEvents = conn.tenant_id;
                    }

                    if (!tenantIdForEvents) {
                        console.log("Could not find tenant for IG event (read/delivery/reaction), ignoring.");
                        continue;
                    }

                    if (messaging.delivery?.mids) {
                        for (const mid of messaging.delivery.mids) {
                            await supabaseAdmin.from('messages')
                                .update({ status: 'delivered' })
                                .eq('external_message_id', mid);
                            await supabaseAdmin.from('customer_campaign_logs')
                                .update({ status: 'delivered', delivered_at: new Date().toISOString() })
                                .eq('meta_message_id', mid);
                        }
                    }

                    if (messaging.read) {
                        const mid = messaging.read.mid;
                        const senderId = messaging.sender?.id; // IG User who read the message

                        if (mid) {
                            await supabaseAdmin.from('messages')
                                .update({ status: 'read', is_read: true })
                                .eq('external_message_id', mid);
                        }

                        // Her zaman senderId (mesajlaşan kullanıcı) bazlı konuşma bulup, okunmamış tüm dışarı giden mesajları "okundu" yap.
                        // Meta webhook'larında mid uyuşmazlığı olabiliyor.
                        if (senderId) {
                            const { data: conv } = await supabaseAdmin.from('conversations')
                                .select('id')
                                .eq('external_thread_id', senderId)
                                .eq('channel', 'instagram')
                                .eq('tenant_id', tenantIdForEvents) // FIX: EXACT MATCH
                                .maybeSingle();

                            if (conv) {
                                await supabaseAdmin.from('messages')
                                    .update({ status: 'read', is_read: true })
                                    .eq('conversation_id', conv.id)
                                    .eq('direction', 'OUT')
                                    .eq('is_read', false);
                            }
                        }
                    }

                    // Process Reactions
                    if (messaging.reaction) {
                        const reactionData = messaging.reaction;
                        const reactedMsgId = reactionData.mid;

                        if (reactedMsgId) {
                            if (reactionData.action === 'react' && reactionData.emoji) {
                                await supabaseAdmin.from('messages')
                                    .update({ reactions: { emoji: reactionData.emoji, sender_id: messaging.sender?.id } })
                                    .eq('external_message_id', reactedMsgId);
                            } else if (reactionData.action === 'unreact') {
                                await supabaseAdmin.from('messages')
                                    .update({ reactions: null })
                                    .eq('external_message_id', reactedMsgId);
                            }
                        }
                    }
                    continue;
                }

                eventData.external_msg_id = messaging.message?.mid;
                eventData.sender_id = messaging.sender?.id;
                eventData.timestamp = messaging.timestamp;

                // Check attachments
                const attachments = messaging.message?.attachments;
                const rawText = messaging.message?.text || "";

                if (attachments && attachments.length > 0) {
                    const att = attachments[0];

                    if (att.type === 'fallback') {
                        // 'fallback' attachments are auto-generated by Instagram for phone numbers, links, etc.
                        // They are NOT actual media files.
                        // If there is NO rawText, this is a duplicate auto-generated message (e.g. phone call button)
                        // that Instagram sends separately from the original user message — SKIP IT.
                        if (!rawText) {
                            console.log("[Webhook] Skipping Instagram fallback-only attachment (phone/link button), no user text.");
                            continue;
                        }
                        // If there IS rawText, the user typed a message containing a phone number/link
                        // — process it as text.
                        eventData.text = rawText;
                        eventData.type = 'text';
                        eventData.media_url = null; // No actual media
                    } else if (att.type === 'image' || att.type === 'video' || att.type === 'audio' || att.type === 'file') {
                        // Real media attachment
                        eventData.type = att.type === 'file' ? 'document' : att.type;
                        eventData.media_url = att.payload?.url;
                        eventData.text = rawText || "[Media]";
                    } else if (att.type === 'share' || att.type === 'story_mention' || att.type === 'story_reply' || att.type === 'ig_reel') {
                        // Instagram share/story/reel attachments — NOT actual media for AI to process
                        if (rawText) {
                            eventData.text = rawText;
                            eventData.type = 'text';
                            eventData.media_url = null;
                        } else {
                            console.log(`[Webhook] Skipping Instagram ${att.type} attachment with no user text.`);
                            continue;
                        }
                    } else {
                        // Unknown attachment type — treat as text only, never as media
                        console.log(`[Webhook] Unknown Instagram attachment type: ${att.type}, treating as text.`);
                        eventData.type = 'text';
                        eventData.media_url = null;
                        eventData.text = rawText || `[${att.type}]`;
                    }
                } else {
                    eventData.text = rawText;
                    eventData.type = 'text';
                }

                recipientId = messaging.recipient?.id;
                channel = 'instagram';
            }

            // ═══ FILTER: Instagram auto-generated junk messages ═══
            // Instagram sends '[template]' for phone buttons, '[Sticker]' etc.
            // These are NOT real user messages and should be completely ignored.
            const junkPatterns = ['[template]', '[sticker]', '[reel]', '[story]'];
            const textLower = (eventData.text || '').trim().toLowerCase();
            if (junkPatterns.includes(textLower) || (textLower.startsWith('[') && textLower.endsWith(']') && textLower.length < 20)) {
                console.log(`[Webhook] Skipping Instagram auto-generated message: "${eventData.text}"`);
                continue;
            }
            if (!eventData || !recipientId || (!eventData.text && !eventData.media_url)) {
                console.log("Skipping invalid/empty event payload");
                continue;
            }

            // 1. Find Tenant (AND Get Access Token)
            let tenantId = null;
            let accessToken = null;

            if (channel === 'instagram') {
                // Try matching by ig_user_id first
                let { data: conn } = await supabaseAdmin
                    .from("channel_connections")
                    .select("tenant_id, access_token_encrypted, meta_identifiers")
                    .eq("channel", "instagram")
                    .contains("meta_identifiers", { ig_user_id: recipientId })
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                // Fallback: If ig_user_id doesn't match, search all connected IG accounts
                // This handles cases where IGSID (recipient) differs from ig_user_id (OAuth)
                if (!conn) {
                    console.log(`[Webhook] ig_user_id match failed for ${recipientId}, trying fallback...`);
                    const { data: conn2 } = await supabaseAdmin
                        .from("channel_connections")
                        .select("tenant_id, access_token_encrypted, meta_identifiers")
                        .eq("channel", "instagram")
                        .eq("status", "connected")
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();
                    conn = conn2;

                    // Update the stored ig_user_id so future lookups work directly
                    if (conn && recipientId) {
                        console.log(`[Webhook] Updating ig_user_id for tenant ${conn.tenant_id}: ${conn.meta_identifiers?.ig_user_id} -> ${recipientId}`);
                        const updatedMeta = { ...conn.meta_identifiers, ig_user_id: recipientId, ig_id: recipientId };
                        await supabaseAdmin
                            .from("channel_connections")
                            .update({ meta_identifiers: updatedMeta })
                            .eq("tenant_id", conn.tenant_id)
                            .eq("channel", "instagram");
                    }
                }

                if (conn) {
                    tenantId = conn.tenant_id;
                    accessToken = conn.access_token_encrypted;

                    if (accessToken && eventData.sender_id) {
                        try {
                            const igProfileUrl = `https://graph.facebook.com/v24.0/${eventData.sender_id}?fields=username,name,profile_pic&access_token=${accessToken}`;
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

            // --- TRANSCRIBE AUDIO IF NEEDED ---
            if (eventData.type === 'audio' && eventData.media_url) {
                const transcript = await transcribeAudio(eventData.media_url, eventData.media_type);
                if (transcript) {
                    eventData.text = `🎤 Sesli Mesaj: ${transcript}`;
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

                // --- AUTO-MATCH EXISTING CUSTOMER ---
                let matchedCustomerId: string | null = null;
                try {
                    if (channel === 'whatsapp' && eventData.sender_id) {
                        // WhatsApp: match by normalized phone number
                        const normalizedPhone = normalizePhone(eventData.sender_id);
                        const { data: customers } = await supabaseAdmin
                            .from("customers")
                            .select("id, phone")
                            .eq("tenant_id", tenantId)
                            .not("phone", "is", null);

                        if (customers) {
                            const match = customers.find(c => c.phone && normalizePhone(c.phone) === normalizedPhone);
                            if (match) {
                                matchedCustomerId = match.id;
                                console.log(`[Auto-Match] WhatsApp customer matched: ${match.id} (phone: ${normalizedPhone})`);
                            }
                        }
                    } else if (channel === 'instagram' && handleToUse) {
                        // Instagram: match by Instagram username
                        const igUsername = handleToUse.replace('@', '').toLowerCase();
                        const { data: customer } = await supabaseAdmin
                            .from("customers")
                            .select("id")
                            .eq("tenant_id", tenantId)
                            .ilike("instagram_username", igUsername)
                            .limit(1)
                            .maybeSingle();

                        if (customer) {
                            matchedCustomerId = customer.id;
                            console.log(`[Auto-Match] Instagram customer matched: ${customer.id} (ig: ${igUsername})`);
                        }
                    }
                } catch (matchErr) {
                    console.error("[Auto-Match] Error during customer matching:", matchErr);
                }

                const { data: newConv } = await supabaseAdmin
                    .from("conversations")
                    .insert({
                        tenant_id: tenantId,
                        channel: channel,
                        external_thread_id: eventData.sender_id,
                        customer_handle: handleToUse,
                        mode: initialMode,
                        profile_pic: currentProfilePic,
                        ...(matchedCustomerId ? { customer_id: matchedCustomerId } : {})
                    })
                    .select()
                    .single();
                conversation = newConv;

                if (matchedCustomerId) {
                    console.log(`[Auto-Match] Conversation ${newConv?.id} linked to customer ${matchedCustomerId}`);
                }
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

                // --- AUTO-MATCH FOR EXISTING CONVERSATIONS WITHOUT CUSTOMER ---
                if (!conversation.customer_id) {
                    try {
                        let matchedId: string | null = null;

                        if (channel === 'whatsapp' && eventData.sender_id) {
                            const normalizedPhone = normalizePhone(eventData.sender_id);
                            const { data: customers } = await supabaseAdmin
                                .from("customers")
                                .select("id, phone")
                                .eq("tenant_id", tenantId)
                                .not("phone", "is", null);

                            if (customers) {
                                const match = customers.find(c => c.phone && normalizePhone(c.phone) === normalizedPhone);
                                if (match) matchedId = match.id;
                            }
                        } else if (channel === 'instagram' && handleToUse) {
                            const igUsername = handleToUse.replace('@', '').toLowerCase();
                            const { data: customer } = await supabaseAdmin
                                .from("customers")
                                .select("id")
                                .eq("tenant_id", tenantId)
                                .ilike("instagram_username", igUsername)
                                .limit(1)
                                .maybeSingle();

                            if (customer) matchedId = customer.id;
                        }

                        if (matchedId) {
                            updates.customer_id = matchedId;
                            needsUpdate = true;
                            console.log(`[Auto-Match] Existing conversation ${conversation.id} linked to customer ${matchedId}`);
                        }
                    } catch (matchErr) {
                        console.error("[Auto-Match] Error matching existing conversation:", matchErr);
                    }
                }

                if (needsUpdate) {
                    await supabaseAdmin
                        .from("conversations")
                        .update(updates)
                        .eq("id", conversation.id);
                    
                    // Update local conversation object if customer was matched
                    if (updates.customer_id) {
                        conversation = { ...conversation, customer_id: updates.customer_id };
                    }
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
                    media_type: eventData.media_type,
                    payload: eventData.payload
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

            // 4. n8n Trigger Logic — Background processing via waitUntil
            // waitUntil keeps the serverless function alive after 200 OK is returned to Meta
            waitUntil(
                processAIResponseInBackground(
                    supabaseAdmin,
                    tenantId,
                    conversation,
                    eventData,
                    channel,
                    handleToUse,
                )
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 200 });
    }
}

/**
 * Background AI processing — runs after 200 OK is returned to Meta.
 * This prevents Meta webhook timeouts (20s limit) when n8n/AI takes 5-15s to respond.
 */
async function processAIResponseInBackground(
    supabaseAdmin: any,
    tenantId: string,
    conversation: any,
    eventData: {
        text: string;
        sender_id: string;
        sender_name: string | null;
        media_url: string | null;
        media_type: string | null;
        type: string;
    },
    channel: 'whatsapp' | 'instagram',
    handleToUse: string,
) {
    try {
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
        else if (currentRealMode !== 'BOT') skipReason = `Mode is ${currentRealMode}`;

        // Determine AI mode: built_in (Gemini), webhook (n8n), or disabled
        // Default to 'built_in' if ai_mode is not explicitly set (new tenants)
        const aiMode = settings?.ai_mode || (settings?.n8n_webhook_url ? 'webhook' : 'built_in');

        if (!skipReason && aiMode === 'disabled') {
            skipReason = "AI mode disabled";
        }
        if (!skipReason && aiMode === 'webhook' && !settings?.n8n_webhook_url) {
            skipReason = "No Webhook URL";
        }

        if (!skipReason) {
            // ═══════════════════════════════════════════════════════════
            // BUILT-IN MODE: Process with Gemini API directly
            // ═══════════════════════════════════════════════════════════
            if (aiMode === 'built_in') {
                try {
                    const replyText = await processWithBuiltInAI(
                        tenantId,
                        conversation,
                        eventData,
                        channel,
                        handleToUse
                    );

                    if (replyText) {
                        n8nStatus = "BUILT_IN_SUCCESS";
                        console.log(`[AI Agent] Built-in reply: ${replyText.substring(0, 50)}...`);

                        // Parse [SEND_PHOTO:resource_name] tags from AI response
                        const photoRegex = /\[SEND_PHOTO:(.+?)\]/g;
                        let photoMatch;
                        const photosToSend: string[] = [];
                        while ((photoMatch = photoRegex.exec(replyText)) !== null) {
                            photosToSend.push(photoMatch[1].trim());
                        }

                        // Parse [SEND_TOUR_PHOTO:tour_name] tags from AI response
                        const tourPhotoRegex = /\[SEND_TOUR_PHOTO:(.+?)\]/g;
                        let tourPhotoMatch;
                        const tourPhotosToSend: string[] = [];
                        while ((tourPhotoMatch = tourPhotoRegex.exec(replyText)) !== null) {
                            tourPhotosToSend.push(tourPhotoMatch[1].trim());
                        }

                        // Clean text: remove [SEND_PHOTO:...] and [SEND_TOUR_PHOTO:...] tags
                        const cleanText = replyText.replace(photoRegex, '').replace(tourPhotoRegex, '').replace(/\n{3,}/g, '\n\n').trim();

                        // Save clean text to messages table
                        if (cleanText) {
                            await supabaseAdmin
                                .from("messages")
                                .insert({
                                    tenant_id: tenantId,
                                    conversation_id: conversation.id,
                                    direction: 'OUT',
                                    sender: 'BOT',
                                    text: cleanText,
                                    message_type: 'text',
                                    is_read: true
                                });

                            const { sendToChannel } = await import("@/lib/meta");
                            const sendResult = await sendToChannel(
                                tenantId,
                                channel as "whatsapp" | "instagram",
                                eventData.sender_id,
                                cleanText
                            );

                            if (!sendResult.success) {
                                console.error(`[AI Agent] sendToChannel FAILED for ${channel}:`, sendResult.error, JSON.stringify(sendResult.data));
                            } else {
                                console.log(`[AI Agent] Message sent to ${channel} successfully`);
                            }
                        }

                        // Send photos as separate image messages
                        if (photosToSend.length > 0) {
                            try {
                                // Fetch tenant resources to find photo URLs
                                const { data: resources } = await supabaseAdmin
                                    .from("tenant_employees")
                                    .select("name, attributes")
                                    .eq("tenant_id", tenantId);


                                const { sendToChannel } = await import("@/lib/meta");

                                for (const resourceName of photosToSend) {
                                    const resource = resources?.find(
                                        (r: any) => r.name.toLowerCase() === resourceName.toLowerCase()
                                    );
                                    const photoUrl = resource?.attributes?.cover_photo;

                                    if (photoUrl) {
                                        // Small delay to preserve message order
                                        await new Promise(resolve => setTimeout(resolve, 500));

                                        const caption = `📸 ${resource.name}`;
                                        await sendToChannel(
                                            tenantId,
                                            channel as "whatsapp" | "instagram",
                                            eventData.sender_id,
                                            caption,
                                            'image',
                                            photoUrl
                                        );

                                        // Save photo message to DB
                                        await supabaseAdmin
                                            .from("messages")
                                            .insert({
                                                tenant_id: tenantId,
                                                conversation_id: conversation.id,
                                                direction: 'OUT',
                                                sender: 'BOT',
                                                text: caption,
                                                message_type: 'image',
                                                media_url: photoUrl,
                                                is_read: true
                                            });

                                        console.log(`[AI Agent] Sent cover photo for: ${resourceName}`);
                                    } else {
                                        console.warn(`[AI Agent] No cover photo found for resource: ${resourceName}`);
                                    }
                                }
                            } catch (photoErr: any) {
                                console.error("[AI Agent] Error sending resource photos:", photoErr.message);
                            }
                        }

                        // Send tour photos as separate image messages
                        if (tourPhotosToSend.length > 0) {
                            try {
                                // Fetch tenant tours to find photo URLs
                                const { data: tours } = await supabaseAdmin
                                    .from("tours")
                                    .select("name, cover_photo")
                                    .eq("tenant_id", tenantId)
                                    .eq("is_active", true);

                                const { sendToChannel } = await import("@/lib/meta");

                                for (const tourName of tourPhotosToSend) {
                                    const tour = tours?.find(
                                        (t: any) => t.name.toLowerCase() === tourName.toLowerCase()
                                    );
                                    const photoUrl = tour?.cover_photo;

                                    if (photoUrl) {
                                        await new Promise(resolve => setTimeout(resolve, 500));

                                        const caption = `📸 ${tour.name}`;
                                        await sendToChannel(
                                            tenantId,
                                            channel as "whatsapp" | "instagram",
                                            eventData.sender_id,
                                            caption,
                                            'image',
                                            photoUrl
                                        );

                                        await supabaseAdmin
                                            .from("messages")
                                            .insert({
                                                tenant_id: tenantId,
                                                conversation_id: conversation.id,
                                                direction: 'OUT',
                                                sender: 'BOT',
                                                text: caption,
                                                message_type: 'image',
                                                media_url: photoUrl,
                                                is_read: true
                                            });

                                        console.log(`[AI Agent] Sent cover photo for tour: ${tourName}`);
                                    } else {
                                        console.warn(`[AI Agent] No cover photo found for tour: ${tourName}`);
                                    }
                                }
                            } catch (tourPhotoErr: any) {
                                console.error("[AI Agent] Error sending tour photos:", tourPhotoErr.message);
                            }
                        }
                    } else {
                        n8nStatus = "BUILT_IN_NO_RESPONSE";
                    }
                } catch (e: any) {
                    n8nStatus = `BUILT_IN_ERROR: ${e.message}`;
                    console.error("[AI Agent] Built-in processing error:", e);

                    await sendFallbackErrorMessage(
                        supabaseAdmin, tenantId, conversation, channel, eventData.sender_id
                    );
                }
            }
            // ═══════════════════════════════════════════════════════════
            // WEBHOOK MODE: Forward to n8n (existing behavior)
            // ═══════════════════════════════════════════════════════════
            else if (aiMode === 'webhook') {
            try {
                // Convert image to base64 for AI vision analysis (only for images under 3MB)
                let imageBase64: string | null = null;
                let imageMimeType: string | null = null;
                const MAX_IMAGE_SIZE = 3 * 1024 * 1024; // 3MB

                if (eventData.media_url && eventData.type === 'image') {
                    try {
                        const imgRes = await fetch(eventData.media_url);
                        if (imgRes.ok) {
                            const buffer = await imgRes.arrayBuffer();
                            if (buffer.byteLength <= MAX_IMAGE_SIZE) {
                                imageBase64 = Buffer.from(buffer).toString('base64');
                                imageMimeType = imgRes.headers.get('content-type') || 'image/jpeg';
                                console.log(`[Webhook] Image converted to base64 (${(buffer.byteLength / 1024).toFixed(0)}KB)`);
                            } else {
                                console.log(`[Webhook] Image too large for base64 (${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB), skipping vision`);
                            }
                        }
                    } catch (imgErr) {
                        console.error('[Webhook] Failed to convert image to base64:', imgErr);
                    }
                }

                // --- FETCH CUSTOMER INFO FOR AI CONTEXT ---
                let customerInfo: any = null;
                if (conversation.customer_id) {
                    try {
                        const { data: customer } = await supabaseAdmin
                            .from("customers")
                            .select("id, full_name, phone, email, instagram_username, company_name")
                            .eq("id", conversation.customer_id)
                            .single();

                        if (customer) {
                            customerInfo = {
                                is_registered: true,
                                customer_id: customer.id,
                                full_name: customer.full_name || '',
                                phone: customer.phone || '',
                                email: customer.email || '',
                                instagram_username: customer.instagram_username || '',
                                company_name: customer.company_name || ''
                            };
                            console.log(`[Webhook] Customer info loaded for AI: ${customer.full_name}`);
                        }
                    } catch (custErr) {
                        console.error('[Webhook] Failed to fetch customer info:', custErr);
                    }
                }

                const response = await fetch(settings.n8n_webhook_url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: eventData.text,
                        conversation_id: conversation.id,
                        tenant_id: tenantId,
                        sender_id: eventData.sender_id,
                        sender_name: eventData.sender_name || handleToUse || '',
                        channel: channel,
                        // Send customer handle for Instagram username tracking
                        ...(channel === 'instagram' ? { instagram_username: handleToUse } : {}),
                        // Send media URL to n8n for reference
                        ...(eventData.media_url ? { image_url: eventData.media_url, media_type: eventData.type } : {}),
                        // Send base64 image data for AI vision (Gemini can directly analyze this)
                        ...(imageBase64 ? { image_base64: imageBase64, image_mime_type: imageMimeType } : {}),
                        // Send customer info for AI to recognize returning customers
                        ...(customerInfo ? { customer_info: customerInfo } : {})
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

                    // Send fallback error message to customer for server errors (5xx)
                    if (response.status >= 500) {
                        await sendFallbackErrorMessage(
                            supabaseAdmin, tenantId, conversation, channel, eventData.sender_id
                        );
                    }
                }
            } catch (e: any) {
                n8nStatus = `ERROR: ${e.message}`;

                // Send fallback error message on network/connection errors
                await sendFallbackErrorMessage(
                    supabaseAdmin, tenantId, conversation, channel, eventData.sender_id
                );
            }
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
    } catch (bgError: any) {
        console.error("[Webhook] Background AI processing error:", bgError);
        try {
            await supabaseAdmin.from("webhook_logs").insert({
                body: {
                    event: "n8n_background_error",
                    error: bgError.message,
                    tenant_id: tenantId,
                    conversation_id: conversation?.id
                },
                error_message: bgError.message
            });
        } catch (_) { /* ignore logging errors */ }
    }
}

/**
 * Send a fallback error message to the customer when n8n/AI fails.
 * Uses a cooldown to prevent spamming the same customer.
 */
async function sendFallbackErrorMessage(
    supabaseAdmin: any,
    tenantId: string,
    conversation: any,
    channel: 'whatsapp' | 'instagram',
    senderId: string,
) {
    try {
        const convId = conversation?.id;
        if (!convId) return;

        // Check cooldown — don't send if we sent one recently
        const lastSent = lastErrorMessageSent.get(convId);
        if (lastSent && Date.now() - lastSent < ERROR_COOLDOWN_MS) {
            console.log(`[Fallback] Cooldown active for conversation ${convId}, skipping error message`);
            return;
        }

        // Mark cooldown
        lastErrorMessageSent.set(convId, Date.now());

        // Send the fallback message to the customer via WhatsApp/Instagram
        const { sendToChannel } = await import("@/lib/meta");
        await sendToChannel(tenantId, channel, senderId, FALLBACK_ERROR_MESSAGE);

        // Save to messages table so it appears in the panel
        await supabaseAdmin.from("messages").insert({
            tenant_id: tenantId,
            conversation_id: convId,
            direction: 'OUT',
            sender: 'SYSTEM',
            text: FALLBACK_ERROR_MESSAGE,
            message_type: 'text',
            is_read: true,
        });

        console.log(`[Fallback] Error message sent to conversation ${convId}`);

        // Clean up old cooldown entries (prevent memory leak for long-running instances)
        const now = Date.now();
        for (const [key, timestamp] of lastErrorMessageSent.entries()) {
            if (now - timestamp > ERROR_COOLDOWN_MS * 2) {
                lastErrorMessageSent.delete(key);
            }
        }
    } catch (fallbackErr: any) {
        console.error("[Fallback] Failed to send error message:", fallbackErr.message);
    }
}
