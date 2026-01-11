import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/panel/inbox";

    // Create response object for cookie handling
    let response = NextResponse.redirect(`${origin}${next}`);

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // PKCE flow: If code parameter exists, exchange it for session
    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
            console.error("Auth callback error:", error);
            return NextResponse.redirect(`${origin}/login?error=auth_failed`);
        }
    }

    // For recovery/magic links, cookies are already set by Supabase
    // Just verify the user is logged in
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.error("No user found after auth callback");
        return NextResponse.redirect(`${origin}/login?error=session_missing`);
    }

    // Redirect to the intended destination
    return response;
}
