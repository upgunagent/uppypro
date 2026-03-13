import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Cache file path
const CACHE_FILE = path.join(process.cwd(), "public", "asset-catalog.json");

export async function POST(req: NextRequest) {
    try {
        // Auth check
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: membership } = await supabase
            .from("tenant_members")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "agency_admin")
            .maybeSingle();

        if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const publicDir = path.join(process.cwd(), "public");
        const allowedExtensions = [".png", ".jpg", ".jpeg", ".svg", ".webp"];

        // Scan public folder for relevant images (skip guide folder)
        const scanDir = (dir: string, prefix: string = ""): string[] => {
            const files: string[] = [];
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.isDirectory()) {
                        // Skip guide and non-relevant folders
                        if (["guide", "node_modules", ".next"].includes(entry.name)) continue;
                        files.push(...scanDir(path.join(dir, entry.name), prefix ? `${prefix}/${entry.name}` : entry.name));
                    } else if (entry.isFile()) {
                        const ext = path.extname(entry.name).toLowerCase();
                        if (allowedExtensions.includes(ext)) {
                            files.push(prefix ? `${prefix}/${entry.name}` : entry.name);
                        }
                    }
                }
            } catch (e) { /* skip unreadable dirs */ }
            return files;
        };

        const imageFiles = scanDir(publicDir);

        // Analyze each image with Gemini Vision
        const catalog: Array<{
            filename: string;
            url: string;
            description: string;
            suggestedUse: string;
            dimensions: string;
        }> = [];

        for (const file of imageFiles) {
            const filePath = path.join(publicDir, file.replace(/\//g, path.sep));
            const ext = path.extname(file).toLowerCase();

            // Skip SVGs (analyze as text)
            if (ext === ".svg") {
                const svgContent = fs.readFileSync(filePath, "utf-8");
                catalog.push({
                    filename: file,
                    url: `https://www.upgunai.com/${file.replace(/\\/g, "/")}`,
                    description: `SVG vektörel dosya: ${file}`,
                    suggestedUse: "Vektörel ikon veya grafik",
                    dimensions: "Vektörel (ölçeklenebilir)"
                });
                continue;
            }

            // Read image as base64
            try {
                const imageBuffer = fs.readFileSync(filePath);
                const base64Image = imageBuffer.toString("base64");
                const mimeType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

                // Call Gemini Vision
                const geminiRes = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            contents: [{
                                parts: [
                                    {
                                        inlineData: {
                                            mimeType,
                                            data: base64Image
                                        }
                                    },
                                    {
                                        text: `Bu görseli analiz et ve şu bilgileri JSON formatında ver:
{
  "description": "Görselin detaylı açıklaması (ne görünüyor, renkler, içerik)",
  "suggestedUse": "Bu görsel bir e-posta şablonunda nerede/nasıl kullanılabilir",
  "dimensions": "Tahmini boyut bilgisi (küçük ikon / orta / büyük banner)"
}
Sadece JSON döndür, başka bir şey yazma.`
                                    }
                                ]
                            }],
                            generationConfig: {
                                temperature: 0.2,
                                maxOutputTokens: 500,
                            }
                        })
                    }
                );

                if (geminiRes.ok) {
                    const geminiData = await geminiRes.json();
                    let rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                    rawText = rawText.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();

                    try {
                        const parsed = JSON.parse(rawText);
                        catalog.push({
                            filename: file,
                            url: `https://www.upgunai.com/${file.replace(/\\/g, "/")}`,
                            description: parsed.description || file,
                            suggestedUse: parsed.suggestedUse || "Genel kullanım",
                            dimensions: parsed.dimensions || "Bilinmiyor"
                        });
                    } catch {
                        catalog.push({
                            filename: file,
                            url: `https://www.upgunai.com/${file.replace(/\\/g, "/")}`,
                            description: rawText.substring(0, 200),
                            suggestedUse: "Genel kullanım",
                            dimensions: "Bilinmiyor"
                        });
                    }
                }

                // Small delay to avoid rate limiting
                await new Promise(r => setTimeout(r, 300));

            } catch (err) {
                console.error(`Error analyzing ${file}:`, err);
            }
        }

        // Save catalog to cache file
        fs.writeFileSync(CACHE_FILE, JSON.stringify({
            generatedAt: new Date().toISOString(),
            totalAssets: catalog.length,
            assets: catalog
        }, null, 2), "utf-8");

        return NextResponse.json({
            success: true,
            totalAssets: catalog.length,
            catalog
        });

    } catch (error: any) {
        console.error("Analyze assets error:", error);
        return NextResponse.json({ error: error.message || "Hata" }, { status: 500 });
    }
}

// GET: Return cached catalog
export async function GET() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const data = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
            return NextResponse.json(data);
        }
        return NextResponse.json({ assets: [], message: "Katalog henüz oluşturulmamış. POST ile analiz başlatın." });
    } catch {
        return NextResponse.json({ assets: [] });
    }
}
