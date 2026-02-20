"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { resend, EMAIL_FROM } from "@/lib/resend";

// =============================================
// Tüm işlemleri listele (Admin)
// =============================================
export async function getAllTransactions(filters?: {
    search?: string;
    dateFrom?: string;
    dateTo?: string;
}) {
    const adminDb = createAdminClient();

    // 1. Tüm abonelikleri çek (tenant bilgisiyle)
    const { data: subscriptions } = await adminDb
        .from("subscriptions")
        .select(`
            id,
            tenant_id,
            status,
            iyzico_subscription_reference_code,
            base_product_key,
            ai_product_key,
            billing_cycle,
            tenants!inner (
                id,
                name,
                owner_email
            )
        `)
        .not("iyzico_subscription_reference_code", "is", null);

    if (!subscriptions || subscriptions.length === 0) {
        return { transactions: [], error: null };
    }

    // 2. Her abonelik için Iyzico'dan order'ları çek
    const { getSubscriptionDetails } = await import("@/lib/iyzico");

    const allTransactions: any[] = [];

    for (const sub of subscriptions) {
        if (!sub.iyzico_subscription_reference_code) continue;

        try {
            const details = await getSubscriptionDetails(sub.iyzico_subscription_reference_code);
            if (details?.status === 'success' && details.orders) {
                for (const order of details.orders) {
                    const tenant = sub.tenants as any;
                    allTransactions.push({
                        orderReferenceCode: order.referenceCode,
                        subscriptionReferenceCode: sub.iyzico_subscription_reference_code,
                        tenantId: sub.tenant_id,
                        tenantName: tenant?.name || '-',
                        tenantEmail: tenant?.owner_email || '-',
                        planName: sub.ai_product_key === 'uppypro_ai' ? 'UppyPro AI' : 'UppyPro Inbox',
                        amount: order.price,
                        currency: order.currencyCode || 'TRY',
                        paymentDate: order.startPeriod || order.createdDate,
                        orderStatus: order.orderStatus || order.paymentStatus || 'UNKNOWN',
                    });
                }
            }
        } catch (e) {
            console.error(`[TRANSACTIONS] Error fetching details for ${sub.iyzico_subscription_reference_code}:`, e);
        }
    }

    // 3. Filtreleme
    let filtered = allTransactions;

    if (filters?.search) {
        const search = filters.search.toLowerCase();
        filtered = filtered.filter(t =>
            t.tenantName.toLowerCase().includes(search) ||
            t.tenantEmail.toLowerCase().includes(search)
        );
    }

    if (filters?.dateFrom) {
        const from = new Date(filters.dateFrom);
        filtered = filtered.filter(t => new Date(t.paymentDate) >= from);
    }

    if (filters?.dateTo) {
        const to = new Date(filters.dateTo);
        to.setHours(23, 59, 59);
        filtered = filtered.filter(t => new Date(t.paymentDate) <= to);
    }

    // Tarihe göre sırala (yeniden eskiye)
    filtered.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

    // 4. Fatura bilgisini eşleştir
    const orderRefs = filtered.map(t => t.orderReferenceCode).filter(Boolean);
    const { data: invoices } = await adminDb
        .from("invoices")
        .select("*")
        .in("iyzico_order_reference_code", orderRefs.length > 0 ? orderRefs : ['__none__']);

    const invoiceMap = new Map();
    if (invoices) {
        for (const inv of invoices) {
            invoiceMap.set(inv.iyzico_order_reference_code, inv);
        }
    }

    const result = filtered.map(t => ({
        ...t,
        invoice: invoiceMap.get(t.orderReferenceCode) || null,
    }));

    return { transactions: result, error: null };
}

// =============================================
// Fatura PDF yükle ve kaydet
// =============================================
export async function uploadInvoice(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Yetkilendirme hatası." };

    const adminDb = createAdminClient();

    const file = formData.get("file") as File;
    const tenantId = formData.get("tenantId") as string;
    const orderReferenceCode = formData.get("orderReferenceCode") as string;
    const subscriptionReferenceCode = formData.get("subscriptionReferenceCode") as string;
    const amount = parseFloat(formData.get("amount") as string);
    const planName = formData.get("planName") as string;
    const paymentDate = formData.get("paymentDate") as string;

    if (!file || !tenantId || !orderReferenceCode) {
        return { error: "Eksik bilgi." };
    }

    // Supabase Storage'a yükle
    const fileName = `${tenantId}/${Date.now()}_${file.name}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { data: uploadData, error: uploadError } = await adminDb.storage
        .from("invoices")
        .upload(fileName, fileBuffer, {
            contentType: file.type || 'application/pdf',
            upsert: false,
        });

    if (uploadError) {
        console.error("[INVOICE] Upload error:", uploadError);
        return { error: "PDF yüklenemedi: " + uploadError.message };
    }

    // Public URL al
    const { data: urlData } = adminDb.storage
        .from("invoices")
        .getPublicUrl(fileName);

    // Invoices tablosuna kaydet
    const { data: invoice, error: dbError } = await adminDb
        .from("invoices")
        .insert({
            tenant_id: tenantId,
            iyzico_order_reference_code: orderReferenceCode,
            iyzico_subscription_reference_code: subscriptionReferenceCode,
            amount: amount,
            plan_name: planName,
            payment_date: paymentDate,
            invoice_pdf_url: urlData.publicUrl,
            invoice_pdf_path: fileName,
            created_by: user.id,
        })
        .select()
        .single();

    if (dbError) {
        console.error("[INVOICE] DB insert error:", dbError);
        return { error: "Fatura kaydedilemedi: " + dbError.message };
    }

    revalidatePath("/admin/transactions");
    return { success: true, invoice };
}

// =============================================
// Fatura mailini gönder
// =============================================
export async function sendInvoiceEmail(invoiceId: string) {
    const adminDb = createAdminClient();

    // Fatura bilgisini çek
    const { data: invoice, error } = await adminDb
        .from("invoices")
        .select(`
            *,
            tenants!inner (
                name,
                owner_email
            )
        `)
        .eq("id", invoiceId)
        .single();

    if (error || !invoice) {
        return { error: "Fatura bulunamadı." };
    }

    const tenant = invoice.tenants as any;
    if (!tenant?.owner_email) {
        return { error: "Kullanıcı e-posta adresi bulunamadı." };
    }

    // PDF'i indir
    let pdfBuffer: Buffer | null = null;
    if (invoice.invoice_pdf_url) {
        try {
            const response = await fetch(invoice.invoice_pdf_url);
            if (response.ok) {
                pdfBuffer = Buffer.from(await response.arrayBuffer());
            }
        } catch (e) {
            console.error("[INVOICE] PDF download error:", e);
        }
    }

    const logoUrl = `${process.env.NEXT_PUBLIC_APP_URL}/brand-logo-text.png`;
    const paymentDate = new Date(invoice.payment_date || invoice.created_at);
    const formattedDate = paymentDate.toLocaleString('tr-TR', {
        timeZone: 'Europe/Istanbul',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
    const formattedAmount = new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: invoice.currency || 'TRY'
    }).format(invoice.amount);

    const htmlContent = generateInvoiceEmailHtml({
        recipientName: tenant.name,
        planName: invoice.plan_name || 'UppyPro',
        amount: formattedAmount,
        paymentDate: formattedDate,
        logoUrl,
    });

    // Mail gönder
    try {
        const emailPayload: any = {
            from: EMAIL_FROM,
            to: [tenant.owner_email],
            subject: `Faturanız - ${invoice.plan_name || 'UppyPro'} Abonelik Ödemesi`,
            html: htmlContent,
        };

        if (pdfBuffer) {
            emailPayload.attachments = [{
                filename: `Fatura_${formattedDate.replace(/\s/g, '_')}.pdf`,
                content: pdfBuffer,
            }];
        }

        const { error: emailError } = await resend.emails.send(emailPayload);

        if (emailError) {
            console.error("[INVOICE] Email error:", emailError);
            return { error: "E-posta gönderilemedi: " + emailError.message };
        }

        // Mail gönderildi olarak işaretle
        await adminDb
            .from("invoices")
            .update({
                email_sent: true,
                email_sent_at: new Date().toISOString(),
            })
            .eq("id", invoiceId);

        revalidatePath("/admin/transactions");
        return { success: true };
    } catch (e: any) {
        console.error("[INVOICE] Email exception:", e);
        return { error: "Mail gönderim hatası: " + e.message };
    }
}

// =============================================
// Tenant'ın faturalarını getir (Kullanıcı paneli)
// =============================================
export async function getInvoicesForTenant(tenantId: string) {
    const adminDb = createAdminClient();

    const { data: invoices } = await adminDb
        .from("invoices")
        .select("id, iyzico_order_reference_code, invoice_pdf_url, amount, plan_name, payment_date, email_sent")
        .eq("tenant_id", tenantId)
        .order("payment_date", { ascending: false });

    return invoices || [];
}

import { generateInvoiceEmailHtml } from "@/lib/invoice-template";
