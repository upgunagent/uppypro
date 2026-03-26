import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.warn("[Gemini] GEMINI_API_KEY is not set. Built-in AI will not work.");
}

const genAI = new GoogleGenerativeAI(API_KEY || "");

export function getGeminiModel(modelName: string = "gemini-2.5-flash") {
  return genAI.getGenerativeModel({ model: modelName });
}

export { genAI };
