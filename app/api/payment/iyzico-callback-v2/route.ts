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

        console.log("Iyzico Callback V2 Token:", token);

        // Retrieve result from Iyzico
        const result = await getSubscriptionCheckoutFormResult(token);

        if (result.status !== 'success') {
            console.error("Iyzico Payment Failed (V2):", result.errorMessage);
            const failReason = result.errorMessage || "Unknown Iyzico Error";
            // Redirect to fail page
            return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/complete-payment?status=fail&reason=${encodeURIComponent(failReason)}&source=v2`, 302);
        }

        const subscriptionReferenceCode = result.subscriptionReferenceCode;
        const customerReferenceCode = result.customerReferenceCode;
        const pricingPlanReferenceCode = result.pricingPlanReferenceCode;

        // Update Subscription in DB
        const supabase = createAdminClient();

        // 1. Identify Tenant / User
        // Primary: Conversation ID passed as Tenant ID
        let tenantId = result.conversationId;

        // Fallback: If conversationId is missing (which happens with Iyzico V2 GET sometimes),
        // try to find the subscription by the token!
        if (!tenantId || tenantId === 'undefined' || tenantId === 'null') {
            console.log(`[IYZICO-CALLBACK-V2] Tenant ID missing in result. Attempting lookup by Token: ${token}`);

            const supabase = createAdminClient();
            const { data: subData, error: subError } = await supabase
                .from('subscriptions')
                .select('tenant_id')
                .eq('iyzico_checkout_token', token)
                .single();

            if (subData && subData.tenant_id) {
                console.log(`[IYZICO-CALLBACK-V2] FOUND Tenant ID via Token: ${subData.tenant_id}`);
                tenantId = subData.tenant_id;
            } else {
                console.error(`[IYZICO-CALLBACK-V2] Could not find subscription by token: ${token}`, subError);
            }
        }

        if (!tenantId) {
            console.error("[IYZICO-CALLBACK-V2] Tenant ID missing!");
            // ... fallback to email lookup logic existing below ...
        }
        // Log for debugging
        console.log(`[IYZICO-CALLBACK-V2] Processing TenantID: ${tenantId}`);

        if (tenantId) {
            const now = new Date();
            const nextMonth = new Date(now);
            nextMonth.setMonth(nextMonth.getMonth() + 1);

            const cardLast4 = result.lastFourDigits;
            const cardBrand = result.cardAssociation;
            const cardAssociation = result.cardFamily;

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
            // ... (Add payment record logic if needed, omitted for brevity but should be there)

            // User Lookup & Magic Link Logic
            const { data: member } = await supabase
                .from('tenant_members')
                .select('user_id')
                .eq('tenant_id', tenantId)
                .eq('role', 'tenant_owner')
                .single();

            let targetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/complete-payment?status=success`;

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
                        console.log(`[IYZICO-CALLBACK-V2] Generated Magic Link for ${userData.user.email}`);
                        return NextResponse.redirect(linkData.properties.action_link, 302);
                    }
                }
            }
        }

        // FALLBACK: User Lookup by Email if Tenant ID method failed or missing
        let targetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/complete-payment?status=success`;

        if (!tenantId || tenantId.length > 20) {
            const email = result.email || result.customerEmail || result.customer?.email;
            console.log(`[IYZICO-CALLBACK-V2] Fallback: Looking up user by email: ${email}`);

            if (email) {
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
                                console.log(`[IYZICO-CALLBACK-V2] Generated Magic Link for ${userData.user.email} (Email Fallback)`);
                                return NextResponse.redirect(linkData.properties.action_link, 302);
                            }
                        }
                    }
                }
            }
        }

        // Fail Redirect (If user lookup fails)
        console.log("[IYZICO-CALLBACK-V2] Session restoration failed - Fallback to standard redirect");

        // DEBUG: Flatten result keys to understand what we actually got
        const debugInfo = `TID:${tenantId || 'NULL'}-Email:${(result.email || result.customerEmail || 'NULL')}-K:${Object.keys(result).filter(k => k !== 'checkoutFormContent').join(',')}`;

        return NextResponse.redirect(`${targetUrl}&reason=SessionRestoreFailed-${debugInfo}&source=v2`, 302);

    } catch (error: any) {
        console.error("Iyzico Callback V2 Error:", error);
        const errorMsg = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error)) || "Unknown Error";
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/complete-payment?status=fail&reason=${encodeURIComponent(errorMsg)}&source=v2`, 302);
    }
}
