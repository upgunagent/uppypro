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
        const hashStr = merchant_oid + MERCHANT_SALT + status + total_amount;
        const computedHash = crypto
            .createHmac("sha256", MERCHANT_KEY)
            .update(hashStr)
            .digest("base64");

        if (computedHash !== hash) {
            console.error("PayTR Hash Mismatch");
            return new NextResponse("OK");
        }

        if (status === 'success') {
            const supabaseAdmin = createAdminClient();

            // Parse merchant_oid (alphanumeric only format)
            // Format: ent<32chars><13chars> or signup<32chars><13chars>
            let prefix = '';
            let inviteToken = '';

            if (merchant_oid.startsWith('ent')) {
                prefix = 'ent';
                const tokenPart = merchant_oid.substring(3, 35);
                inviteToken = `${tokenPart.substring(0, 8)}-${tokenPart.substring(8, 12)}-${tokenPart.substring(12, 16)}-${tokenPart.substring(16, 20)}-${tokenPart.substring(20, 32)}`;
            } else if (merchant_oid.startsWith('signup')) {
                prefix = 'signup';
                const tokenPart = merchant_oid.substring(6, 38);
                inviteToken = `${tokenPart.substring(0, 8)}-${tokenPart.substring(8, 12)}-${tokenPart.substring(12, 16)}-${tokenPart.substring(16, 20)}-${tokenPart.substring(20, 32)}`;
            }

            if (prefix === 'ent' && inviteToken) {
                // Enterprise Invite Flow
                const { data: invite } = await supabaseAdmin
                    .from("enterprise_invite_tokens")
                    .select("tenant_id, user_id")
                    .eq("token", inviteToken)
                    .single();

                if (invite) {
                    const now = new Date();
                    const nextMonth = new Date(now);
                    nextMonth.setMonth(nextMonth.getMonth() + 1);

                    await supabaseAdmin.from("subscriptions").update({
                        status: 'active',
                        current_period_start: now.toISOString(),
                        current_period_end: nextMonth.toISOString()
                    }).eq('tenant_id', invite.tenant_id);

                    // Token will be marked as used when password is set
                    /*
                    await supabaseAdmin.from("enterprise_invite_tokens").update({
                        used_at: now.toISOString()
                    }).eq('token', inviteToken);
                    */

                    await supabaseAdmin.from("payments").insert({
                        tenant_id: invite.tenant_id,
                        amount: Number(total_amount),
                        currency: 'TRY',
                        status: 'success',
                        type: 'subscription_activation',
                        provider_payment_id: merchant_oid
                    });

                    // Send password setup email
                    try {
                        const { resend, EMAIL_FROM } = await import("@/lib/resend");
                        const setPasswordLink = `${process.env.NEXT_PUBLIC_APP_URL}/set-password?token=${inviteToken}`;

                        const { data: tenant } = await supabaseAdmin.from("tenants").select("name").eq("id", invite.tenant_id).single();
                        const tenantName = tenant?.name || "İşletmeniz";

                        const { data: user } = await supabaseAdmin.auth.admin.getUserById(invite.user_id);
                        const email = user.user?.email;

                        if (email) {
                            await resend.emails.send({
                                from: EMAIL_FROM,
                                to: email,
                                subject: 'UppyPro Aboneliğiniz Başarıyla Aktif Edildi! 🎉',
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
                                            <a href="${setPasswordLink}" style="display: inline-block; background-color: #ea580c; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                                                Şifremi Belirle
                                            </a>
                                        </div>
                                        
                                        <p style="color: #64748b; font-size: 14px;">Eğer bu işlemi siz yapmadıysanız, lütfen bu e-postayı dikkate almayın.</p>
                                        
                                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
                                        
                                        <p style="color: #94a3b8; font-size: 12px; text-align: center;">
                                            © 2024 UPGUN AI. Tüm hakları saklıdır.
                                        </p>
                                    </body>
                                    </html>
                                `
                            });
                        }
                    } catch (mailError) {
                        console.error("Mail send error in enterprise callback:", mailError);
                    }
                }
            } else if (prefix === 'signup' && inviteToken) {
                // Standard Signup Flow
                const { data: invToken } = await supabaseAdmin
                    .from("invite_tokens")
                    .select("user_id")
                    .eq("token", inviteToken)
                    .single();

                if (invToken) {
                    const { user_id } = invToken;
                    const { data: member } = await supabaseAdmin
                        .from("tenant_members")
                        .select("tenant_id")
                        .eq("user_id", user_id)
                        .single();

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

                        // Send Welcome Email
                        try {
                            const { resend, EMAIL_FROM } = await import("@/lib/resend");
                            const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/set-password?token=${inviteToken}`;

                            const { data: tenant } = await supabaseAdmin.from("tenants").select("name").eq("id", member.tenant_id).single();
                            const tenantName = tenant?.name || "İşletmeniz";
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
        return new NextResponse("OK");
    }
}
