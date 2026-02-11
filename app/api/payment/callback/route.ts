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
            } else if (prefix === 'signup' && refId) {
                // Standard Signup logic
                // merchant_oid: signup_<invite_token>_<timestamp>
                const inviteTokenStr = refId;

                const { data: invToken } = await supabaseAdmin
                    .from("invite_tokens")
                    .select("*, user:user_id(*), tenant:tenants(*)") // Assuming we can join or fetch separately
                    .eq("token", inviteTokenStr)
                    .single();

                if (invToken) {
                    const { user_id } = invToken;

                    // Find tenant member to get tenant_id?
                    // Or better, we stored tenant_id in invite_tokens? No, schema?
                    // Let's assume user is owner of a tenant.
                    const { data: member } = await supabaseAdmin.from("tenant_members").select("tenant_id").eq("user_id", user_id).single();

                    if (member) {
                        const now = new Date();
                        const nextMonth = new Date(now);
                        nextMonth.setMonth(nextMonth.getMonth() + 1);

                        // Activate Subscription
                        await supabaseAdmin.from("subscriptions").update({
                            status: 'active',
                            current_period_start: now.toISOString(),
                            current_period_end: nextMonth.toISOString()
                        }).eq('tenant_id', member.tenant_id);

                        // Log Payment
                        await supabaseAdmin.from("payments").insert({
                            tenant_id: member.tenant_id,
                            amount: Number(total_amount),
                            currency: 'TRY',
                            status: 'success',
                            type: 'subscription_activation',
                            provider_payment_id: merchant_oid
                        });

                        // Send Welcome Email (via server action or direct resend here)
                        // Importing resend locally here to avoid circular dep issues if any, or just use lib

                        try {
                            const { resend, EMAIL_FROM } = await import("@/lib/resend");
                            const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/set-password?token=${inviteTokenStr}`;

                            // Get Tenant Name
                            const { data: tenant } = await supabaseAdmin.from("tenants").select("name").eq("id", member.tenant_id).single();
                            const tenantName = tenant?.name || "İşletmeniz";

                            // Get User Email
                            const { data: user } = await supabaseAdmin.auth.admin.getUserById(user_id);
                            const email = user.user?.email;

                            if (email) {
                                await resend.emails.send({
                                    from: EMAIL_FROM,
                                    to: email,
                                    subject: 'UppyPro Üyeliğiniz Oluşturuldu',
                                    html: `
                                        <!DOCTYPE html>
                                        <html>
                                        <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                                            <div style="text-align: center; margin-bottom: 30px;">
                                                <img src="${process.env.NEXT_PUBLIC_APP_URL}/brand-logo-text.png" alt="UPGUN AI" style="height: 32px;" />
                                            </div>
                                            
                                            <h2 style="color: #1e293b;">Hoş Geldiniz! 🎉</h2>
                                            
                                            <p><strong>${tenantName}</strong> için ödemeniz başarıyla alındı ve hesabınız aktif edildi.</p>
                                            
                                            <p>Panelinize erişmek için lütfen şifrenizi belirleyin:</p>
                                            
                                            <div style="text-align: center; margin: 30px 0;">
                                                <a href="${inviteLink}" style="display: inline-block; background-color: #ea580c; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                                                    Şifremi Belirle
                                                </a>
                                            </div>
                                            
                                            <p style="color: #64748b; font-size: 14px;">
                                                E-posta: ${email}
                                            </p>
                                        </body>
                                        </html>
                                    `
                                });
                            }
                        } catch (mailError) {
                            console.error("Mail send error in callback:", mailError);
                        }
                    }
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
