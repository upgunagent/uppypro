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

    if (!accessToken) {
        return NextResponse.json({ error: "No access token in connection record" }, { status: 500 });
    }

    // 1. Get Page ID
    // Check if we have it in DB first (new flow stores it)
    let pageId = connection.meta_identifiers?.page_id;
    let pageName = "Unknown (From DB)";

    try {
        if (!pageId) {
            // Fallback for legacy data: Try to find it via API
            // Be careful: If accessToken is a Page Token, /me/accounts fails.
            // Try /me first to see if it IS the page.
            const meRes = await fetch(`https://graph.facebook.com/v21.0/me?fields=id,name,accounts&access_token=${accessToken}`);
            const meData = await meRes.json();

            if (meData.accounts) {
                // It's a User Token
                const found = meData.accounts.data?.find((p: any) => p.instagram_business_account);
                if (found) {
                    pageId = found.id;
                    pageName = found.name;
                }
            } else if (meData.id) {
                // It's likely a Page Token (no accounts field, just id/name)
                pageId = meData.id;
                pageName = meData.name;
            }
        }

        if (!pageId) {
            return NextResponse.json({ error: "Could not determine Page ID. DB missing it and API lookup failed.", details: { token_preview: accessToken.substring(0, 10) } }, { status: 400 });
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
            token_type: "Likely Page Token (Success)"
        });

    } catch (e: any) {
        return NextResponse.json({ error: "Exception during debug", details: e.message }, { status: 500 });
    }
}
