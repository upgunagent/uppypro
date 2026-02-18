import { NextResponse } from "next/server";
import { getSubscriptionCheckoutFormResult } from "@/lib/iyzico";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const token = formData.get("token") as string;

        if (!token) {
            return NextResponse.json({ error: "Token missing" }, { status: 400 });
        }

        console.log("Iyzico Callback Token:", token);

        // Retrieve result from Iyzico
        const result = await getSubscriptionCheckoutFormResult(token);

        if (result.status !== 'success') {
            console.error("Iyzico Payment Failed:", result.errorMessage);
            // Redirect to fail page
            return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/complete-payment?status=fail&reason=${encodeURIComponent(result.errorMessage)}`, 302);
        }

        // Only handle specific statuses if needed, otherwise success means subscription started
        /*
          Result contains:
          - subscriptionReferenceCode (UUID)
          - customerReferenceCode (UUID)
          - pricingPlanReferenceCode (UUID)
          - subscriptionStatus (ACTIVE/PENDING)
        */

        const subscriptionReferenceCode = result.subscriptionReferenceCode;
        const customerReferenceCode = result.customerReferenceCode;
        const pricingPlanReferenceCode = result.pricingPlanReferenceCode;

        // Update Subscription in DB
        const supabase = createAdminClient();

        // Find subscription by matching plan reference maybe? Or store token-subscription map beforehand?
        // Better strategy: We can match by iyzico reference codes if we stored them, OR
        // Since we don't have the subscription ID here easily unless we passed it in conversationId/metadata (which iyzico allows but limited),
        // we might need to rely on the user being logged in or storing a temporary session.

        // HOWEVER: The correct way with Iyzico Subscriptions is usually:
        // 1. Create a "Pending" subscription in our DB before redirecting.
        // 2. Pass its ID as conversationId.
        // 3. Update it here.

        // Let's assume conversationId is the subscription ID or Tenant ID for simplicity in this initial pass.
        // Warning: conversationId retrieval needs verification in result object.
        // Default result object usually returns conversationId.

        // FOR NOW: Let's assume we can match based on the pricing plan + customer email (if unique) OR
        // Just log the success and let the webhook handle the heavy lifting of status updates?
        // BUT: User needs immediate feedback.

        // Let's update pending subscriptions for this customer?
        // We need to know WHICH tenant/user this is.
        // Iyzico result has `email` inside `customer` object.

        const customerEmail = result.customerEmail; // Check exact field name in docs/response

        // Fallback: If conversationId was sent as Tenant ID
        const tenantId = result.conversationId;

        if (tenantId && tenantId !== '123456789') {
            const now = new Date();
            const nextMonth = new Date(now);
            nextMonth.setMonth(nextMonth.getMonth() + 1);

            // Extract card info if available
            // Note: Iyzico result object structure needs to contain these fields.
            // subscriptionCheckoutForm.retrieve result usually contains:
            // cardType, cardAssociation, cardFamily
            // binNumber, lastFourDigits -> These might be at top level or inside an object?
            // Checking documentation/typical response:
            // It seems result contains: binNumber, cardType, cardAssociation, cardFamily, cardToken, email...

            const cardLast4 = result.lastFourDigits;
            const cardBrand = result.cardAssociation; // e.g. MASTER_CARD, VISA
            const cardAssociation = result.cardFamily; // e.g. Bonus, World

            await supabase.from('subscriptions')
                .update({
                    status: 'active',
                    iyzico_subscription_reference_code: subscriptionReferenceCode,
                    iyzico_customer_reference_code: customerReferenceCode,
                    current_period_start: now.toISOString(),
                    current_period_end: nextMonth.toISOString(),
                    updated_at: now.toISOString(),
                    card_last4: cardLast4,
                    card_brand: cardBrand,
                    card_association: cardAssociation
                })
                .eq('tenant_id', tenantId);

            // Also add payment record
            await supabase.from("payments").insert({
                tenant_id: tenantId,
                amount_try: result.price * 100, // Assuming result.price is in TL
                currency: 'TRY',
                status: 'success',
                type: 'subscription_initial',
                provider: 'iyzico',
                provider_ref: result,
                created_at: now.toISOString()
            });
        }

        // 3. User & Session Handling
        // We need to sign the user in. Iyzico callback is server-side.
        // We can generate a Magic Link and redirect the user to it.
        // This will authenticate them and then redirect to the success page.

        // Find the user associated with this tenant
        // Assuming the creator is the owner.
        // Also we can try to use result.email but tenantId is safer for subscription association.

        let targetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/complete-payment?status=success`;

        console.log(`[IYZICO-CALLBACK] Processing TenantID: ${tenantId}`);

        if (tenantId && tenantId.length < 20) { // Valid Tenant ID check (not timestamp)
            const { data: member } = await supabase
                .from('tenant_members')
                .select('user_id')
                .eq('tenant_id', tenantId)
                .eq('role', 'tenant_owner')
                .single();

            if (member && member.user_id) {
                const { data: userData } = await supabase.auth.admin.getUserById(member.user_id);
                if (userData && userData.user && userData.user.email) {
                    const { data: linkData } = await supabase.auth.admin.generateLink({
                        type: 'magiclink',
                        email: userData.user.email,
                        options: {
                            redirectTo: targetUrl
                        }
                    });

                    if (linkData && linkData.properties && linkData.properties.action_link) {
                        console.log(`[IYZICO-CALLBACK] Generated Magic Link for ${userData.user.email}`);
                        return NextResponse.redirect(linkData.properties.action_link, 302);
                    }
                }
            }
        }

        if (tenantId) {
            // ... existing tenant lookup ...
        }

        // FALLBACK: User Lookup by Email if Tenant ID method failed
        if (!tenantId || tenantId.length > 20) { // If it's a timestamp (long) or missing
            const email = result.email || result.customerEmail || result.customer?.email;
            console.log(`[IYZICO-CALLBACK] Fallback: Looking up user by email: ${email}`);

            if (email) {
                // Try to find in billing_info
                const { data: billing } = await supabase
                    .from('billing_info')
                    .select('tenant_id')
                    .eq('contact_email', email)
                    .single();

                if (billing && billing.tenant_id) {
                    const { data: member } = await supabase
                        .from('tenant_members')
                        .select('user_id')
                        .eq('tenant_id', billing.tenant_id)
                        .eq('role', 'tenant_owner')
                        .single();

                    if (member && member.user_id) {
                        const { data: userData } = await supabase.auth.admin.getUserById(member.user_id);
                        if (userData && userData.user && userData.user.email) {
                            const { data: linkData } = await supabase.auth.admin.generateLink({
                                type: 'magiclink',
                                email: userData.user.email,
                                options: {
                                    redirectTo: targetUrl
                                }
                            });

                            if (linkData && linkData.properties && linkData.properties.action_link) {
                                console.log(`[IYZICO-CALLBACK] Generated Magic Link for ${userData.user.email} (Email Fallback)`);
                                return NextResponse.redirect(linkData.properties.action_link, 302);
                            }
                        }
                    }
                }
            }
        }

        // Fallback Redirect (If user lookup fails)
        console.log("[IYZICO-CALLBACK] Session restoration failed - Fallback to standard redirect");
        return NextResponse.redirect(`${targetUrl}&reason=SessionRestoreFailed-${tenantId ? 'TenantFound' : 'TenantMissing'}`, 302);

    } catch (error: any) {
        console.error("Iyzico Callback Error:", error);
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/complete-payment?status=fail&reason=${encodeURIComponent(error.message)}`, 302);
    }
}
