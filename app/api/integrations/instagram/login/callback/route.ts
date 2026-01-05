import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin"; // Needed for upsert if user RLS is strict
import { redirect } from "next/navigation";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // "tenantId:nonce"
    const error = searchParams.get("error");
    const errorReason = searchParams.get("error_reason");
    const errorDescription = searchParams.get("error_description");

    console.log("--- Instagram OAuth Callback ---");
    console.log("Code:", code ? "Received" : "Missing");
    console.log("State:", state);
    console.log("Error:", error);

    if (error || !code || !state) {
        console.error("Callback Error Query:", { error, errorReason, errorDescription });
        return redirect("/panel/settings?error=instagram_auth_failed");
    }

    const [tenantId, nonce] = state.split(":");
    console.log("Tenant ID from State:", tenantId);

    if (!tenantId) {
        return redirect("/panel/settings?error=invalid_state");
    }

    // Verify session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.warn("User Session not found");
        return redirect("/login"); // Session expired
    }

    // Double check user belongs to this tenant
    const { data: member } = await supabase
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", user.id)
        .eq("tenant_id", tenantId)
        .single();

    if (!member) {
        console.error("User does not belong to tenant:", tenantId);
        return redirect("/panel/settings?error=unauthorized_tenant");
    }

    const appId = process.env.IG_APP_ID;
    const appSecret = process.env.IG_APP_SECRET;
    const redirectUri = process.env.IG_REDIRECT_URI || `${new URL(request.url).origin}/api/integrations/instagram/login/callback`;

    if (!appId || !appSecret) {
        console.error("Missing Env Vars");
        return new Response("Missing IG env vars", { status: 500 });
    }

    try {
        // 1. Exchange Code for Access Token (Facebook Graph API)
        console.log("Exchange Code for Token...");
        console.log("Redirect URI:", redirectUri);

        const tokenRes = await fetch(
            `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`,
            { method: "GET" }
        );
        const tokenData = await tokenRes.json();

        if (tokenData.error || !tokenData.access_token) {
            console.error("IG Token Error:", JSON.stringify(tokenData));
            throw new Error(tokenData.error?.message || "Failed to get access token");
        }

        const accessToken = tokenData.access_token;
        console.log("Access Token received.");

        // 2. Token Analysis (Required for Granular Permissions Lookup)
        const debugRes = await fetch(
            `https://graph.facebook.com/v21.0/debug_token?input_token=${accessToken}&access_token=${appId}|${appSecret}`
        );
        const debugData = await debugRes.json();

        // 4. ROBUST STRATEGY: Use target_ids from debug_token
        // If Granular Permissions are used, /me/accounts might be empty, but target_ids tells us exactly what we have access to.

        let foundPage = null;
        const scopes = debugData.data?.granular_scopes || [];
        const pageScope = scopes.find((s: any) => s.scope === 'pages_show_list');
        const targetIds = pageScope ? pageScope.target_ids : [];

        console.log("Authorized Page IDs (Target IDs):", targetIds);

        if (targetIds && targetIds.length > 0) {
            // Fetch each authorized page directly to find the one with IG
            for (const pageId of targetIds) {
                console.log(`Checking Page ID: ${pageId}...`);
                // Request Page Access Token explicitly
                const pageRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}?fields=access_token,instagram_business_account{id,username,profile_picture_url}&access_token=${accessToken}`);
                const pageData = await pageRes.json();

                if (pageData.instagram_business_account) {
                    foundPage = pageData;
                    break; // Found one!
                }
            }
        }

        // Fallback to /me/accounts if no target_ids (unlikely in business login) or if legacy token
        if (!foundPage) {
            console.log("No specific target_ids found or no IG linked in them. Trying /me/accounts fallback...");
            const accountsRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=access_token,instagram_business_account{id,username,profile_picture_url}&access_token=${accessToken}`);
            const accountsData = await accountsRes.json();
            foundPage = accountsData.data?.find((p: any) => p.instagram_business_account);
        }

        const pageWithIg = foundPage;

        if (!pageWithIg) {
            console.error("No IG Account found linked to Pages.");
            throw new Error("No Instagram Business account linked to your Facebook Pages. Please ensure you selected a Page connected to an Instagram Business account.");
        }

        const igAccount = pageWithIg.instagram_business_account;
        const igUserId = igAccount.id;
        const username = igAccount.username;
        // USE PAGE ACCESS TOKEN
        const pageAccessToken = pageWithIg.access_token;

        console.log("Found IG Account:", username, igUserId);
        console.log("Page Access Token Found:", !!pageAccessToken);

        // 2.5. IMPORTANT: Subscribe to Webhooks for this Page using PAGE TOKEN
        if (pageAccessToken) {
            console.log("Subscribing Page to App Webhooks...");
            const subscribeRes = await fetch(
                `https://graph.facebook.com/v21.0/${pageWithIg.id}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,messaging_optins,message_deliveries,message_reads&access_token=${pageAccessToken}`,
                { method: "POST" }
            );
            const subscribeData = await subscribeRes.json();
            console.log("Subscribe Result:", subscribeData);
        } else {
            console.warn("No Page Access Token found. Skipping subscription (User Token might fail).");
        }

        // 3. Save to DB
        console.log("Saving to DB...");
        const admin = createAdminClient();
        const { error: dbError } = await admin.from("channel_connections").upsert({
            tenant_id: tenantId,
            channel: 'instagram',
            status: 'connected',
            connection_method: 'instagram_login',
            meta_identifiers: {
                ig_user_id: igUserId,
                username: username,
                account_type: "business",
                page_id: pageWithIg.id // Store Page ID too valuable
            },
            access_token_encrypted: pageAccessToken || accessToken // Prefer Page Token
        }, { onConflict: "tenant_id, channel" });

        if (dbError) {
            console.error("DB Error:", dbError);
            throw dbError;
        }

        console.log("Done. Redirecting...");
        return redirect("/panel/settings?success=instagram_connected");

    } catch (err: any) {
        console.error("Callback Error Details:", err);
        return redirect(`/panel/settings?error=server_error&details=${encodeURIComponent(err.message)}`);
    }
}
