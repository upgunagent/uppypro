
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        // Iyzico sends data as Form Data or JSON depending on config, usually POST with token.
        // For MVP, handling JSON payload or query params.
        // Assuming JSON for simplicity or Iyzico's 'callbackUrl' behavior.

        // In a real Iyzico integration, we verify the signature/hash.

        const body = await request.json();
        const { token, status, paymentId } = body;

        if (!token) {
            return NextResponse.json({ message: "Missing token" }, { status: 400 });
        }

        const supabaseAdmin = createAdminClient();

        // Find payment by token (provider_ref)
        // We need to have stored the token during checkout initialization.
        // Since we skipped checkout init implementation (mocked in signup), 
        // we'll assume we can find the subscription or payment via some metadata or just log it.

        // For MVP: Log success
        console.log("Payment Callback Received:", body);

        return NextResponse.json({ status: "success" });

    } catch (error: any) {
        console.error("Payment Callback Error", error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
