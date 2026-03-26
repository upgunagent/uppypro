/**
 * Built-in AI Agent Orkestrasyon
 * Gemini API ile mesaj işleme, tool call döngüsü ve yanıt üretme
 */

import { getGeminiModel } from "@/lib/ai/gemini-client";
import { aiToolDefinitions } from "@/lib/ai/tools/definitions";
import { executeToolCall } from "@/lib/ai/tools/handlers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Content, Part } from "@google/generative-ai";

const MAX_TOOL_ROUNDS = 5; // Sonsuz döngü koruması
const MAX_HISTORY_MESSAGES = 20;

/**
 * Built-in Gemini AI ile mesaj işleme
 * @returns AI yanıt metni veya null (hata durumunda)
 */
export async function processWithBuiltInAI(
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
  channel: "whatsapp" | "instagram",
  handleToUse: string
): Promise<string | null> {
  const supabase = createAdminClient();

  // 1. Agent settings çek
  const { data: settings } = await supabase
    .from("agent_settings")
    .select("*")
    .eq("tenant_id", tenantId)
    .single();

  if (!settings?.system_message) {
    console.warn(`[AI Agent] Tenant ${tenantId} has no system message, skipping.`);
    return null;
  }

  const modelName = settings.ai_model || "gemini-2.0-flash";

  // 2. Konuşma geçmişini çek
  const { data: messages } = await supabase
    .from("messages")
    .select("direction, sender, text, created_at")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: false })
    .limit(MAX_HISTORY_MESSAGES);

  // 3. Müşteri bilgisini çek ve sistem notu oluştur
  let customerNote = "";
  if (conversation.customer_id) {
    const { data: customer } = await supabase
      .from("customers")
      .select("id, full_name, phone, email, instagram_username, company_name")
      .eq("id", conversation.customer_id)
      .single();

    if (customer) {
      customerNote = buildCustomerNote(customer);
    }
  }

  // 4. Gemini'ye gönderilecek geçmişi hazırla
  const history = buildChatHistory(messages || []);

  // 5. Yeni mesajı hazırla (metin + opsiyonel görsel)
  const userParts: Part[] = [];

  // Müşteri notu varsa mesajın başına ekle
  if (customerNote) {
    userParts.push({ text: customerNote + "\n\n" + eventData.text });
  } else {
    userParts.push({ text: eventData.text });
  }

  // Görsel varsa base64 olarak ekle
  if (eventData.media_url && eventData.type === "image") {
    try {
      const imgRes = await fetch(eventData.media_url);
      if (imgRes.ok) {
        const buffer = await imgRes.arrayBuffer();
        const MAX_IMAGE_SIZE = 3 * 1024 * 1024; // 3MB
        if (buffer.byteLength <= MAX_IMAGE_SIZE) {
          const base64 = Buffer.from(buffer).toString("base64");
          const mimeType = imgRes.headers.get("content-type") || "image/jpeg";
          userParts.push({
            inlineData: { mimeType, data: base64 },
          });
        }
      }
    } catch (e) {
      console.error("[AI Agent] Image fetch error:", e);
    }
  }

  // 6. Gemini model & chat oluştur
  const model = getGeminiModel(modelName);

  // Bugünün tarihi ve saatini sistem mesajına ekle (Türkiye timezone)
  const now = new Date();
  const turkeyTime = now.toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const turkeyDateISO = now.toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" }); // YYYY-MM-DD format
  const dateContext = `\n\n[SİSTEM BİLGİSİ]\nBugünün tarihi: ${turkeyDateISO} (${turkeyTime})\nTüm tarih işlemlerinde bu bilgiyi referans al. "Yarın" dendiğinde bugüne 1 gün ekle.`;

  const fullSystemMessage = settings.system_message + dateContext;

  const chat = model.startChat({
    history,
    systemInstruction: { 
      role: "user", 
      parts: [{ text: fullSystemMessage }] 
    },
    tools: aiToolDefinitions as any,
  });

  // 7. Mesajı gönder ve tool call döngüsünü çalıştır
  const toolContext = {
    tenantId,
    conversationId: conversation.id,
    senderPhone: eventData.sender_id,
  };

  try {
    let result = await chat.sendMessage(userParts);
    let response = result.response;

    // Tool call döngüsü
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const functionCalls = response.functionCalls();
      if (!functionCalls || functionCalls.length === 0) break;

      console.log(
        `[AI Agent] Round ${round + 1}: ${functionCalls.length} tool call(s): ${functionCalls.map((fc) => fc.name).join(", ")}`
      );

      // Tüm tool'ları paralel çalıştır
      const toolResults = await Promise.all(
        functionCalls.map(async (fc) => {
          const resultStr = await executeToolCall(fc.name, fc.args, toolContext);
          return {
            functionResponse: {
              name: fc.name,
              response: JSON.parse(resultStr),
            },
          };
        })
      );

      // Tool sonuçlarını Gemini'ye geri gönder
      result = await chat.sendMessage(toolResults.map(tr => ({ functionResponse: tr.functionResponse })));
      response = result.response;
    }

    // Final yanıtı al
    const finalText = response.text();
    if (finalText) {
      console.log(`[AI Agent] Final response: ${finalText.substring(0, 80)}...`);
      return finalText;
    }

    return null;
  } catch (error: any) {
    console.error("[AI Agent] Gemini API error:", error);
    return null;
  }
}

/**
 * Kayıtlı müşteri için sistem notu oluşturur (n8n'deki [SİSTEM NOTU] karşılığı)
 */
function buildCustomerNote(customer: any): string {
  const parts: string[] = ["[SİSTEM NOTU - Kayıtlı Müşteri Bilgileri]"];

  if (customer.full_name) parts.push(`Ad Soyad: ${customer.full_name}`);
  if (customer.phone) parts.push(`Telefon: ${customer.phone}`);
  if (customer.email) parts.push(`E-posta: ${customer.email}`);
  if (customer.instagram_username) parts.push(`Instagram: ${customer.instagram_username}`);
  if (customer.company_name) parts.push(`Firma: ${customer.company_name}`);

  parts.push(
    "Bu bilgileri randevu oluştururken kullan, müşteriye tekrar sorma. Ancak onay almadan işlem yapma."
  );

  return parts.join("\n");
}

/**
 * messages tablosundaki geçmişi Gemini Content formatına dönüştürür
 */
function buildChatHistory(messages: any[]): Content[] {
  // Mesajlar ters sırada geliyor (son → ilk), düzelt
  const sorted = [...messages].reverse();

  const history: Content[] = [];

  for (const msg of sorted) {
    if (!msg.text) continue;

    const role = msg.direction === "IN" ? "user" : "model";

    // Aynı rolde ardışık mesajları birleştir (Gemini bunu gerektiriyor)
    const lastEntry = history[history.length - 1];
    if (lastEntry && lastEntry.role === role) {
      lastEntry.parts.push({ text: msg.text });
    } else {
      history.push({
        role,
        parts: [{ text: msg.text }],
      });
    }
  }

  // Gemini ilk mesajın "user" olmasını gerektirir
  if (history.length > 0 && history[0].role !== "user") {
    history.shift();
  }

  // Gemini son mesajın "model" olmasını gerektirir (history'de)
  if (history.length > 0 && history[history.length - 1].role !== "model") {
    history.pop();
  }

  return history;
}
