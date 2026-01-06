
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
    text: string
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
        let body = {};

        // 2. Prepare Request based on Channel
        if (channel === "instagram") {
            // Instagram Send API: https://graph.facebook.com/v21.0/me/messages
            // Scoped ID (recipientId) is enough.
            url = `https://graph.facebook.com/v21.0/me/messages?access_token=${accessToken}`;
            body = {
                recipient: { id: recipientId },
                message: { text: text }
            };
        } else if (channel === "whatsapp") {
            // WhatsApp Send API: https://graph.facebook.com/v21.0/PHONE_NUMBER_ID/messages
            const phoneNumberId = identifiers?.phone_number_id;

            if (!phoneNumberId) {
                return { success: false, error: "WhatsApp Phone Number ID missing in connection" };
            }

            url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
            body = {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: recipientId,
                type: "text",
                text: { body: text }
            };
        } else {
            return { success: false, error: `Unsupported channel: ${channel}` };
        }

        // 3. Send Request
        // Note: For WhatsApp, we need Bearer Token header usually, but query param might work for some endpoints. 
        // Best practice is Header for WA. Instagram also supports header.
        // Let's use Header for consistency.

        const headers: any = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
        };

        // Remove access_token query param for WA if using header? 
        // For IG `me/messages?access_token=` is common, but Bearer is safer.
        // Let's stick to standard Graph API practices.

        const res = await fetch(url, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(body)
        });

        const data = await res.json();

        if (!res.ok || data.error) {
            console.error(`[Meta Send Error] ${JSON.stringify(data.error)}`);
            return { success: false, error: data.error?.message || "Meta API Error", data: data };
        }

        return { success: true, data: data };

    } catch (err: any) {
        console.error("[Meta Send Exception]", err);
        return { success: false, error: err.message };
    }
}
