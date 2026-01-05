import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    // Get the first Instagram connection
    const { data: connection } = await admin
        .from("channel_connections")
        .select("*")
        .eq("channel", "instagram")
        .limit(1)
        .maybeSingle();

    if (!connection) {
        return NextResponse.json({ error: "No Instagram connection found in DB" }, { status: 404 });
    }

    const accessToken = connection.access_token_encrypted;
    // Note: We called it 'encrypted' but in MVP it might be plain text. If it's truly encrypted, we need to decrypt.
    // Based on previous code in callback/route.ts, we are storing it directly: access_token_encrypted: accessToken 
    // So we treat it as plain text here.

    if (!accessToken) {
        return NextResponse.json({ error: "No access token in connection record" }, { status: 500 });
    }

    // 1. Get Page ID from /me/accounts or debug_token to find the connected page
    // Actually, we need the Page ID to query subscribed_apps.
    // Let's find the page ID using the token.

    let pageId = null;
    let pageName = null;

    try {
        const pagesRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${accessToken}`);
        const pagesData = await pagesRes.json();

        // Find the page that has instagram_business_account matching our ig_user_id
        // But simplistic approach: just use the first page or the one linked.
        const linkedPage = pagesData.data?.find((p: any) => p.instagram_business_account); // This field requires 'instagram_basic' scope usually

        // Or if we can't find it easily, let's try to fetch details of the page calling /me if token is page token? 
        // No, token is usually User Access Token.
        // Let's just try to find the page ID corresponding to the IG User ID we stored.

        if (linkedPage) {
            pageId = linkedPage.id;
            pageName = linkedPage.name;
        } else if (pagesData.data && pagesData.data.length > 0) {
            // Fallback: Check the first page
            pageId = pagesData.data[0].id;
            pageName = pagesData.data[0].name;
        }

        if (!pageId) {
            return NextResponse.json({ error: "Could not find any Page ID with this token", meta_response: pagesData }, { status: 400 });
        }

        // 2. Report Subscribed Apps (GET)
        const getUrl = `https://graph.facebook.com/v21.0/${pageId}/subscribed_apps?access_token=${accessToken}`;
        const getRes = await fetch(getUrl);
        const getJson = await getRes.json();

        // 3. Force Subscribe (POST)
        const postUrl = `https://graph.facebook.com/v21.0/${pageId}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,messaging_optins,message_deliveries,message_reads&access_token=${accessToken}`;
        const postRes = await fetch(postUrl, { method: "POST" });
        const postJson = await postRes.json();

        return NextResponse.json({
            tenant_id: connection.tenant_id,
            ig_user_id: connection.meta_identifiers?.ig_user_id,
            page: { id: pageId, name: pageName },
            current_subscriptions: getJson,
            force_subscribe_attempt: postJson,
            token_debug: { has_token: true, length: accessToken.length }
        });

    } catch (e: any) {
        return NextResponse.json({ error: "Exception during debug", details: e.message }, { status: 500 });
    }
}
