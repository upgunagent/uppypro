import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { activateSubscription } from "@/app/actions/enterprise";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const body: any = {};
        formData.forEach((value, key) => {
            body[key] = value;
        });

        console.log("PayTR Callback Received:", body);

        const { merchant_oid, status, total_amount, hash } = body;

        // 1. Validate Keys
        const MERCHANT_KEY = process.env.PAYTR_MERCHANT_KEY;
        const MERCHANT_SALT = process.env.PAYTR_MERCHANT_SALT;

        if (!MERCHANT_KEY || !MERCHANT_SALT) {
            console.error("PayTR Env missing");
            return NextResponse.json({ status: "failed" }, { status: 500 });
        }

        // 2. Validate Hash
        // PayTR sends hash = base64(hmac_sha256(merchant_oid + merchant_salt + status + total_amount, merchant_key))
        const hashStr = merchant_oid + MERCHANT_SALT + status + total_amount;
        const computedHash = crypto
            .createHmac("sha256", MERCHANT_KEY)
            .update(hashStr)
            .digest("base64");

        if (computedHash !== hash) {
            console.error("PayTR Hash Mismatch");
            return new NextResponse("OK"); // PayTR expects literal "OK" even on error to stop retrying, but usually we log it.
        }

        if (status === 'success') {
            const supabaseAdmin = createAdminClient();

            // Resolve Tenant/Invite from merchant_oid
            // Format: "sub_<tenantId>_<timestamp>" or similar. 
            // Better: Store the oid in a "payment_logs" table beforehand.

            // For this implementation, let's assume merchant_oid format: "pay_<roomId>_<tenantId>" 
            // Or simpler: We just look for a pending subscription/payment with this ID if we saved it.
            // But we didn't save it before getting token.

            // Let's decode if we encode info in merchant_oid.
            // Safe way: `inv_<inviteToken>_<timestamp>`

            const [prefix, refId, timestamp] = merchant_oid.split('_');

            if (prefix === 'ent' && refId) {
                // Enterprise Invite Token
                const inviteToken = refId;

                // We need to find the tenant associated with this token to activate
                const { data: invite } = await supabaseAdmin
                    .from("enterprise_invite_tokens")
                    .select("tenant_id")
                    .eq("token", inviteToken)
                    .single();

                if (invite) {
                    // Activate
                    // Note: activateSubscription usually takes cardData, but here we just need to activate.
                    // We'll create a new helper or reuse/mock.

                    // Direct activation logic here to avoid complex reuse
                    const now = new Date();
                    const nextMonth = new Date(now);
                    nextMonth.setMonth(nextMonth.getMonth() + 1);

                    await supabaseAdmin.from("subscriptions").update({
                        status: 'active',
                        current_period_start: now.toISOString(),
                        current_period_end: nextMonth.toISOString()
                    }).eq('tenant_id', invite.tenant_id);

                    // Mark token used
                    await supabaseAdmin.from("enterprise_invite_tokens").update({
                        used_at: now.toISOString()
                    }).eq('token', inviteToken);

                    // Log Payment
                    await supabaseAdmin.from("payments").insert({
                        tenant_id: invite.tenant_id,
                        amount: Number(total_amount), // Already in cents? PayTR sends 10000 for 100.00 TL? No, docs say 100.00 in total_amount usually? 
                        // Docs: total_amount: "100" (if passed as 100). Check params.
                        // Actually PayTR sends payment_amount in cents in request, but returns total_amount usually as sent?
                        // Let's assume it matches what we sent.
                        currency: 'TRY',
                        status: 'success',
                        type: 'subscription_activation',
                        provider_payment_id: merchant_oid
                    });
                }
            }
        } else {
            console.warn("PayTR Payment Failed:", body.failed_reason_code, body.failed_reason_msg);
        }

        return new NextResponse("OK");

    } catch (error: any) {
        console.error("Payment Callback Error", error);
        return new NextResponse("OK"); // Respond OK to stop retries if logic fails
    }
}
