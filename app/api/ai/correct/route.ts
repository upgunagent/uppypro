import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { text, action, targetLanguage } = await req.json();
        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'Gemini API anahtarı sunucuda eksik.' }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-pro-latest' });

        let prompt = "";

        // --- TRANSLATION ACTIONS ---
        if (action === 'translate_to_turkish') {
            prompt = `Aşağıdaki metni Türkçeye çevir. Ayrıca metnin orijinal dilini de tespit et. Yanıtı kesinlikle ve SADECE geçerli bir JSON objesi olarak ver. Başka hiçbir açıklama, markdown veya tırnak ekleme. JSON formatı: {"translatedText": "Türkçe çevirisi", "detectedLanguage": "Orijinal Dilin Türkçe Adı (Örn: İngilizce)"}\n\nMetin: ${text}`;
        }
        else if (action === 'translate_outbound') {
            if (!targetLanguage) {
                return NextResponse.json({ error: 'Hedef dil (targetLanguage) gerekli' }, { status: 400 });
            }
            prompt = `Aşağıdaki Türkçe metni ${targetLanguage} diline çevir. Metnin anlamını bozma. Sadece çevrilmiş metni ver, açıklama veya not ekleme:\n\n${text}`;
        }
        // --- CORRECTION ACTIONS ---
        else if (action === 'corporate') {
            prompt = `Aşağıdaki metni oku. İmla kurallarını düzelt, daha profesyonel, kibar ve tam anlamıyla kurumsal bir Türkçe ile iletişim diline uygun olarak yeniden yaz. Metnin asıl anlamını ve vermek istediği temel mesajı kesinlikle bozma ancak ifadeleri gerektiği kadar resmileştir. Sadece düzeltilmiş metni ver, başka hiçbir açıklama, not veya tırnak işareti ekleme:\n\n${text}`;
        } else {
            // Default to 'spelling'
            prompt = `Aşağıdaki metni oku. Anlamını, tonunu veya kullanıcının vermek istediği hissiyatı (samimi, resmi olmayan vb.) KESİNLİKLE değiştirme. Sadece metindeki yazım hatalarını ve noktalama işaretlerini düzelt. Kendi kendine cümle ekleme veya çıkarma yapma. Sadece düzeltilmiş halini ver, açıklama veya tırnak işareti ekleme:\n\n${text}`;
        }

        const result = await model.generateContent(prompt);
        const responseData = await result.response;
        const resultText = responseData.text().trim();

        if (action === 'translate_to_turkish') {
            try {
                // Remove potential markdown formatting before parsing json
                const cleanJsonStr = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
                const parsedResult = JSON.parse(cleanJsonStr);
                return NextResponse.json(parsedResult);
            } catch (jsonErr) {
                console.error('Translation JSON parse error:', jsonErr, resultText);
                return NextResponse.json({ error: 'Çeviri nesnesi çözümlenemedi.' }, { status: 500 });
            }
        }

        return NextResponse.json({ correctedText: resultText });

    } catch (e: any) {
        console.error('AI Correction error:', e);
        return NextResponse.json({ error: 'Failed to correct text', details: e.message }, { status: 500 });
    }
}
