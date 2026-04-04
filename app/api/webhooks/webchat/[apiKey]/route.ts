import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { processWithBuiltInAI } from "@/lib/ai/agent";

// Rate limiting: IP -> { count, resetAt }
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20; // 20 requests per minute per IP
const RATE_WINDOW = 60_000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ apiKey: string }> }
) {
  const { apiKey } = await params;

  // Rate limit
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ success: false, error: "Rate limit exceeded" }, { status: 429 });
  }

  // Parse body
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  // n8n widget uyumlulugu: chatId -> session_id, action: "sendMessage" body formatini destekle
  const session_id = body.session_id || body.chatId || body.sessionId;
  const message = body.message || body.text || body.input || body.chatInput || body.content;
  const visitor_name = body.visitor_name || body.name || body.userName;
  const visitor_email = body.visitor_email || body.email;
  const visitor_phone = body.visitor_phone || body.phone;

  if (!session_id || !message) {
    return NextResponse.json(
      { success: false, error: "session_id/chatId and message are required" },
      { status: 400 }
    );
  }

  if (typeof message !== "string" || message.length > 2000) {
    return NextResponse.json(
      { success: false, error: "Message must be a string with max 2000 characters" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // 1. Tenant'i API key ile bul
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, webchat_enabled")
    .eq("webchat_api_key", apiKey)
    .maybeSingle();

  if (!tenant) {
    return NextResponse.json({ success: false, error: "Invalid API key" }, { status: 403 });
  }

  if (!tenant.webchat_enabled) {
    return NextResponse.json({ success: false, error: "Webchat is disabled for this tenant" }, { status: 403 });
  }

  // 2. Conversation bul veya olustur
  let conversation: any;
  const { data: existingConv } = await supabase
    .from("conversations")
    .select("*")
    .eq("tenant_id", tenant.id)
    .eq("channel", "webchat")
    .eq("channel_conversation_id", session_id)
    .maybeSingle();

  if (existingConv) {
    conversation = existingConv;
    // Visitor bilgilerini guncelle (isim, email vb.)
    if (visitor_name || visitor_email || visitor_phone) {
      const updates: any = {};
      if (visitor_name) updates.contact_name = visitor_name;
      if (visitor_phone) updates.contact_phone = visitor_phone;
      await supabase
        .from("conversations")
        .update(updates)
        .eq("id", conversation.id);
    }
  } else {
    const { data: newConv, error: convError } = await supabase
      .from("conversations")
      .insert({
        tenant_id: tenant.id,
        channel: "webchat",
        channel_conversation_id: session_id,
        contact_name: visitor_name || "Web Ziyaretcisi",
        contact_phone: visitor_phone || null,
        is_ai_mode: true,
      })
      .select("*")
      .single();

    if (convError || !newConv) {
      console.error("[Webchat] Conversation creation error:", convError);
      return NextResponse.json({ success: false, error: "Failed to create conversation" }, { status: 500 });
    }
    conversation = newConv;

    // Musteri karti olustur/eslestir
    if (visitor_name || visitor_email || visitor_phone) {
      try {
        const { findOrCreateCustomer } = await import("@/lib/ai/tools/handlers");
        const customerId = await findOrCreateCustomer(
          supabase, tenant.id, visitor_name || "Web Ziyaretcisi", visitor_email, visitor_phone
        );
        if (customerId) {
          await supabase.from("conversations").update({ customer_id: customerId }).eq("id", conversation.id);
          conversation.customer_id = customerId;
        }
      } catch { /* ignore */ }
    }
  }

  // 3. Gelen mesaji kaydet
  const { error: msgError } = await supabase.from("messages").insert({
    conversation_id: conversation.id,
    tenant_id: tenant.id,
    direction: "IN",
    sender: visitor_name || "Web Ziyaretcisi",
    text: message,
    is_read: false,
    channel_message_id: `webchat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  });

  if (msgError) {
    console.error("[Webchat] Message save error:", msgError);
    return NextResponse.json({ success: false, error: "Failed to save message" }, { status: 500 });
  }

  // Conversation'i guncelle (son mesaj bilgisi)
  await supabase
    .from("conversations")
    .update({
      last_message: message,
      last_message_at: new Date().toISOString(),
    })
    .eq("id", conversation.id);

  // 4. AI modu kontrol - insan devraldiysa bekleme mesaji ver
  if (!conversation.is_ai_mode) {
    const { data: lastAgentMsg } = await supabase
      .from("messages")
      .select("text")
      .eq("conversation_id", conversation.id)
      .eq("direction", "OUT")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const replyText = lastAgentMsg?.text || "Mesajiniz alindi. Isletme temsilcimiz en kisa surede donecektir.";

    return NextResponse.json({
      output: replyText,
      text: replyText,
      reply: replyText,
      success: true,
      conversation_id: conversation.id,
      mode: "human",
    });
  }

  // 5. AI ile mesaji isle
  try {
    const aiReply = await processWithBuiltInAI(
      tenant.id,
      conversation,
      {
        text: message,
        sender_id: session_id,
        sender_name: visitor_name || "Web Ziyaretcisi",
        media_url: null,
        media_type: null,
        type: "text",
      },
      "webchat" as any,
      session_id
    );

    if (aiReply) {
      // AI yanitini kaydet
      await supabase.from("messages").insert({
        conversation_id: conversation.id,
        tenant_id: tenant.id,
        direction: "OUT",
        sender: "AI",
        text: aiReply,
        is_read: true,
        channel_message_id: `webchat_ai_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      });

      // Conversation'i guncelle
      await supabase
        .from("conversations")
        .update({
          last_message: aiReply,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", conversation.id);

      return NextResponse.json({
        output: aiReply,
        text: aiReply,
        reply: aiReply,
        success: true,
        conversation_id: conversation.id,
        mode: "ai",
      });
    }

    const fallbackReply = "Mesajiniz alindi, en kisa surede size donecegiz.";
    return NextResponse.json({
      output: fallbackReply,
      text: fallbackReply,
      reply: fallbackReply,
      success: true,
      conversation_id: conversation.id,
      mode: "ai",
    });
  } catch (err: any) {
    console.error("[Webchat] AI processing error:", err);
    const errorReply = "Su anda teknik bir sorun yasiyoruz. Lutfen kisa bir sure sonra tekrar deneyiniz.";
    return NextResponse.json({
      output: errorReply,
      text: errorReply,
      reply: errorReply,
      success: true,
      conversation_id: conversation.id,
      mode: "error",
    });
  }
}

// Konusma gecmisi endpoint'i
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ apiKey: string }> }
) {
  const { apiKey } = await params;
  const sessionId = request.nextUrl.searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json({ success: false, error: "session_id is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Tenant'i dogrula
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, webchat_enabled")
    .eq("webchat_api_key", apiKey)
    .maybeSingle();

  if (!tenant || !tenant.webchat_enabled) {
    return NextResponse.json({ success: false, error: "Invalid or disabled" }, { status: 403 });
  }

  // Conversation bul
  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("tenant_id", tenant.id)
    .eq("channel", "webchat")
    .eq("channel_conversation_id", sessionId)
    .maybeSingle();

  if (!conv) {
    return NextResponse.json({ success: true, messages: [] });
  }

  // Son 50 mesaji getir
  const { data: messages } = await supabase
    .from("messages")
    .select("direction, sender, text, created_at")
    .eq("conversation_id", conv.id)
    .order("created_at", { ascending: true })
    .limit(50);

  return NextResponse.json({
    success: true,
    messages: (messages || []).map((m) => ({
      role: m.direction === "IN" ? "user" : "assistant",
      text: m.text,
      sender: m.sender,
      timestamp: m.created_at,
    })),
  });
}
