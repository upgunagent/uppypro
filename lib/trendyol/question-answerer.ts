/**
 * Trendyol Müşteri Soruları Otomatik Cevaplama
 * Cevapsız soruları çeker, AI ile cevap üretir, Trendyol API'ye gönderir.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  getUnansweredQuestions,
  answerQuestion,
  type TrendyolCredentials,
  type TrendyolQuestion,
} from "@/lib/trendyol/client";
import { getTrendyolCredentials } from "@/lib/trendyol/credentials";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

/**
 * Bir tenant'ın Trendyol müşteri sorularını kontrol edip AI ile cevaplar.
 */
export async function processUnansweredQuestions(tenantId: string): Promise<{
  processed: number;
  answered: number;
  errors: number;
}> {
  const supabase = createAdminClient();
  let processed = 0;
  let answered = 0;
  let errors = 0;

  // 1. Credential'ları al
  const creds = await getTrendyolCredentials(tenantId);
  if (!creds) return { processed: 0, answered: 0, errors: 0 };

  // 2. Cevapsız soruları çek
  let questions: TrendyolQuestion[];
  try {
    const result = await getUnansweredQuestions(creds, 0, 10);
    questions = result.content;
  } catch (err) {
    console.error(`[Trendyol QA] Error fetching questions for ${tenantId}:`, err);
    return { processed: 0, answered: 0, errors: 1 };
  }

  if (!questions || questions.length === 0) {
    return { processed: 0, answered: 0, errors: 0 };
  }

  // 3. Gemini AI client
  if (!GEMINI_API_KEY) {
    console.error("[Trendyol QA] GEMINI_API_KEY not set");
    return { processed: 0, answered: 0, errors: 1 };
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  // 4. Her soru için AI cevabı üret ve gönder
  for (const question of questions) {
    processed++;

    try {
      // Zaten DB'de işlenmiş mi kontrol et
      const { data: existing } = await supabase
        .from("trendyol_questions")
        .select("id")
        .eq("business_id", tenantId)
        .eq("trendyol_question_id", String(question.id))
        .maybeSingle();

      if (existing) continue; // Zaten işlenmiş

      // Ürün bilgilerini DB'den çek (daha zengin cevap için)
      let productInfo = "";
      if (question.productMainId) {
        const { data: product } = await supabase
          .from("trendyol_products")
          .select("title, description, brand, attributes, sale_price, quantity")
          .eq("business_id", tenantId)
          .eq("product_code", question.productMainId)
          .maybeSingle();

        if (product) {
          productInfo = `
Ürün Adı: ${product.title}
Marka: ${product.brand}
Fiyat: ₺${product.sale_price}
Stok: ${product.quantity} adet
Açıklama: ${product.description?.substring(0, 500) || ""}
Özellikler: ${JSON.stringify(product.attributes || {})}`;
        }
      }

      // AI ile cevap üret
      const prompt = `Sen bir Trendyol mağazasının müşteri hizmetleri asistanısın. Aşağıdaki müşteri sorusunu samimi, profesyonel ve bilgilendirici bir şekilde cevapla.

Müşteri Sorusu: "${question.text}"
Ürün: ${question.productName || "Belirtilmemiş"}
${productInfo}

KURALLAR:
- Cevap 10-500 karakter arasında olmalı.
- Türkçe cevap ver.
- Kısa, net ve yardımcı ol.
- Emin olmadığın bilgileri uydurma.
- Ürün bilgisi yoksa genel bir cevap ver.
- Sadece cevabı yaz, başka açıklama ekleme.`;

      const result = await model.generateContent(prompt);
      const answerText = result.response.text()?.trim();

      if (!answerText || answerText.length < 10 || answerText.length > 2000) {
        console.warn(`[Trendyol QA] Invalid answer length for question ${question.id}`);
        errors++;
        continue;
      }

      // Trendyol'a cevabı gönder
      await answerQuestion(creds, question.id, answerText);

      // DB'ye kaydet
      await supabase.from("trendyol_questions").upsert(
        {
          business_id: tenantId,
          trendyol_question_id: String(question.id),
          product_title: question.productName || "",
          question_text: question.text,
          answer_text: answerText,
          status: "answered",
          answered_by: "ai",
          answered_at: new Date().toISOString(),
        },
        { onConflict: "business_id, trendyol_question_id" }
      );

      answered++;
      console.log(`[Trendyol QA] Answered question ${question.id}: "${question.text.substring(0, 50)}..."`);

      // Rate limit koruması (soruları hızlı hızlı cevaplama)
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err: any) {
      console.error(`[Trendyol QA] Error answering question ${question.id}:`, err.message);
      errors++;
    }
  }

  return { processed, answered, errors };
}
