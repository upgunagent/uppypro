/**
 * Tur Rezervasyonu E-posta Bildirim Modülü
 * Rezervasyon oluşturulduğunda ve onaylandığında müşteriye bildirim maili gönderir.
 * İşletmenin SMTP ayarı varsa kendi mailinden, yoksa Resend (upgunai.com) ile gönderir.
 */

import nodemailer from "nodemailer";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend, EMAIL_FROM } from "@/lib/resend";

export interface TourBookingEmailData {
  type: "booking_created" | "booking_confirmed";
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  tourName: string;
  bookingDate: string;
  adultCount: number;
  childCount: number;
  totalPrice?: number;
  currency?: string;
  departureTime?: string;
  returnTime?: string;
  departurePoint?: string;
  route?: string;
  vehicleType?: string;
  depositAmount?: number;
  depositRequired?: boolean;
  paymentMethods?: string[];
  ibanInfo?: string[];
  paymentTerms?: string;
  selectedServices?: { name: string; total: number }[];
  description?: string;
}

/**
 * Tur rezervasyonu bildirim maili gönderir
 */
export async function sendTourBookingEmail(
  tenantId: string,
  data: TourBookingEmailData
): Promise<void> {
  if (!data.guestEmail) {
    console.warn("[Tour Email] Müşteri e-posta adresi yok, mail gönderilmedi.");
    return;
  }

  const supabase = createAdminClient();

  // Firma bilgisini al
  const { data: tenant } = await supabase
    .from("tenants")
    .select("name, phone, address, website, email, logo_url")
    .eq("id", tenantId)
    .maybeSingle();

  // Fatura bilgisinden ek iletişim bilgileri al (fallback)
  const { data: billingInfo } = await supabase
    .from("billing_info")
    .select("contact_email, contact_phone, company_name, address")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const businessName = tenant?.name || billingInfo?.company_name || "İşletme";
  const businessPhone = tenant?.phone || billingInfo?.contact_phone || "";
  const businessAddress = tenant?.address || billingInfo?.address || "";
  const businessWebsite = tenant?.website || "";
  const businessEmail = tenant?.email || billingInfo?.contact_email || "";

  // SMTP ayarlarını kontrol et
  const { data: emailSettings } = await supabase
    .from("email_settings")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const subject = data.type === "booking_created"
    ? `🎫 Tur Rezervasyonunuz Alındı — ${businessName}`
    : `✅ Tur Rezervasyonunuz Onaylandı — ${businessName}`;

  const html = buildTourEmailHtml(data, {
    businessName,
    businessPhone,
    businessAddress,
    businessWebsite,
    businessEmail,
  });

  try {
    if (emailSettings?.smtp_enabled && emailSettings?.smtp_host && emailSettings?.smtp_user) {
      await sendViaSMTP(emailSettings, data.guestEmail, subject, html, businessName);
    } else {
      await sendViaResend(data.guestEmail, subject, html, businessName, tenantId);
    }
    console.log(`[Tour Email] ${data.type} mail gönderildi: ${data.guestEmail}`);
  } catch (err: any) {
    console.error(`[Tour Email] Gönderim hatası:`, err.message);
  }
}

async function sendViaSMTP(
  settings: any,
  to: string,
  subject: string,
  html: string,
  businessName: string
) {
  const transporter = nodemailer.createTransport({
    host: settings.smtp_host,
    port: settings.smtp_port || 587,
    secure: settings.smtp_port === 465,
    auth: { user: settings.smtp_user, pass: settings.smtp_pass_encrypted },
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1' as any,
      secureOptions: crypto.constants?.SSL_OP_LEGACY_SERVER_CONNECT,
    },
  });

  await transporter.sendMail({
    from: `"${settings.smtp_from_name || businessName}" <${settings.smtp_user}>`,
    to,
    subject,
    html,
  });
}

async function sendViaResend(
  to: string,
  subject: string,
  html: string,
  businessName: string,
  tenantId: string
) {
  const supabase = createAdminClient();
  const { data: billing } = await supabase
    .from("billing_info")
    .select("contact_email")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject,
    html,
    replyTo: billing?.contact_email || undefined,
  });
}

interface BusinessInfo {
  businessName: string;
  businessPhone: string;
  businessAddress: string;
  businessWebsite: string;
  businessEmail: string;
}

function buildTourEmailHtml(data: TourBookingEmailData, biz: BusinessInfo): string {
  const isConfirmed = data.type === "booking_confirmed";
  const currency = data.currency || "TL";
  const totalGuests = data.adultCount + data.childCount;

  const headerColor = isConfirmed ? "#059669" : "#f59e0b";
  const headerIcon = isConfirmed ? "✅" : "🎫";
  const headerTitle = isConfirmed ? "Rezervasyonunuz Onaylandı!" : "Rezervasyonunuz Alındı!";
  const headerSubtitle = isConfirmed
    ? "Harika haber! Tur rezervasyonunuz onaylanmıştır."
    : "Rezervasyonunuz başarıyla oluşturuldu ve işletme onayı beklenmektedir.";

  // Build info rows
  let detailRows = `
    <tr>
      <td style="padding:10px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;width:140px;vertical-align:top;">🚢 Tur</td>
      <td style="padding:10px 16px;color:#0f172a;font-weight:700;font-size:14px;border-bottom:1px solid #f1f5f9;">${data.tourName}</td>
    </tr>
    <tr>
      <td style="padding:10px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">📅 Tarih</td>
      <td style="padding:10px 16px;color:#0f172a;font-weight:700;font-size:14px;border-bottom:1px solid #f1f5f9;">${formatDate(data.bookingDate)}</td>
    </tr>
    <tr>
      <td style="padding:10px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">👥 Kişi Sayısı</td>
      <td style="padding:10px 16px;color:#0f172a;font-weight:600;font-size:14px;border-bottom:1px solid #f1f5f9;">
        ${data.adultCount} Yetişkin${data.childCount > 0 ? ` + ${data.childCount} Çocuk` : ""} (Toplam ${totalGuests} kişi)
      </td>
    </tr>`;

  if (data.departureTime) {
    detailRows += `
    <tr>
      <td style="padding:10px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">⏰ Kalkış Saati</td>
      <td style="padding:10px 16px;color:#0f172a;font-weight:700;font-size:15px;border-bottom:1px solid #f1f5f9;">${data.departureTime}</td>
    </tr>`;
  }

  if (data.returnTime) {
    detailRows += `
    <tr>
      <td style="padding:10px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">🏁 Dönüş Saati</td>
      <td style="padding:10px 16px;color:#0f172a;font-weight:600;font-size:14px;border-bottom:1px solid #f1f5f9;">${data.returnTime}</td>
    </tr>`;
  }

  if (data.departurePoint) {
    detailRows += `
    <tr>
      <td style="padding:10px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">📍 Kalkış Noktası</td>
      <td style="padding:10px 16px;color:#0f172a;font-weight:600;font-size:14px;border-bottom:1px solid #f1f5f9;">${data.departurePoint}</td>
    </tr>`;
  }

  if (data.route) {
    detailRows += `
    <tr>
      <td style="padding:10px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">🗺️ Güzergah</td>
      <td style="padding:10px 16px;color:#0f172a;font-weight:600;font-size:14px;border-bottom:1px solid #f1f5f9;">${data.route}</td>
    </tr>`;
  }

  if (data.vehicleType) {
    detailRows += `
    <tr>
      <td style="padding:10px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">🚤 Araç Tipi</td>
      <td style="padding:10px 16px;color:#0f172a;font-weight:600;font-size:14px;border-bottom:1px solid #f1f5f9;">${data.vehicleType}</td>
    </tr>`;
  }

  // Seçilen ek hizmetler
  if (data.selectedServices && data.selectedServices.length > 0) {
    const svcList = data.selectedServices.map(s => `${s.name}: ${s.total} ${currency}`).join(", ");
    detailRows += `
    <tr>
      <td style="padding:10px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">🏷️ Ek Hizmetler</td>
      <td style="padding:10px 16px;color:#0f172a;font-weight:600;font-size:14px;border-bottom:1px solid #f1f5f9;">${svcList}</td>
    </tr>`;
  }

  if (data.description) {
    detailRows += `
    <tr>
      <td style="padding:10px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">📝 Notlar</td>
      <td style="padding:10px 16px;color:#0f172a;font-size:13px;border-bottom:1px solid #f1f5f9;">${data.description}</td>
    </tr>`;
  }

  // Ödeme bilgileri bölümü
  let paymentSection = "";
  if (data.totalPrice || data.depositRequired) {
    let paymentRows = "";

    if (data.totalPrice) {
      paymentRows += `
      <tr>
        <td style="padding:10px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">💰 Toplam Tutar</td>
        <td style="padding:10px 16px;color:#059669;font-weight:800;font-size:18px;border-bottom:1px solid #f1f5f9;">${data.totalPrice.toLocaleString("tr-TR")} ${currency}</td>
      </tr>`;
    }

    if (data.depositRequired && data.depositAmount) {
      const totalDeposit = data.depositAmount * totalGuests;
      paymentRows += `
      <tr>
        <td style="padding:10px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">💳 Kapora</td>
        <td style="padding:10px 16px;color:#dc2626;font-weight:700;font-size:15px;border-bottom:1px solid #f1f5f9;">
          ${totalDeposit.toLocaleString("tr-TR")} ${currency}
          <span style="color:#94a3b8;font-size:11px;font-weight:400;"> (${data.depositAmount} ${currency} × ${totalGuests} kişi)</span>
        </td>
      </tr>`;
    }

    if (data.paymentMethods && data.paymentMethods.length > 0) {
      paymentRows += `
      <tr>
        <td style="padding:10px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">🏦 Ödeme</td>
        <td style="padding:10px 16px;color:#0f172a;font-weight:600;font-size:13px;border-bottom:1px solid #f1f5f9;">${data.paymentMethods.join(" • ")}</td>
      </tr>`;
    }

    if (data.ibanInfo && data.ibanInfo.length > 0) {
      const ibanList = data.ibanInfo.map(i => `<div style="margin-bottom:4px;font-size:12px;">${i}</div>`).join("");
      paymentRows += `
      <tr>
        <td style="padding:10px 16px;color:#64748b;font-size:13px;vertical-align:top;">🏧 Banka Bilgileri</td>
        <td style="padding:10px 16px;color:#0f172a;font-weight:500;font-size:13px;">${ibanList}</td>
      </tr>`;
    }

    if (data.paymentTerms) {
      paymentRows += `
      <tr>
        <td colspan="2" style="padding:10px 16px;color:#64748b;font-size:12px;font-style:italic;">
          📋 ${data.paymentTerms}
        </td>
      </tr>`;
    }

    paymentSection = `
    <div style="margin-top:16px;">
      <div style="font-size:13px;font-weight:700;color:#334155;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">💰 Ödeme Bilgileri</div>
      <table style="width:100%;border-collapse:collapse;background:#f0fdf4;border-radius:10px;overflow:hidden;border:1px solid #bbf7d0;">
        ${paymentRows}
      </table>
    </div>`;
  }

  // Status badge for non-confirmed
  const statusBadge = isConfirmed
    ? `<div style="margin:20px 0;text-align:center;">
         <span style="display:inline-block;background:#dcfce7;color:#166534;font-weight:700;padding:10px 24px;border-radius:99px;font-size:14px;border:2px solid #86efac;">
           ✅ ONAYLANDI — Keyifli bir tur dileriz!
         </span>
       </div>`
    : `<div style="margin:20px 0;text-align:center;">
         <span style="display:inline-block;background:#fef9c3;color:#854d0e;font-weight:700;padding:10px 24px;border-radius:99px;font-size:13px;border:2px solid #fde047;">
           ⏳ İşletme onayı beklenmektedir. Onaylandığında size bilgi verilecektir.
         </span>
       </div>`;

  // İşletme bilgileri footer
  const contactItems: string[] = [];
  if (biz.businessPhone) contactItems.push(`📞 ${biz.businessPhone}`);
  if (biz.businessEmail) contactItems.push(`✉️ ${biz.businessEmail}`);
  if (biz.businessAddress) contactItems.push(`📍 ${biz.businessAddress}`);
  if (biz.businessWebsite) contactItems.push(`🌐 ${biz.businessWebsite}`);

  const contactBlock = contactItems.length > 0
    ? `<div style="margin-top:20px;padding:16px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;">
         <div style="font-size:12px;font-weight:700;color:#334155;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">📌 İşletme İletişim Bilgileri</div>
         <div style="color:#475569;font-size:13px;line-height:22px;">${contactItems.join("<br/>")}</div>
       </div>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f1f5f9;">
  <div style="max-width:580px;margin:24px auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,${headerColor} 0%,${headerColor}99 50%,${headerColor}cc 100%);padding:36px 24px;text-align:center;">
      <div style="font-size:48px;margin-bottom:12px;">${headerIcon}</div>
      <h1 style="color:white;margin:0;font-size:24px;font-weight:800;letter-spacing:-0.5px;">${headerTitle}</h1>
      <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px;line-height:1.5;">${headerSubtitle}</p>
      <div style="margin-top:12px;display:inline-block;background:rgba(255,255,255,0.2);padding:4px 16px;border-radius:99px;">
        <span style="color:white;font-weight:700;font-size:13px;">${biz.businessName}</span>
      </div>
    </div>

    <!-- Body -->
    <div style="padding:28px 24px;">
      <p style="color:#334155;font-size:15px;margin:0 0 6px;">
        Merhaba <strong>${data.guestName}</strong>,
      </p>
      <p style="color:#64748b;font-size:13px;margin:0 0 20px;">
        ${isConfirmed
          ? "Tur rezervasyonunuz onaylanmıştır. Aşağıda tüm detayları bulabilirsiniz:"
          : "Tur rezervasyonunuz başarıyla oluşturulmuştur. İşte rezervasyon detaylarınız:"}
      </p>

      <!-- Rezervasyon Detayları -->
      <div style="font-size:13px;font-weight:700;color:#334155;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">📋 Rezervasyon Detayları</div>
      <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        ${detailRows}
      </table>

      ${paymentSection}
      ${statusBadge}

      <!-- Müşteri Bilgileri -->
      <div style="padding:14px 16px;background:#eff6ff;border-radius:10px;border:1px solid #bfdbfe;margin-top:16px;">
        <div style="font-size:12px;font-weight:700;color:#1e40af;margin-bottom:6px;">👤 Müşteri Bilgileri</div>
        <div style="color:#334155;font-size:13px;line-height:22px;">
          <strong>${data.guestName}</strong><br/>
          ${data.guestEmail ? `✉️ ${data.guestEmail}<br/>` : ""}
          ${data.guestPhone ? `📱 ${data.guestPhone}` : ""}
        </div>
      </div>

      ${contactBlock}
    </div>

    <!-- Footer -->
    <div style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
      <p style="color:#94a3b8;font-size:11px;margin:0 0 4px;">
        Bu e-posta <strong>${biz.businessName}</strong> tarafından otomatik olarak gönderilmiştir.
      </p>
      <p style="color:#cbd5e1;font-size:10px;margin:0;">
        Powered by <a href="https://upgunai.com" style="color:#3b82f6;text-decoration:none;font-weight:600;">UpgunAI</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T12:00:00");
    const days = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
    const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${days[d.getDay()]}`;
  } catch {
    return dateStr;
  }
}
