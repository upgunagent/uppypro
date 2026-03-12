import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const META_GRAPH_API = "https://graph.facebook.com/v21.0";
const FB_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID!;
const FB_APP_SECRET = process.env.FACEBOOK_APP_SECRET || process.env.IG_APP_SECRET!; // Fallback added temporarily for safety

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { code, waba_id, phone_number_id } = await request.json();

        if (!code || !waba_id || !phone_number_id) {
            return NextResponse.json({ error: "code, waba_id ve phone_number_id zorunludur" }, { status: 400 });
        }

        // 1. Get Tenant
        const { data: member } = await supabase
            .from("tenant_members")
            .select("tenant_id")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();

        if (!member) return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 400 });

        // 2. Exchange code for access token
        const tokenRes = await fetch(
            `${META_GRAPH_API}/oauth/access_token?client_id=${FB_APP_ID}&client_secret=${FB_APP_SECRET}&code=${code}`,
            { method: "GET" }
        );
        const tokenData = await tokenRes.json();

        if (!tokenData.access_token) {
            console.error("Token exchange hatası:", tokenData);
            return NextResponse.json({
                error: tokenData.error?.message || "Token alınamadı"
            }, { status: 400 });
        }

        const accessToken = tokenData.access_token;
        console.log("[Embedded Signup] Token exchange başarılı");

        // 3. Get phone number details (to get the actual display phone number)
        let phoneDisplayNumber = "";
        try {
            const phoneRes = await fetch(
                `${META_GRAPH_API}/${phone_number_id}?fields=display_phone_number,verified_name&access_token=${accessToken}`
            );
            const phoneData = await phoneRes.json();
            phoneDisplayNumber = phoneData.display_phone_number || "";
            console.log("[Embedded Signup] Telefon bilgisi:", phoneData);
        } catch (e) {
            console.warn("[Embedded Signup] Telefon bilgisi alınamadı:", e);
        }

        // 4. Subscribe app to WABA webhooks
        try {
            const subscribeRes = await fetch(
                `${META_GRAPH_API}/${waba_id}/subscribed_apps`,
                {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${accessToken}`,
                        "Content-Type": "application/json"
                    }
                }
            );
            const subscribeData = await subscribeRes.json();
            console.log("[Embedded Signup] Webhook subscribe:", subscribeData);
        } catch (e) {
            console.warn("[Embedded Signup] Webhook subscribe hatası:", e);
        }

        // 5. Register phone number for Cloud API (may already be registered)
        try {
            const registerRes = await fetch(
                `${META_GRAPH_API}/${phone_number_id}/register`,
                {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${accessToken}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        messaging_product: "whatsapp",
                        pin: "000000" // Default PIN, user can change later
                    })
                }
            );
            const registerData = await registerRes.json();
            console.log("[Embedded Signup] Phone register:", registerData);
        } catch (e) {
            console.warn("[Embedded Signup] Phone register hatası:", e);
        }

        // 6. Save to channel_connections
        const admin = createAdminClient();
        const { error: dbError } = await admin.from("channel_connections").upsert({
            tenant_id: member.tenant_id,
            channel: "whatsapp",
            status: "connected",
            meta_identifiers: {
                phone_number_id: phone_number_id,
                waba_id: waba_id,
                mock_id: phone_number_id,
                display_phone_number: phoneDisplayNumber,
                signup_method: "embedded_signup"
            },
            access_token_encrypted: accessToken
        }, { onConflict: "tenant_id, channel" });

        if (dbError) {
            console.error("[Embedded Signup] DB hatası:", dbError);
            return NextResponse.json({ error: "Kayıt hatası: " + dbError.message }, { status: 500 });
        }

        console.log("[Embedded Signup] Başarıyla tamamlandı. Tenant:", member.tenant_id);
        return NextResponse.json({
            success: true,
            phone_number: phoneDisplayNumber || phone_number_id
        });

    } catch (error: any) {
        console.error("[Embedded Signup] Beklenmeyen hata:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
