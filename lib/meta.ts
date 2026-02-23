
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
    filename?: string,
    payload?: any
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

            url = `https://graph.facebook.com/v24.0/me/messages?access_token=${accessToken}`;

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
            } else if (type === 'location' && payload) {
                body = {
                    messaging_product: "whatsapp",
                    recipient_type: "individual",
                    to: recipientId,
                    type: "location",
                    location: {
                        latitude: payload.latitude,
                        longitude: payload.longitude,
                        name: payload.title || payload.name,
                        address: payload.address
                    }
                };
            } else if (mediaUrl) {
                // WhatsApp Media Types: image, video, audio, document
                // Note: 'voice' is also a type but 'audio' is safer for general files.

                let waType = type === 'document' ? 'document' : type === 'video' ? 'video' : type === 'audio' ? 'audio' : 'image';

                // SPECIAL HANDLER: WhatsApp does not support .webm, .ogg or .wav audio messages natively in all contexts.
                // If we are sending an audio but it is .webm/.ogg/.wav (browser/wav recording), we MUST send it as a document to ensure delivery.
                // We check both mediaUrl and filename to be sure.
                const isBrowserAudio = (mediaUrl && (mediaUrl.includes('.webm') || mediaUrl.includes('.ogg') || mediaUrl.includes('.wav'))) ||
                    (filename && (filename.endsWith('.webm') || filename.endsWith('.ogg') || filename.endsWith('.wav')));

                if (type === 'audio' && isBrowserAudio) {
                    console.log("[Meta Send] Detected Browser Audio (WebM/OGG/WAV). Forcing 'document' type for WhatsApp compatibility.");
                    waType = 'document';
                    if (!filename) filename = "voice_message.wav"; // Default fallback
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
            const metaUrl = `https://graph.facebook.com/v24.0/${mediaId}`;
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

/**
 * Upload Instagram profile picture to Supabase Storage for permanent URL.
 * Downloads the photo from the Instagram CDN URL and uploads it to the
 * 'profile-pics' bucket with a stable filename per IG user ID.
 * Returns the permanent Supabase public URL, or null on failure.
 */
export async function uploadProfilePic(
    igUserId: string,
    cdnUrl: string
): Promise<string | null> {
    const supabaseWithAdmin = createAdminClient();

    try {
        // 1. Download from Instagram CDN
        const res = await fetch(cdnUrl);
        if (!res.ok) {
            console.error(`[Profile Pic] Download failed: ${res.status} for user ${igUserId}`);
            return null;
        }

        const buffer = await res.arrayBuffer();
        const contentType = res.headers.get("content-type") || "image/jpeg";

        // 2. Determine extension
        let ext = "jpg";
        if (contentType.includes("png")) ext = "png";
        else if (contentType.includes("webp")) ext = "webp";

        // 3. Upload to Supabase Storage (upsert: same filename per user)
        const filePath = `${igUserId}.${ext}`;

        const { error: uploadError } = await supabaseWithAdmin
            .storage
            .from("profile-pics")
            .upload(filePath, buffer, {
                contentType: contentType,
                upsert: true // Overwrite if exists (profile pic may change)
            });

        if (uploadError) {
            console.error("[Profile Pic] Upload failed:", uploadError);
            return null;
        }

        // 4. Get permanent public URL
        const { data: { publicUrl } } = supabaseWithAdmin
            .storage
            .from("profile-pics")
            .getPublicUrl(filePath);

        console.log(`[Profile Pic] Saved for user ${igUserId}: ${publicUrl}`);
        return publicUrl;

    } catch (err) {
        console.error("[Profile Pic] Exception:", err);
        return null;
    }
}

export async function editMessageInChannel(
    tenantId: string,
    recipientId: string,
    channel: "whatsapp",
    messageId: string, // The external Meta ID
    newText: string
): Promise<SendMessageResult> {
    const supabaseWithAdmin = createAdminClient();

    try {
        // 1. Get Connection
        const { data: connection, error } = await supabaseWithAdmin
            .from("channel_connections")
            .select("access_token_encrypted, meta_identifiers")
            .eq("tenant_id", tenantId)
            .eq("channel", channel)
            .eq("status", "connected")
            .single();

        if (error || !connection) {
            return { success: false, error: "Channel not connected" };
        }

        const accessToken = connection.access_token_encrypted;
        const identifiers = connection.meta_identifiers as any;
        const phoneNumberId = identifiers?.phone_number_id;

        if (!phoneNumberId) return { success: false, error: "Phone Number ID missing" };

        const url = `https://graph.facebook.com/v24.0/${phoneNumberId}/messages`;

        // 3. Prepare Payload for EDIT (Using Protocol Message Structure)
        // Hypothethical Payload based on 'protocol' type:
        /*
          {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": "PHONE_NUMBER",
            "type": "protocol",
             "protocol": {
                "type": "edited_message",
                "edited_message_id": "MESSAGE_ID",
                "body": "NEW TEXT" 
             }
          }
        */
        // Note: 'body' might be inside 'edited_message' or just 'text'? 
        // Let's try matching the incoming webhook structure for edits.

        // Fallback: If "protocol" isn't accepted, we can try generic text with contextual reference if that was an option,
        // but protocol is the specific type for edits/revokes in the underlying layer.

        // Note: If Cloud API doesn't support 'protocol' type outbound, this will fail with "Invalid parameter type".
        // In that case, we might fallback to "context" but that usually replies.

        // Let's try the only remaining logical path before concluding non-support:
        // Some users report success with just sending type="text" and referencing? No.

        // Trying PROTOCOL payload.
        const body = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: recipientId,
            type: "protocol",
            protocol: {
                type: "edited_message",
                edited_message_id: messageId,
                body: newText // Or 'text'? Usually 'body' for text content.
            }
        };

        const res = await fetch(url, {
            method: "POST", // Back to POST, since we are sending a 'new' protocol message
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`
            },
            body: JSON.stringify(body)
        });

        const data = await res.json();

        await supabaseWithAdmin.from("webhook_logs").insert({
            body: body,
            headers: { url: url, response: data },
            error_message: !res.ok ? "EDIT_ERROR" : "EDIT_SUCCESS"
        });

        if (!res.ok || data.error) {
            return { success: false, error: data.error?.message || "Meta Edit Error", data };
        }

        return { success: true, data };

    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
