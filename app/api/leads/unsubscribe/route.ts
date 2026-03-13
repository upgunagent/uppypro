import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const token = req.nextUrl.searchParams.get("token");

    if (!token) {
        return new NextResponse(renderPage("Geçersiz bağlantı", "Bu abonelikten çıkma bağlantısı geçersiz.", true), {
            headers: { "Content-Type": "text/html; charset=utf-8" },
        });
    }

    try {
        // Decode token: base64(email|sendId)
        const decoded = Buffer.from(token, "base64").toString("utf-8");
        const [email, sendId] = decoded.split("|");

        if (!email) {
            return new NextResponse(renderPage("Geçersiz bağlantı", "E-posta adresi bulunamadı.", true), {
                headers: { "Content-Type": "text/html; charset=utf-8" },
            });
        }

        const adminDb = createAdminClient();

        // Add to suppressions
        await adminDb.from("lead_suppressions").upsert(
            { email, reason: "unsubscribe" },
            { onConflict: "email" }
        );

        // If we have a sendId, log which campaign triggered unsubscribe
        if (sendId) {
            try {
                const { data: send } = await adminDb
                    .from("lead_campaign_sends")
                    .select("campaign_id")
                    .eq("id", sendId)
                    .single();

                if (send?.campaign_id) {
                    await adminDb.from("lead_suppressions")
                        .update({ source_campaign_id: send.campaign_id })
                        .eq("email", email);
                }
            } catch {}
        }

        // Delete all campaign send records for this email
        try {
            await adminDb
                .from("lead_campaign_sends")
                .delete()
                .eq("email", email);
        } catch (err) {
            console.error("Error deleting campaign sends:", err);
        }

        // Delete the lead record(s) with this email
        try {
            await adminDb
                .from("leads")
                .delete()
                .eq("email", email);
        } catch (err) {
            console.error("Error deleting lead:", err);
        }

        return new NextResponse(
            renderPage(
                "Abonelikten Çıkıldı",
                `<strong>${email}</strong> adresi başarıyla abonelikten çıkarıldı. Artık bu adresten e-posta almayacaksınız.`,
                false
            ),
            { headers: { "Content-Type": "text/html; charset=utf-8" } }
        );

    } catch (err: any) {
        console.error("Unsubscribe error:", err);
        return new NextResponse(renderPage("Bir hata oluştu", "Lütfen daha sonra tekrar deneyin.", true), {
            headers: { "Content-Type": "text/html; charset=utf-8" },
        });
    }
}

function renderPage(title: string, message: string, isError: boolean): string {
    const bgColor = isError ? "#FEF2F2" : "#F0FDF4";
    const textColor = isError ? "#991B1B" : "#166534";
    const iconColor = isError ? "#EF4444" : "#22C55E";
    const icon = isError
        ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="${iconColor}" width="64" height="64"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="${iconColor}" width="64" height="64"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;

    return `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - UppyPro</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F8FAFC; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .card { background: white; border-radius: 24px; padding: 48px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.08); border: 1px solid #E2E8F0; }
        .icon { width: 80px; height: 80px; border-radius: 50%; background: ${bgColor}; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
        h1 { font-size: 24px; font-weight: 700; color: #1E293B; margin-bottom: 12px; }
        p { font-size: 15px; color: #64748B; line-height: 1.6; }
        p strong { color: ${textColor}; }
        .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #E2E8F0; font-size: 13px; color: #94A3B8; }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">${icon}</div>
        <h1>${title}</h1>
        <p>${message}</p>
        <div class="footer">UppyPro E-posta Yönetimi</div>
    </div>
</body>
</html>`;
}
