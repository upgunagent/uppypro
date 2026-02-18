import { NextResponse } from "next/server";
import { getSubscriptionCardUpdateResult } from "@/lib/iyzico";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const token = formData.get("token") as string;

        if (!token) {
            return NextResponse.json({ error: "Token missing" }, { status: 400 });
        }

        console.log("Iyzico Card Update Callback Token:", token);

        // Retrieve result from Iyzico
        const result = await getSubscriptionCardUpdateResult(token);

        if (result.status !== 'success') {
            console.error("Iyzico Card Update Failed:", result.errorMessage);
            return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/panel/settings?tab=subscription&status=card_update_fail&reason=${encodeURIComponent(result.errorMessage)}`, 302);
        }

        // Result should contain card info
        /*
           Typically contains:
           lastFourDigits, cardAssociation, cardFamily, etc.
        */
        console.log("Iyzico Card Update Result:", JSON.stringify(result, null, 2));

        let cardLast4 = result.lastFourDigits;
        let cardBrand = result.cardAssociation;
        let cardAssociation = result.cardFamily;

        // We need to know which subscription/tenant this belongs to.
        const subscriptionReferenceCode = result.subscriptionReferenceCode;
        let subscriptionId = null;

        const supabase = createAdminClient();

        if (subscriptionReferenceCode) {
            const { data: sub } = await supabase.from('subscriptions')
                .select('id')
                .eq('iyzico_subscription_reference_code', subscriptionReferenceCode)
                .single();
            if (sub) subscriptionId = sub.id;
        }

        // Fallback: Lookup by Token
        if (!subscriptionId && token) {
            console.log("Subscription lookup by RefCode failed. Trying Token:", token);
            const { data: sub } = await supabase.from('subscriptions')
                .select('id')
                .eq('iyzico_checkout_token', token)
                .single();
            if (sub) subscriptionId = sub.id;
        }

        // Fetch Subscription Details (Golden Source)
        if (subscriptionReferenceCode || subscriptionId) {
            try {
                // If we found sub by token but refCode is missing in result, we need to fetch it from DB FIRST
                let refCodeForLookup = subscriptionReferenceCode;
                if (!refCodeForLookup && subscriptionId) {
                    const { data: sub } = await supabase.from('subscriptions').select('iyzico_subscription_reference_code').eq('id', subscriptionId).single();
                    refCodeForLookup = sub?.iyzico_subscription_reference_code;
                }

                if (refCodeForLookup) {
                    const { getSubscriptionDetails } = await import("@/lib/iyzico");
                    const subDetails = await getSubscriptionDetails(refCodeForLookup);
                    console.log("Iyzico Subscription Details:", JSON.stringify(subDetails, null, 2));

                    // If Subscription Details contains card info, prefer it?
                    // Structure might be subDetails.data.orders[...]? 
                    // Or subDetails.data.paymentType?
                    // We don't know for sure, but logging will help future debug.
                    // For now, let's stick to result but if result is empty, check subDetails?
                }
            } catch (e) {
                console.error("Failed to fetch subscription details:", e);
            }
        }

        if (subscriptionId) {
            console.log(`Updating Subscription ${subscriptionId} with card info: ${cardLast4}`);
            await supabase.from('subscriptions')
                .update({
                    card_last4: cardLast4,
                    card_brand: cardBrand,
                    card_association: cardAssociation,
                    // Also ensure ref codes are synced if we found it via token
                    iyzico_subscription_reference_code: subscriptionReferenceCode || undefined, // Don't null it if missing?
                    iyzico_customer_reference_code: result.customerReferenceCode || undefined,
                    updated_at: new Date().toISOString()
                })
                .eq('id', subscriptionId);
        } else {
            console.error("Could not find subscription for Card Update!", { subscriptionReferenceCode, token });
        }

        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/panel/settings?tab=subscription&status=card_update_success`, 302);

    } catch (error: any) {
        console.error("Iyzico Card Update Callback Error:", error);
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/panel/settings?tab=subscription&status=card_update_fail&reason=SystemError`, 302);
    }
}
