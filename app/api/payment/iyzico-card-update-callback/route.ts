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

        const cardLast4 = result.lastFourDigits;
        const cardBrand = result.cardAssociation;
        const cardAssociation = result.cardFamily;

        // We need to know which subscription/tenant this belongs to.
        // Iyzico card update retrieve MIGHT return conversationId if we sent it during init.
        // We sent: conversationId: IyzicoConfig.conversationId ('123456789') -> This is static in lib/iyzico.ts

        // Problem: We don't know the tenant ID from the callback if conversationId is static!
        // We must make conversationId dynamic in lib/iyzico.ts or passed in data.

        // But for now, let's look at `customerReferenceCode` or `subscriptionReferenceCode`.
        // We have these in result.

        const subscriptionReferenceCode = result.subscriptionReferenceCode;

        if (subscriptionReferenceCode) {
            const supabase = createAdminClient();

            await supabase.from('subscriptions')
                .update({
                    card_last4: cardLast4,
                    card_brand: cardBrand,
                    card_association: cardAssociation,
                    updated_at: new Date().toISOString()
                })
                .eq('iyzico_subscription_reference_code', subscriptionReferenceCode);
        }

        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/panel/settings?tab=subscription&status=card_update_success`, 302);

    } catch (error: any) {
        console.error("Iyzico Card Update Callback Error:", error);
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/panel/settings?tab=subscription&status=card_update_fail&reason=SystemError`, 302);
    }
}
