
import { createAdminClient } from "@/lib/supabase/admin";

interface SendMessageResult {
    success: boolean;
    error?: string;
    data?: any;
}

export async function sendToChannel(
    tenantId: string,
    channel: "whatsapp" | "instagram",
    recipientId: string,
    text: string,
    type: string = 'text',
    mediaUrl?: string,
    filename?: string
): Promise<SendMessageResult> {
    const supabaseWithAdmin = createAdminClient();

    try {
        // 1. Get Connection Details (Token & Identifiers)
        const { data: connection, error } = await supabaseWithAdmin
            .from("channel_connections")
            .select("access_token_encrypted, meta_identifiers")
            .eq("tenant_id", tenantId)
            .eq("channel", channel)
            .eq("status", "connected")
            .single();

        if (error || !connection) {
            console.error(`[Meta Send] Connection not found for tenant: ${tenantId}, channel: ${channel}`);
            return { success: false, error: "Channel not connected" };
        }

        const accessToken = connection.access_token_encrypted; // In prod, decrypt this
        const identifiers = connection.meta_identifiers as any;

        if (!accessToken) {
            return { success: false, error: "Access token missing" };
        }

        let url = "";
        let body: any = {};

        // 2. Prepare Request based on Channel
        if (channel === "instagram") {
            // Instagram Send API: https://graph.facebook.com/v21.0/me/messages
            // Instagram primarily supports media via nested 'attachment' logic or specific endpoints?
            // Actually, Graph API for IG Send Message allows 'attachment' payload.

            url = `https://graph.facebook.com/v21.0/me/messages?access_token=${accessToken}`;

            if (type === 'text') {
                body = {
                    recipient: { id: recipientId },
                    message: { text: text }
                };
            } else if (mediaUrl) {
                // IG Media Template
                // Types: 'image', 'video', 'audio' (maybe?)
                // Note: 'audio' might not be fully supported on IG DM via API widely, but 'image'/'video' are.
                // Assuming 'image' or 'video' or 'file' mapped to what IG accepts.
                const igType = type === 'video' ? 'video' : type === 'audio' ? 'audio' : 'image';

                body = {
                    recipient: { id: recipientId },
                    message: {
                        attachment: {
                            type: igType,
                            payload: {
                                url: mediaUrl,
                                is_reusable: true
                            }
                        }
                    }
                };
            } else {
                // Fallback to text if mediaUrl missing
                body = {
                    recipient: { id: recipientId },
                    message: { text: text || "[Media]" }
                };
            }

        } else if (channel === "whatsapp") {
            // WhatsApp Send API: https://graph.facebook.com/v21.0/PHONE_NUMBER_ID/messages
            const phoneNumberId = identifiers?.phone_number_id;

            if (!phoneNumberId) {
                return { success: false, error: "WhatsApp Phone Number ID missing in connection" };
            }

            url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

            if (type === 'text') {
                body = {
                    messaging_product: "whatsapp",
                    recipient_type: "individual",
                    to: recipientId,
                    type: "text",
                    text: { body: text }
                };
            } else if (mediaUrl) {
                // WhatsApp Media Types: image, video, audio, document
                // Note: 'voice' is also a type but 'audio' is safer for general files.

                let waType = type === 'document' ? 'document' : type === 'video' ? 'video' : type === 'audio' ? 'audio' : 'image';

                // SPECIAL HANDLER: WhatsApp does not support .webm audio messages.
                // If we are sending an audio but it is .webm, we MUST send it as a document to ensure delivery.
                // We check both mediaUrl and filename to be sure.
                const isWebM = (mediaUrl && mediaUrl.includes('.webm')) || (filename && filename.endsWith('.webm'));

                if (type === 'audio' && isWebM) {
                    console.log("[Meta Send] Detected WebM Audio. Forcing 'document' type for WhatsApp compatibility.");
                    waType = 'document';
                    if (!filename) filename = "voice_message.webm";
                }

                body = {
                    messaging_product: "whatsapp",
                    recipient_type: "individual",
                    to: recipientId,
                    type: waType,
                    [waType]: {
                        link: mediaUrl,
                        // Add caption only for supported types (audio usually doesn't support caption in some versions, but standard image/video/doc do)
                        ...(waType !== 'audio' && text ? { caption: text } : {})
                    }
                };

                // If we forced it to be a document (or it was already), ensure filename is set
                if (waType === 'document' && body.document) {
                    body.document.filename = filename || "voice_note.bin"; // Fallback filename
                }

                console.log(`[Meta Send] WhatsApp Payload: Type=${waType}, Filename=${filename}`);
            } else {
                body = {
                    messaging_product: "whatsapp",
                    recipient_type: "individual",
                    to: recipientId,
                    type: "text",
                    text: { body: text || "[Media]" }
                };
            }
        } else {
            return { success: false, error: `Unsupported channel: ${channel}` };
        }

        // 3. Send Request
        const headers: any = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
        };

        const res = await fetch(url, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(body)
        });

        const data = await res.json();

        // LOG TO DB (Debugging)
        await supabaseWithAdmin.from("webhook_logs").insert({
            body: body, // Outgoing body
            headers: { url: url, response: data },
            error_message: !res.ok ? "OUTBOUND_ERROR" : "OUTBOUND_SUCCESS"
        });

        if (!res.ok || data.error) {
            console.error(`[Meta Send Error] ${JSON.stringify(data.error)}`);
            return { success: false, error: data.error?.message || "Meta API Error", data: data };
        }

        return { success: true, data: data };

    } catch (err: any) {
        console.error("[Meta Send Exception]", err);
        // Log exception too
        try {
            await supabaseWithAdmin.from("webhook_logs").insert({
                body: { error: err.message },
                error_message: "OUTBOUND_EXCEPTION"
            });
        } catch { } // ignore logging error
        return { success: false, error: err.message };
    }
}

export async function processIncomingMedia(
    tenantId: string,
    mediaId: string,
    channel: 'whatsapp' | 'instagram',
    accessToken: string
): Promise<string | null> {
    const supabaseWithAdmin = createAdminClient();

    try {
        let downloadUrl = "";

        if (channel === 'whatsapp') {
            // 1. Get Media URL using ID
            const metaUrl = `https://graph.facebook.com/v21.0/${mediaId}`;
            const metaRes = await fetch(metaUrl, {
                headers: { "Authorization": `Bearer ${accessToken}` }
            });
            const metaData = await metaRes.json();

            if (!metaData.url) {
                console.error("[Process Media] Failed to get media URL", metaData);
                return null;
            }
            downloadUrl = metaData.url;

        } else if (channel === 'instagram') {
            // For Instagram, the media_url in the webhook is usually public (CDN) for a short time
            // But sometimes it requires auth? Usually CDN urls are directly accessible.
            // If we passed the CDN url as mediaId effectively (logic in webhook might need adjustment), we just use it.
            // BUT, if we are passing an ID, we gotta fetch it.
            // Instagram Graphic API usually gives a CDN URL directly in the webhook 'attachments' payload.
            // So this function might just accept the URL for IG.
            // Let's assume for IG we might be passed a URL directly or an ID.
            // If it starts with http, treat as URL.
            if (mediaId.startsWith('http')) {
                downloadUrl = mediaId;
            } else {
                // It is an ID? (Usually not the case for IG Webhook attachments, they give payload.url)
                console.warn("[Process Media] Unexpected IG Media ID format:", mediaId);
                return null;
            }
        }

        console.log(`[Process Media] Downloading from: ${downloadUrl}`);

        // 2. Download Content
        const fileRes = await fetch(downloadUrl, {
            headers: { "Authorization": `Bearer ${accessToken}` }
        });

        if (!fileRes.ok) {
            console.error(`[Process Media] Download failed: ${fileRes.status}`);
            return null;
        }

        const buffer = await fileRes.arrayBuffer();
        const contentType = fileRes.headers.get("content-type") || "application/octet-stream";

        // 3. Determine Extension
        let ext = "bin";
        if (contentType.includes("image/jpeg")) ext = "jpg";
        else if (contentType.includes("image/png")) ext = "png";
        else if (contentType.includes("video/mp4")) ext = "mp4";
        else if (contentType.includes("application/pdf")) ext = "pdf";
        else if (contentType.includes("audio/ogg")) ext = "ogg";
        else if (contentType.includes("audio/mpeg")) ext = "mp3";

        // 4. Upload to Supabase Storage
        const fileName = `${channel}/${mediaId}_${Date.now()}.${ext}`;
        // Store in a dedicated 'incoming-media' folder or similar in existing bucket
        const filePath = `incoming/${fileName}`;

        const { error: uploadError } = await supabaseWithAdmin
            .storage
            .from("chat-media")
            .upload(filePath, buffer, {
                contentType: contentType,
                upsert: true
            });

        if (uploadError) {
            console.error("[Process Media] Upload to Supabase failed", uploadError);
            return null;
        }

        // 5. Get Public URL
        const { data: { publicUrl } } = supabaseWithAdmin
            .storage
            .from("chat-media")
            .getPublicUrl(filePath);

        console.log(`[Process Media] Success: ${publicUrl}`);
        return publicUrl;

    } catch (err) {
        console.error("[Process Media] Exception", err);
        return null;
    }
}
