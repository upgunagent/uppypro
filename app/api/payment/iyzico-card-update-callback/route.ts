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

        const cardLast4 = result.lastFourDigits;
        const cardBrand = result.cardAssociation;
        const cardAssociation = result.cardFamily;

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
