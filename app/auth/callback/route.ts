import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    // "next" is a common param used to redirect after login
    const next = searchParams.get("next") ?? "/";

    if (code) {
        const supabase = await createClient(); // Await if async, check server.ts usually sync or async based on implementation
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    // Forward error parameters if present
    const error = searchParams.get("error");
    const errorCode = searchParams.get("error_code");
    const errorDescription = searchParams.get("error_description");

    if (error) {
        return NextResponse.redirect(
            `${origin}/login?error=${error}&error_code=${errorCode}&error_description=${errorDescription}`
        );
    }

    // Return the user to an error page with instructions if no code and no specific error
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
