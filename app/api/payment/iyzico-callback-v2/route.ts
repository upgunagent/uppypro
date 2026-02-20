import { NextResponse } from "next/server";
import { getSubscriptionCheckoutFormResult } from "@/lib/iyzico";
import { createAdminClient } from "@/lib/supabase/admin";
import { generatePdfBuffer } from "@/lib/pdf-generator";
import { sendSubscriptionWelcomeEmail } from "@/app/actions/email";

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
            return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/complete-payment?status=fail&reason=${encodeURIComponent(failReason)}&source=v2`, 302);
        }

        const subscriptionReferenceCode = result.subscriptionReferenceCode;
        const customerReferenceCode = result.customerReferenceCode;
        const pricingPlanReferenceCode = result.pricingPlanReferenceCode;

        const supabase = createAdminClient();

        // 1. Identify Tenant / User
        let tenantId = result.conversationId;
        let isReactivation = false; // Track if this is a reactivation

        // Fallback: lookup by token
        if (!tenantId || tenantId === 'undefined' || tenantId === 'null') {
            console.log(`[IYZICO-CALLBACK-V2] Tenant ID missing. Attempting lookup by Token: ${token}`);

            const { data: subData, error: subError } = await supabase
                .from('subscriptions')
                .select('tenant_id, status')
                .eq('iyzico_checkout_token', token)
                .single();

            if (subData && subData.tenant_id) {
                console.log(`[IYZICO-CALLBACK-V2] FOUND Tenant ID via Token: ${subData.tenant_id}, Status: ${subData.status}`);
                tenantId = subData.tenant_id;
                // If the subscription was canceled, this is a reactivation
                if (subData.status === 'canceled' || subData.status === 'past_due') {
                    isReactivation = true;
                }
            } else {
                console.error(`[IYZICO-CALLBACK-V2] Could not find subscription by token: ${token}`, subError);
            }
        }

        // Also check by tenantId if we got it from conversationId
        if (tenantId && !isReactivation) {
            const { data: existingSub } = await supabase
                .from('subscriptions')
                .select('status')
                .eq('tenant_id', tenantId)
                .eq('iyzico_checkout_token', token)
                .single();

            if (existingSub && (existingSub.status === 'canceled' || existingSub.status === 'past_due')) {
                isReactivation = true;
            }
        }

        if (!tenantId) {
            console.error("[IYZICO-CALLBACK-V2] Tenant ID missing!");
        }

        console.log(`[IYZICO-CALLBACK-V2] Processing TenantID: ${tenantId}, isReactivation: ${isReactivation}`);
        console.log(`[IYZICO-CALLBACK-V2] Reference codes from result: subscriptionReferenceCode=${subscriptionReferenceCode}, customerReferenceCode=${customerReferenceCode}, pricingPlanReferenceCode=${pricingPlanReferenceCode}, referenceCode=${result.referenceCode}`);

        if (tenantId) {
            const now = new Date();
            const nextMonth = new Date(now);
            nextMonth.setMonth(nextMonth.getMonth() + 1);

            const cardLast4 = result.lastFourDigits;
            const cardBrand = result.cardAssociation;
            const cardAssociation = result.cardFamily;

            // subscriptionReferenceCode fallback: referenceCode alanını da kontrol et
            const finalSubRefCode = subscriptionReferenceCode || result.referenceCode;

            // Sadece geçerli değerleri güncelle (undefined/null olan alanları DB'de eski halinde bırak)
            const updateData: any = {
                status: 'active',
                current_period_start: now.toISOString(),
                current_period_end: nextMonth.toISOString(),
                updated_at: now.toISOString(),
                canceled_at: null,
                cancel_at_period_end: false,
                cancel_reason: null,
            };

            // Referans kodlarını sadece doluysa güncelle
            if (finalSubRefCode) updateData.iyzico_subscription_reference_code = finalSubRefCode;
            if (customerReferenceCode) updateData.iyzico_customer_reference_code = customerReferenceCode;
            if (cardLast4) updateData.card_last4 = cardLast4;
            if (cardBrand) updateData.card_brand = cardBrand;
            if (cardAssociation) updateData.card_association = cardAssociation;

            console.log(`[IYZICO-CALLBACK-V2] Updating subscription with: ${JSON.stringify(updateData)}`);

            await supabase.from('subscriptions')
                .update(updateData)
                .eq('tenant_id', tenantId);

            // --- REACTIVATION: Skip welcome email, redirect to settings ---
            if (isReactivation) {
                console.log(`[IYZICO-CALLBACK-V2] Reactivation complete for tenant ${tenantId}. Redirecting to settings.`);

                const { data: member } = await supabase
                    .from('tenant_members')
                    .select('user_id')
                    .eq('tenant_id', tenantId)
                    .in('role', ['tenant_owner', 'owner', 'admin'])
                    .limit(1)
                    .single();

                const settingsUrl = `${process.env.NEXT_PUBLIC_APP_URL}/panel/settings?reactivated=true`;

                if (member && member.user_id) {
                    const { data: userData } = await supabase.auth.admin.getUserById(member.user_id);
                    if (userData?.user?.email) {
                        const { data: linkData } = await supabase.auth.admin.generateLink({
                            type: 'magiclink',
                            email: userData.user.email,
                            options: { redirectTo: settingsUrl }
                        });

                        if (linkData?.properties?.action_link) {
                            console.log(`[IYZICO-CALLBACK-V2] Reactivation magic link for ${userData.user.email}`);
                            return NextResponse.redirect(linkData.properties.action_link, 302);
                        }
                    }
                }

                // Fallback: direct redirect
                return NextResponse.redirect(settingsUrl, 302);
            }

            // --- NEW SUBSCRIPTION: Send welcome email ---
            try {
                const { data: tenantData } = await supabase.from('tenants').select('*').eq('id', tenantId).single();
                const { data: billingData } = await supabase.from('billing_info').select('*').eq('tenant_id', tenantId).single();

                if (tenantData) {
                    const buyerName = billingData?.billing_type === 'individual'
                        ? (billingData?.full_name || tenantData.name)
                        : (billingData?.company_name || tenantData.name);

                    const buyerEmail = billingData?.contact_email || result.email || result.customerEmail || "musteri@example.com";
                    const pricePaid = result.paidPrice || 0;

                    let finalPlanName = "UppyPro Abonelik";
                    let basePrice = pricePaid; // From Iyzico (might be 0 for subscriptions)

                    if (pricingPlanReferenceCode) {
                        const { data: pricingData } = await supabase
                            .from('pricing')
                            .select('monthly_price_try, products(name)')
                            .eq('iyzico_pricing_plan_reference_code', pricingPlanReferenceCode)
                            .single();

                        if (pricingData) {
                            finalPlanName = (pricingData.products as any)?.name || finalPlanName;
                            basePrice = pricingData.monthly_price_try || basePrice;
                        }
                    }

                    // monthly_price_try is KDV-excluded base price. Actual charged = base * 1.20
                    const totalWithKdv = basePrice * 1.2;
                    const formattedPriceToDisplay = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(totalWithKdv) + ' (KDV Dahil)';

                    console.log(`[IYZICO-CALLBACK-V2] Price: base=${basePrice}, total=${totalWithKdv}, plan=${finalPlanName}`);
                    console.log("[IYZICO-CALLBACK-V2] Generating PDF Agreement with pdfmake (VFS fonts)...");
                    const pdfBuffer = await generatePdfBuffer({
                        buyer: {
                            name: buyerName,
                            email: buyerEmail,
                            phone: billingData?.contact_phone || "",
                            address: billingData?.address_full || tenantData.address || "Adres belirtilmedi",
                            city: billingData?.address_city || tenantData.city || "Şehir",
                            district: billingData?.address_district || tenantData.district || "İlçe",
                            taxOffice: billingData?.tax_office,
                            taxNumber: billingData?.tax_number,
                            tckn: billingData?.tckn,
                        },
                        plan: {
                            name: finalPlanName,
                            price: basePrice,
                            total: totalWithKdv,
                        },
                        date: new Date().toLocaleDateString('tr-TR')
                    });
                    console.log(`[IYZICO-CALLBACK-V2] PDF generation result: ${pdfBuffer ? pdfBuffer.length + ' bytes' : 'NULL (failed)'}`);

                    // --- Anlaşmayı Supabase Storage'a Kaydet ---
                    let agreementUrl = "";
                    if (pdfBuffer) {
                        try {
                            const fileName = `${tenantId}/agreement_${Date.now()}.pdf`;
                            console.log(`[IYZICO-CALLBACK-V2] Uploading agreement to storage: ${fileName}`);

                            const { data: uploadData, error: uploadError } = await supabase.storage
                                .from('agreements')
                                .upload(fileName, pdfBuffer, {
                                    contentType: 'application/pdf',
                                    upsert: false,
                                });

                            if (uploadError) {
                                console.error("[IYZICO-CALLBACK-V2] Failed to upload agreement PDF:", uploadError);
                            } else {
                                const { data: urlData } = supabase.storage
                                    .from('agreements')
                                    .getPublicUrl(fileName);

                                agreementUrl = urlData.publicUrl;
                                console.log(`[IYZICO-CALLBACK-V2] Agreement saved temporarily. URL: ${agreementUrl}`);

                                // Update subscription with the agreement URL
                                await supabase.from('subscriptions')
                                    .update({ agreement_pdf_url: agreementUrl })
                                    .eq('tenant_id', tenantId);
                            }
                        } catch (storageErr) {
                            console.error("[IYZICO-CALLBACK-V2] Exception saving agreement to storage:", storageErr);
                        }
                    }
                    // ------------------------------------------

                    console.log(`[IYZICO-CALLBACK-V2] Sending Welcome Email to ${buyerEmail}...`);
                    await sendSubscriptionWelcomeEmail({
                        recipientEmail: buyerEmail,
                        recipientName: buyerName,
                        planName: finalPlanName,
                        priceFormatted: formattedPriceToDisplay,
                        billingCycle: "monthly",
                        nextPaymentDate: nextMonth.toLocaleDateString('tr-TR'),
                        agreementPdfBuffer: pdfBuffer || undefined
                    });
                    console.log(`[IYZICO-CALLBACK-V2] Welcome Email Sent successfully. PDF attached: ${!!pdfBuffer}`);
                }
            } catch (emailErr) {
                console.error("[IYZICO-CALLBACK-V2] Failed to send welcome email:", emailErr);
            }

            // New subscription: User Lookup & Magic Link
            const { data: member } = await supabase
                .from('tenant_members')
                .select('user_id')
                .eq('tenant_id', tenantId)
                .eq('role', 'tenant_owner')
                .single();

            let targetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/complete-payment?status=success`;

            if (member && member.user_id) {
                const { data: userData } = await supabase.auth.admin.getUserById(member.user_id);
                if (userData?.user?.email) {
                    const { data: linkData } = await supabase.auth.admin.generateLink({
                        type: 'magiclink',
                        email: userData.user.email,
                        options: { redirectTo: targetUrl }
                    });

                    if (linkData?.properties?.action_link) {
                        console.log(`[IYZICO-CALLBACK-V2] Generated Magic Link for ${userData.user.email}`);
                        return NextResponse.redirect(linkData.properties.action_link, 302);
                    }
                }
            }
        }

        // FALLBACK: User Lookup by Email
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
                        if (userData?.user?.email) {
                            const { data: linkData } = await supabase.auth.admin.generateLink({
                                type: 'magiclink',
                                email: userData.user.email,
                                options: { redirectTo: targetUrl }
                            });

                            if (linkData?.properties?.action_link) {
                                console.log(`[IYZICO-CALLBACK-V2] Generated Magic Link for ${userData.user.email} (Email Fallback)`);
                                return NextResponse.redirect(linkData.properties.action_link, 302);
                            }
                        }
                    }
                }
            }
        }

        console.log("[IYZICO-CALLBACK-V2] Session restoration failed - Fallback to standard redirect");
        const debugInfo = `TID:${tenantId || 'NULL'}-Email:${(result.email || result.customerEmail || 'NULL')}-K:${Object.keys(result).filter(k => k !== 'checkoutFormContent').join(',')}`;
        return NextResponse.redirect(`${targetUrl}&reason=SessionRestoreFailed-${debugInfo}&source=v2`, 302);

    } catch (error: any) {
        console.error("Iyzico Callback V2 Error:", error);
        const errorMsg = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error)) || "Unknown Error";
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/complete-payment?status=fail&reason=${encodeURIComponent(errorMsg)}&source=v2`, 302);
    }
}
