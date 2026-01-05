import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import crypto from "crypto";

export async function GET(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return new Response("Unauthorized", { status: 401 });
    }

    // 1. Get Tenant ID
    const { data: member } = await supabase
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

    if (!member) {
        return new Response("No tenant found", { status: 400 });
    }

    const tenantId = member.tenant_id;

    // 2. Prepare State (tenant_id + random nonce for CSRF)
    // Format: tenantId:nonce
    const nonce = crypto.randomBytes(16).toString("hex");
    const state = `${tenantId}:${nonce}`;

    // Store nonce in cookie or similar if strictly enforcing CSRF on callback, 
    // but for MVP we'll rely on the signed state if we had a secret, or just tenant_id validation.
    // Ideally use a specialized library or encrypted cookie. 
    // For this implementation, we simply pass it to identifying the tenant on return.

    // 3. Construct Instagram OAuth URL
    const appId = process.env.IG_APP_ID;
    const redirectUri = process.env.IG_REDIRECT_URI || `${new URL(request.url).origin}/api/integrations/instagram/login/callback`;
    const scope = "instagram_basic,instagram_manage_messages,instagram_manage_comments,pages_manage_metadata,pages_show_list,pages_read_engagement,business_management";
    // Scope note: 'instagram_manage_messages' is key for DM. 
    // 'business_management' might be needed depending on the app review.

    if (!appId) {
        return new Response("Missing IG_APP_ID env", { status: 500 });
    }

    // CORRECT ENDPOINT FOR BUSINESS SCOPES (Instagram Messaging)
    // We must use Facebook Login, not Instagram Basic Display.
    // Documentation: https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow/
    const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scope}&response_type=code`;

    redirect(authUrl);
}
