import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const headers = request.headers;

        // Use Headers to verify signature if Iyzico provides one in V2
        // Iyzico V2 Subscription webhooks might use a specific signature header (x-iyzico-signature?)
        // For now, we will trust the payload but log it carefully.
        // TODO: Implement proper signature verification when keys are available.
        // It's usually: base64(sha1(secretKey + payload))

        console.log("Iyzico Webhook Event:", body?.iyzicoEventType);

        const eventType = body?.iyzicoEventType;

        if (eventType === 'subscription.order.success') {
            // A recurring payment was successful
            /* Payload example:
               {
                   "iyzicoEventType": "subscription.order.success",
                   "iyzicoEventTime": 1588667688000,
                   "referenceCode": "52857404-5e36-4074-8833-2884f33b664d", (Subscription Ref?)
                   "pricingPlanReferenceCode": "...",
                   "customerReferenceCode": "...",
                   "subscriptionStatus": "ACTIVE",
                   "orderReferenceCode": "..."
               }
            */

            const subscriptionReferenceCode = body?.referenceCode;
            const orderReferenceCode = body?.orderReferenceCode;

            if (subscriptionReferenceCode) {
                const supabase = createAdminClient();

                // Extend subscription period
                const now = new Date();
                const nextMonth = new Date(now);
                nextMonth.setMonth(nextMonth.getMonth() + 1);

                // Update subscription
                await supabase.from('subscriptions')
                    .update({
                        status: 'active',
                        current_period_start: now.toISOString(),
                        current_period_end: nextMonth.toISOString(),
                        updated_at: now.toISOString()
                    })
                    .eq('iyzico_subscription_reference_code', subscriptionReferenceCode);

                // Log Payment
                // need to fetch tenant_id from subscription first
                const { data: sub } = await supabase.from('subscriptions').select('tenant_id').eq('iyzico_subscription_reference_code', subscriptionReferenceCode).single();

                if (sub) {
                    await supabase.from("payments").insert({
                        tenant_id: sub.tenant_id,
                        amount_try: body?.price ? body.price * 100 : 0, // Need to check payload for price
                        currency: 'TRY',
                        status: 'success',
                        type: 'subscription_recurring',
                        provider: 'iyzico',
                        provider_ref: body,
                        created_at: now.toISOString()
                    });
                }
            }

        } else if (eventType === 'subscription.order.failure') {
            // Payment failed
            const subscriptionReferenceCode = body?.referenceCode;
            if (subscriptionReferenceCode) {
                const supabase = createAdminClient();
                await supabase.from('subscriptions')
                    .update({
                        status: 'past_due', // or canceled?
                        updated_at: new Date().toISOString()
                    })
                    .eq('iyzico_subscription_reference_code', subscriptionReferenceCode);
            }
        }

        return NextResponse.json({ status: "success" });

    } catch (error: any) {
        console.error("Iyzico Webhook Error:", error);
        return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
    }
}
