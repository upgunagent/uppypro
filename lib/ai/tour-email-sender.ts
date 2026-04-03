/**
 * Tur Rezervasyonu E-posta Bildirim Modulu
 * Rezervasyon olusturuldugunda ve onaylandiginda musteriye bildirim maili gonderir.
 * Isletmenin SMTP ayari varsa kendi mailinden, yoksa Resend (upgunai.com) ile gonderir.
 */

import nodemailer from "nodemailer";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend, EMAIL_FROM } from "@/lib/resend";

export interface TourBookingEmailData {
  type: "booking_created" | "booking_confirmed" | "booking_cancelled" | "booking_modified";
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
  oldAdultCount?: number;
  oldChildCount?: number;
  oldTotalPrice?: number;
}

export async function sendTourBookingEmail(
  tenantId: string,
  data: TourBookingEmailData
): Promise<void> {
  if (!data.guestEmail) {
    console.warn("[Tour Email] Musteri e-posta adresi yok, mail gonderilmedi.");
    return;
  }

  const supabase = createAdminClient();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("name")
    .eq("id", tenantId)
    .maybeSingle();

  const { data: billingInfo } = await supabase
    .from("billing_info")
    .select("contact_email, contact_phone, company_name, address")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const businessName = tenant?.name || billingInfo?.company_name || "Isletme";
  const businessPhone = billingInfo?.contact_phone || "";
  const businessAddress = billingInfo?.address || "";
  const businessEmail = billingInfo?.contact_email || "";

  const { data: emailSettings } = await supabase
    .from("email_settings")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const subjectMap: Record<string, string> = {
    booking_created: `Tur Rezervasyonunuz Alindi - ${businessName}`,
    booking_confirmed: `Tur Rezervasyonunuz Onaylandi - ${businessName}`,
    booking_cancelled: `Tur Rezervasyonunuz Iptal Edildi - ${businessName}`,
    booking_modified: `Tur Rezervasyonunuz Guncellendi - ${businessName}`,
  };
  const subject = subjectMap[data.type] || `Tur Rezervasyon Bildirimi - ${businessName}`;

  const html = buildTourEmailHtml(data, {
    businessName,
    businessPhone,
    businessAddress,
    businessEmail,
  });

  try {
    if (emailSettings?.smtp_enabled && emailSettings?.smtp_host && emailSettings?.smtp_user) {
      await sendViaSMTP(emailSettings, data.guestEmail, subject, html, businessName);
    } else {
      await sendViaResend(data.guestEmail, subject, html, businessName, tenantId);
    }
    console.log(`[Tour Email] ${data.type} mail gonderildi: ${data.guestEmail}`);
  } catch (err: any) {
    console.error(`[Tour Email] Gonderim hatasi:`, err.message);
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
  businessEmail: string;
}

function buildTourEmailHtml(data: TourBookingEmailData, biz: BusinessInfo): string {
  const currency = data.currency || "TL";
  const totalGuests = data.adultCount + data.childCount;

  const styleMap: Record<string, { color: string; title: string; subtitle: string }> = {
    booking_created: {
      color: "#f59e0b",
      title: "Rezervasyonunuz Alindi!",
      subtitle: "Rezervasyonunuz basariyla olusturuldu ve isletme onayi beklenmektedir.",
    },
    booking_confirmed: {
      color: "#059669",
      title: "Rezervasyonunuz Onaylandi!",
      subtitle: "Harika haber! Tur rezervasyonunuz onaylanmistir.",
    },
    booking_cancelled: {
      color: "#dc2626",
      title: "Rezervasyonunuz Iptal Edildi",
      subtitle: "Tur rezervasyonunuz iptal edilmistir.",
    },
    booking_modified: {
      color: "#2563eb",
      title: "Rezervasyonunuz Guncellendi",
      subtitle: "Tur rezervasyonunuzda degisiklik yapilmistir.",
    },
  };

  const style = styleMap[data.type] || styleMap.booking_created;
  const headerColor = style.color;
  const headerTitle = style.title;
  const headerSubtitle = style.subtitle;

  // Detail rows
  let detailRows = `
    <tr>
      <td style="padding:10px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;width:140px;vertical-align:top;">Tur</td>
      <td style="padding:10px 16px;color:#0f172a;font-weight:700;font-size:14px;border-bottom:1px solid #f1f5f9;">${data.tourName}</td>
    </tr>
    <tr>
      <td style="padding:10px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">Tarih</td>
      <td style="padding:10px 16px;color:#0f172a;font-weight:700;font-size:14px;border-bottom:1px solid #f1f5f9;">${formatDate(data.bookingDate)}</td>
    </tr>
    <tr>
      <td style="padding:10px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">Kisi Sayisi</td>
      <td style="padding:10px 16px;color:#0f172a;font-weight:600;font-size:14px;border-bottom:1px solid #f1f5f9;">
        ${data.adultCount} Yetiskin${data.childCount > 0 ? ` + ${data.childCount} Cocuk` : ""} (Toplam ${totalGuests} kisi)
      </td>
    </tr>`;

  if (data.departureTime) {
    detailRows += `
    <tr>
      <td style="padding:10px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">Kalkis Saati</td>
      <td style="padding:10px 16px;color:#0f172a;font-weight:700;font-size:15px;border-bottom:1px solid #f1f5f9;">${data.departureTime}</td>
    </tr>`;
  }

  if (data.returnTime) {
    detailRows += `
    <tr>
      <td style="padding:10px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">Donus Saati</td>
      <td style="padding:10px 16px;color:#0f172a;font-weight:600;font-size:14px;border-bottom:1px solid #f1f5f9;">${data.returnTime}</td>
    </tr>`;
  }

  if (data.departurePoint) {
    detailRows += `
    <tr>
      <td style="padding:10px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">Kalkis Noktasi</td>
      <td style="padding:10px 16px;color:#0f172a;font-weight:600;font-size:14px;border-bottom:1px solid #f1f5f9;">${data.departurePoint}</td>
    </tr>`;
  }

  if (data.route) {
    detailRows += `
    <tr>
      <td style="padding:10px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">Guzergah</td>
      <td style="padding:10px 16px;color:#0f172a;font-weight:600;font-size:14px;border-bottom:1px solid #f1f5f9;">${data.route}</td>
    </tr>`;
  }

  if (data.vehicleType) {
    detailRows += `
    <tr>
      <td style="padding:10px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">Arac Tipi</td>
      <td style="padding:10px 16px;color:#0f172a;font-weight:600;font-size:14px;border-bottom:1px solid #f1f5f9;">${data.vehicleType}</td>
    </tr>`;
  }

  if (data.selectedServices && data.selectedServices.length > 0) {
    const svcList = data.selectedServices.map(s => `${s.name}: ${s.total} ${currency}`).join(", ");
    detailRows += `
    <tr>
      <td style="padding:10px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">Ek Hizmetler</td>
      <td style="padding:10px 16px;color:#0f172a;font-weight:600;font-size:14px;border-bottom:1px solid #f1f5f9;">${svcList}</td>
    </tr>`;
  }

  if (data.description) {
    detailRows += `
    <tr>
      <td style="padding:10px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">Notlar</td>
      <td style="padding:10px 16px;color:#0f172a;font-size:13px;border-bottom:1px solid #f1f5f9;">${data.description}</td>
    </tr>`;
  }

  // Payment section
  let paymentSection = "";
  if (data.totalPrice || data.depositRequired) {
    let paymentRows = "";

    if (data.totalPrice) {
      paymentRows += `
      <tr>
        <td style="padding:10px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">Toplam Tutar</td>
        <td style="padding:10px 16px;color:#059669;font-weight:800;font-size:18px;border-bottom:1px solid #f1f5f9;">${data.totalPrice.toLocaleString("tr-TR")} ${currency}</td>
      </tr>`;
    }

    if (data.depositRequired && data.depositAmount) {
      const totalDeposit = data.depositAmount * totalGuests;
      paymentRows += `
      <tr>
        <td style="padding:10px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">Kapora</td>
        <td style="padding:10px 16px;color:#dc2626;font-weight:700;font-size:15px;border-bottom:1px solid #f1f5f9;">
          ${totalDeposit.toLocaleString("tr-TR")} ${currency}
          <span style="color:#94a3b8;font-size:11px;font-weight:400;"> (${data.depositAmount} ${currency} x ${totalGuests} kisi)</span>
        </td>
      </tr>`;
    }

    if (data.paymentMethods && data.paymentMethods.length > 0) {
      paymentRows += `
      <tr>
        <td style="padding:10px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">Odeme Yontemi</td>
        <td style="padding:10px 16px;color:#0f172a;font-weight:600;font-size:13px;border-bottom:1px solid #f1f5f9;">${data.paymentMethods.join(" / ")}</td>
      </tr>`;
    }

    if (data.ibanInfo && data.ibanInfo.length > 0) {
      const ibanList = data.ibanInfo.map(i => `<div style="margin-bottom:4px;font-size:12px;">${i}</div>`).join("");
      paymentRows += `
      <tr>
        <td style="padding:10px 16px;color:#64748b;font-size:13px;vertical-align:top;">Banka Bilgileri</td>
        <td style="padding:10px 16px;color:#0f172a;font-weight:500;font-size:13px;">${ibanList}</td>
      </tr>`;
    }

    if (data.paymentTerms) {
      paymentRows += `
      <tr>
        <td colspan="2" style="padding:10px 16px;color:#64748b;font-size:12px;font-style:italic;">
          ${data.paymentTerms}
        </td>
      </tr>`;
    }

    paymentSection = `
    <div style="margin-top:16px;">
      <div style="font-size:13px;font-weight:700;color:#334155;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">Odeme Bilgileri</div>
      <table style="width:100%;border-collapse:collapse;background:#f0fdf4;border-radius:10px;overflow:hidden;border:1px solid #bbf7d0;">
        ${paymentRows}
      </table>
    </div>`;
  }

  // Modification info
  let modificationInfo = "";
  if (data.type === "booking_modified" && (data.oldAdultCount !== undefined || data.oldChildCount !== undefined)) {
    const oldTotal = (data.oldAdultCount || 0) + (data.oldChildCount || 0);
    modificationInfo = `
    <div style="margin:16px 0;padding:14px 16px;background:#eff6ff;border-radius:10px;border:1px solid #bfdbfe;">
      <div style="font-size:12px;font-weight:700;color:#1e40af;margin-bottom:8px;">Yapilan Degisiklikler</div>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:4px 0;color:#64748b;font-size:13px;width:100px;">Onceki</td>
          <td style="padding:4px 0;color:#94a3b8;font-size:13px;text-decoration:line-through;">${data.oldAdultCount || 0}Y + ${data.oldChildCount || 0}C = ${oldTotal} kisi${data.oldTotalPrice ? ` - ${data.oldTotalPrice.toLocaleString("tr-TR")} ${currency}` : ""}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:#64748b;font-size:13px;">Yeni</td>
          <td style="padding:4px 0;color:#059669;font-weight:700;font-size:13px;">${data.adultCount}Y + ${data.childCount}C = ${totalGuests} kisi${data.totalPrice ? ` - ${data.totalPrice.toLocaleString("tr-TR")} ${currency}` : ""}</td>
        </tr>
      </table>
    </div>`;
  }

  // Status badge
  const statusBadgeMap: Record<string, string> = {
    booking_confirmed: `<div style="margin:20px 0;text-align:center;">
         <span style="display:inline-block;background:#dcfce7;color:#166534;font-weight:700;padding:10px 24px;border-radius:99px;font-size:14px;border:2px solid #86efac;">
           ONAYLANDI - Keyifli bir tur dileriz!
         </span>
       </div>`,
    booking_created: `<div style="margin:20px 0;text-align:center;">
         <span style="display:inline-block;background:#fef9c3;color:#854d0e;font-weight:700;padding:10px 24px;border-radius:99px;font-size:13px;border:2px solid #fde047;">
           Isletme onayi beklenmektedir. Onaylandiginda size bilgi verilecektir.
         </span>
       </div>`,
    booking_cancelled: `<div style="margin:20px 0;text-align:center;">
         <span style="display:inline-block;background:#fee2e2;color:#991b1b;font-weight:700;padding:10px 24px;border-radius:99px;font-size:14px;border:2px solid #fca5a5;">
           IPTAL EDILDI
         </span>
       </div>`,
    booking_modified: `<div style="margin:20px 0;text-align:center;">
         <span style="display:inline-block;background:#dbeafe;color:#1e40af;font-weight:700;padding:10px 24px;border-radius:99px;font-size:14px;border:2px solid #93c5fd;">
           GUNCELLEME YAPILDI
         </span>
       </div>`,
  };
  const statusBadge = statusBadgeMap[data.type] || "";

  // Contact footer
  const contactItems: string[] = [];
  if (biz.businessPhone) contactItems.push(`Tel: ${biz.businessPhone}`);
  if (biz.businessEmail) contactItems.push(`E-posta: ${biz.businessEmail}`);
  if (biz.businessAddress) contactItems.push(`Adres: ${biz.businessAddress}`);

  const contactBlock = contactItems.length > 0
    ? `<div style="margin-top:20px;padding:16px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;">
         <div style="font-size:12px;font-weight:700;color:#334155;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">Isletme Iletisim Bilgileri</div>
         <div style="color:#475569;font-size:13px;line-height:22px;">${contactItems.join("<br/>")}</div>
       </div>`
    : "";

  const bodyTextMap: Record<string, string> = {
    booking_created: "Tur rezervasyonunuz basariyla olusturulmustur. Iste rezervasyon detaylariniz:",
    booking_confirmed: "Tur rezervasyonunuz onaylanmistir. Asagida tum detaylari bulabilirsiniz:",
    booking_cancelled: "Tur rezervasyonunuz iptal edilmistir. Iptal edilen rezervasyonun detaylari asagidadir:",
    booking_modified: "Tur rezervasyonunuzda degisiklik yapilmistir. Guncel detaylar asagidadir:",
  };

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f1f5f9;">
  <div style="max-width:580px;margin:24px auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.1);">
    
    <div style="background:linear-gradient(135deg,${headerColor} 0%,${headerColor}99 50%,${headerColor}cc 100%);padding:36px 24px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:24px;font-weight:800;letter-spacing:-0.5px;">${headerTitle}</h1>
      <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px;line-height:1.5;">${headerSubtitle}</p>
      <div style="margin-top:12px;display:inline-block;background:rgba(255,255,255,0.2);padding:4px 16px;border-radius:99px;">
        <span style="color:white;font-weight:700;font-size:13px;">${biz.businessName}</span>
      </div>
    </div>

    <div style="padding:28px 24px;">
      <p style="color:#334155;font-size:15px;margin:0 0 6px;">
        Merhaba <strong>${data.guestName}</strong>,
      </p>
      <p style="color:#64748b;font-size:13px;margin:0 0 20px;">
        ${bodyTextMap[data.type] || ""}
      </p>

      <div style="font-size:13px;font-weight:700;color:#334155;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">Rezervasyon Detaylari</div>
      <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        ${detailRows}
      </table>

      ${modificationInfo}
      ${data.type !== "booking_cancelled" ? paymentSection : ""}
      ${statusBadge}

      <div style="padding:14px 16px;background:#eff6ff;border-radius:10px;border:1px solid #bfdbfe;margin-top:16px;">
        <div style="font-size:12px;font-weight:700;color:#1e40af;margin-bottom:6px;">Musteri Bilgileri</div>
        <div style="color:#334155;font-size:13px;line-height:22px;">
          <strong>${data.guestName}</strong><br/>
          ${data.guestEmail ? `E-posta: ${data.guestEmail}<br/>` : ""}
          ${data.guestPhone ? `Telefon: ${data.guestPhone}` : ""}
        </div>
      </div>

      ${contactBlock}
    </div>

    <div style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
      <p style="color:#94a3b8;font-size:11px;margin:0 0 4px;">
        Bu e-posta <strong>${biz.businessName}</strong> tarafindan otomatik olarak gonderilmistir.
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
    const days = ["Pazar", "Pazartesi", "Sali", "Carsamba", "Persembe", "Cuma", "Cumartesi"];
    const months = ["Ocak", "Subat", "Mart", "Nisan", "Mayis", "Haziran", "Temmuz", "Agustos", "Eylul", "Ekim", "Kasim", "Aralik"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${days[d.getDay()]}`;
  } catch {
    return dateStr;
  }
}
