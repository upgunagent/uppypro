import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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

        const body = await req.json();
        const { to, subject, htmlContent } = body;

        if (!to || !subject || !htmlContent) {
            return NextResponse.json({ error: "to, subject ve htmlContent gerekli" }, { status: 400 });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(to)) {
            return NextResponse.json({ error: "Geçersiz e-posta adresi" }, { status: 400 });
        }

        const { data, error } = await resend.emails.send({
            from: "UppyPro <noreply@upgunai.com>",
            to: [to],
            subject: subject,
            html: htmlContent,
        });

        if (error) {
            console.error("Resend error:", error);
            return NextResponse.json({ error: error.message || "E-posta gönderilemedi" }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            messageId: data?.id,
            message: `Test e-postası ${to} adresine gönderildi`
        });

    } catch (error: any) {
        console.error("Send test email error:", error);
        return NextResponse.json({ error: error.message || "Beklenmeyen hata" }, { status: 500 });
    }
}
