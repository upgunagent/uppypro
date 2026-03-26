/**
 * Sistem Mesajı Oluşturma API Endpoint
 * Gemini API kullanarak sektöre özel sistem mesajı üretir
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildGenerationPrompt } from "@/lib/ai/system-message-template";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sectorLabel, answers } = body;

    if (!sectorLabel || !answers) {
      return NextResponse.json({ error: "Eksik parametre" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key tanımlı değil" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-pro-preview" });

    const prompt = buildGenerationPrompt(sectorLabel, answers);

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    if (!text) {
      return NextResponse.json({ error: "Sistem mesajı oluşturulamadı" }, { status: 500 });
    }

    return NextResponse.json({ systemMessage: text.trim() });
  } catch (error: any) {
    console.error("[Generate System Message Error]:", error);
    return NextResponse.json(
      { error: "Sistem mesajı oluşturulurken hata: " + (error.message || "Bilinmeyen hata") },
      { status: 500 }
    );
  }
}
