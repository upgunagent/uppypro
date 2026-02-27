import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const BOT_API_KEY = process.env.BOT_API_KEY || "guvenli_rastgele_string";

export async function POST(request: Request) {
    try {
        // Verify API key
        const authHeader = request.headers.get("authorization");
        const apiKey = authHeader?.replace("Bearer ", "") || "";

        if (apiKey !== BOT_API_KEY) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const {
            tenant_id,
            customer_number,
            customer_name,
            summary,
            conversation_id
        } = body;

        if (!tenant_id || !summary) {
            return NextResponse.json(
                { error: "tenant_id and summary are required" },
                { status: 400 }
            );
        }

        const supabaseAdmin = createAdminClient();

        // Try to find the chat_id from conversations table using customer_number
        let chatId = conversation_id || null;

        if (!chatId && customer_number) {
            // Search by external_thread_id (phone number or IG user id)
            const { data: conversation } = await supabaseAdmin
                .from("conversations")
                .select("id")
                .eq("tenant_id", tenant_id)
                .eq("external_thread_id", customer_number)
                .order("updated_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (conversation) {
                chatId = conversation.id;
            }
        }

        // Insert notification
        const { data: notification, error } = await supabaseAdmin
            .from("notifications")
            .insert({
                tenant_id,
                type: "AI_ESCALATION",
                title: "🔔 Canlı Destek Talebi",
                message: summary,
                metadata: {
                    chat_id: chatId,
                    customer_number: customer_number || null,
                    customer_name: customer_name || null,
                    conversation_id: conversation_id || null
                }
            })
            .select()
            .single();

        if (error) {
            console.error("Notification insert error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            notification_id: notification.id
        });
    } catch (error: any) {
        console.error("AI Escalation webhook error:", error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
