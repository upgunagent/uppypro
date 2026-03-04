require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('GEMINI_API_KEY is not defined in .env.local');
            return;
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-pro-latest' });

        const text = 'merjaha yarn ne yapacsn';
        const prompt = `Aşağıdaki metni oku. İmla kurallarını düzelt, daha profesyonel, kibar ve kurumsal bir Türkçe ile yeniden yaz. Metnin asıl anlamını ve vermek istediği mesajı KESİNLİKLE bozma. Sadece düzeltilmiş metni ver, başka hiçbir açıklama, not veya tırnak işareti ekleme:\n\n${text}`;

        console.log('Sending request to Gemini API...');
        const result = await model.generateContent(prompt);
        const responseData = await result.response;
        const correctedText = responseData.text().trim();

        console.log('--- SUCCESS ---');
        console.log('Input:', text);
        console.log('Output:', correctedText);
    } catch (e) {
        console.error('--- ERROR ---');
        console.error(e);
    }
}

testGemini();
