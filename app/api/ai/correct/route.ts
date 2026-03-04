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

        const { text } = await req.json();
        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'Gemini API anahtarı sunucuda eksik.' }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `Aşağıdaki metni oku. İmla kurallarını düzelt, daha profesyonel, kibar ve kurumsal bir Türkçe ile yeniden yaz. Metnin asıl anlamını ve vermek istediği mesajı KESİNLİKLE bozma. Sadece düzeltilmiş metni ver, başka hiçbir açıklama, not veya tırnak işareti ekleme:\n\n${text}`;

        const result = await model.generateContent(prompt);
        const responseData = await result.response;
        const correctedText = responseData.text().trim();

        return NextResponse.json({ correctedText });

    } catch (e: any) {
        console.error('AI Correction error:', e);
        return NextResponse.json({ error: 'Failed to correct text', details: e.message }, { status: 500 });
    }
}
