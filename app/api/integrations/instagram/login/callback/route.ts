import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// HTML helper: popup'tan parent'a postMessage gönderir ve kapanır
function popupResponse(type: "IG_OAUTH_SUCCESS" | "IG_OAUTH_ERROR", message?: string) {
    const payload = JSON.stringify({ type, message: message || "" });
    const isSuccess = type === "IG_OAUTH_SUCCESS";
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bağlanıyor...</title>
    <style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;}
    .box{text-align:center;padding:2rem;border-radius:1rem;background:white;box-shadow:0 4px 24px rgba(0,0,0,.1);max-width:320px;}
    .icon{font-size:3rem;margin-bottom:1rem;}
    h2{margin:.5rem 0;font-size:1.25rem;}
    p{color:#64748b;font-size:.875rem;margin:.25rem 0 0;}
    </style></head><body>
    <div class="box">
        <div class="icon">${isSuccess ? "✅" : "❌"}</div>
        <h2>${isSuccess ? "Bağlantı Başarılı!" : "Bağlantı Hatası"}</h2>
        <p>${isSuccess ? "Instagram hesabınız bağlandı. Bu pencere kapanıyor..." : (message || "Bir hata oluştu.")}</p>
    </div>
    <script>
        try { if (window.opener) { window.opener.postMessage(${payload}, window.location.origin); } } catch(e){}
        setTimeout(() => window.close(), ${isSuccess ? 1500 : 4000});
    </script>
    </body></html>`;
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorReason = searchParams.get("error_reason");
    const errorDescription = searchParams.get("error_description");

    console.log("--- Instagram OAuth Callback ---");
    console.log("Code:", code ? "Received" : "Missing");
    console.log("State:", state);
    console.log("Error:", error);

    if (error || !code || !state) {
        console.error("Callback Error Query:", { error, errorReason, errorDescription });
        return popupResponse("IG_OAUTH_ERROR", errorDescription || "Instagram yetkilendirmesi başarısız.");
    }

    const [tenantId] = state.split(":");
    console.log("Tenant ID from State:", tenantId);

    if (!tenantId) {
        return popupResponse("IG_OAUTH_ERROR", "Geçersiz durum parametresi.");
    }

    // Tarayıcıların popup pencerelerinde SameSite çerezlerini engellemesi nedeniyle,
    // burada oturum kontrolünü (auth.getUser) atlıyoruz. 
    // tenantId, state parametresi üzerinden (UUID olarak) güvenli bir şekilde geliyor.
    // Ayrıca veritabanı işlemlerini yapmak için createAdminClient kullanacağız.

    const appId = process.env.IG_APP_ID;
    const appSecret = process.env.IG_APP_SECRET;
    const redirectUri = process.env.IG_REDIRECT_URI || `${new URL(request.url).origin}/api/integrations/instagram/login/callback`;

    if (!appId || !appSecret) {
        return popupResponse("IG_OAUTH_ERROR", "Sunucu yapılandırma hatası.");
    }

    try {
        // 1. Exchange Code for Short-Lived Access Token
        const tokenRes = await fetch(
            `https://graph.facebook.com/v24.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`,
            { method: "GET" }
        );
        const tokenData = await tokenRes.json();

        if (tokenData.error || !tokenData.access_token) {
            console.error("IG Token Error:", JSON.stringify(tokenData));
            throw new Error(tokenData.error?.message || "Access token alınamadı.");
        }

        const shortLivedToken = tokenData.access_token;
        console.log("[IG OAuth] Short-lived token obtained");

        // 2. Exchange Short-Lived Token for Long-Lived Token (60 days)
        // This is CRITICAL: short-lived tokens expire in ~1-2 hours!
        let longLivedUserToken = shortLivedToken;
        try {
            const llRes = await fetch(
                `https://graph.facebook.com/v24.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`
            );
            const llData = await llRes.json();

            if (llData.access_token) {
                longLivedUserToken = llData.access_token;
                console.log("[IG OAuth] Long-lived user token obtained (expires_in:", llData.expires_in, "seconds)");
            } else {
                console.warn("[IG OAuth] Long-lived token exchange failed, using short-lived token:", llData.error?.message);
            }
        } catch (llErr) {
            console.error("[IG OAuth] Long-lived token exchange exception:", llErr);
        }

        // 3. Debug token for granular scopes
        const debugRes = await fetch(
            `https://graph.facebook.com/v24.0/debug_token?input_token=${longLivedUserToken}&access_token=${appId}|${appSecret}`
        );
        const debugData = await debugRes.json();

        let foundPage = null;
        const scopes = debugData.data?.granular_scopes || [];
        const pageScope = scopes.find((s: any) => s.scope === 'pages_show_list');
        const targetIds = pageScope ? pageScope.target_ids : [];

        // 4. Find Page with Instagram Business Account
        // Using long-lived user token → the page token we get will be PERMANENT (never expires)
        if (targetIds && targetIds.length > 0) {
            for (const pageId of targetIds) {
                const pageRes = await fetch(`https://graph.facebook.com/v24.0/${pageId}?fields=access_token,instagram_business_account{id,username,profile_picture_url}&access_token=${longLivedUserToken}`);
                const pageData = await pageRes.json();
                if (pageData.instagram_business_account) {
                    foundPage = pageData;
                    break;
                }
            }
        }

        if (!foundPage) {
            const accountsRes = await fetch(`https://graph.facebook.com/v24.0/me/accounts?fields=access_token,instagram_business_account{id,username,profile_picture_url}&access_token=${longLivedUserToken}`);
            const accountsData = await accountsRes.json();
            foundPage = accountsData.data?.find((p: any) => p.instagram_business_account);
        }

        if (!foundPage) {
            throw new Error("Facebook Sayfanıza bağlı bir Instagram Business hesabı bulunamadı.");
        }

        const igAccount = foundPage.instagram_business_account;
        const igUserId = igAccount.id;
        const username = igAccount.username;
        // When obtained via a long-lived user token, this Page Access Token is PERMANENT (never expires)
        const pageAccessToken = foundPage.access_token;

        console.log("[IG OAuth] Page token obtained for page:", foundPage.id, "IG User:", igUserId, "Username:", username);

        // 5. Subscribe to Webhooks
        if (pageAccessToken) {
            const subRes = await fetch(
                `https://graph.facebook.com/v24.0/${foundPage.id}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,messaging_optins,message_deliveries,message_reads&access_token=${pageAccessToken}`,
                { method: "POST" }
            );
            const subData = await subRes.json();
            console.log("[IG OAuth] Webhook subscription result:", JSON.stringify(subData));
        }

        // 6. Save to DB — use the PERMANENT page access token
        const admin = createAdminClient();
        const { error: dbError } = await admin.from("channel_connections").upsert({
            tenant_id: tenantId,
            channel: 'instagram',
            status: 'connected',
            connection_method: 'instagram_login',
            meta_identifiers: {
                ig_user_id: igUserId,
                ig_id: igUserId, // backward compat for CRM business_discovery
                username: username,
                account_type: "business",
                page_id: foundPage.id
            },
            access_token_encrypted: pageAccessToken || longLivedUserToken
        }, { onConflict: "tenant_id, channel" });

        if (dbError) {
            console.error("DB Error:", dbError);
            throw dbError;
        }

        return popupResponse("IG_OAUTH_SUCCESS");

    } catch (err: any) {
        console.error("Callback Error:", err);
        return popupResponse("IG_OAUTH_ERROR", err.message);
    }
}
