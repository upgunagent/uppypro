/**
 * E-posta Gönderim Modülü
 * Firma SMTP ayarı varsa kendi mailinden, yoksa Resend ile gönderir.
 */

import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend, EMAIL_FROM } from "@/lib/resend";

interface AppointmentEmailData {
  type: "appointment_created" | "appointment_cancelled" | "appointment_rescheduled";
  customerName: string;
  customerEmail: string;
  appointmentTitle: string;
  appointmentDate: string;
  employeeName?: string;
}

/**
 * Randevu bildirim maili gönderir
 * Firma SMTP ayarı varsa Nodemailer ile, yoksa Resend ile gönderir
 */
export async function sendAppointmentEmail(
  tenantId: string,
  data: AppointmentEmailData
): Promise<void> {
  if (!data.customerEmail) {
    console.warn("[Email] Müşteri e-posta adresi yok, mail gönderilmedi.");
    return;
  }

  const supabase = createAdminClient();

  // Firma bilgisini al
  const { data: tenant } = await supabase
    .from("tenants")
    .select("name")
    .eq("id", tenantId)
    .maybeSingle();

  const businessName = tenant?.name || "İşletme";

  // SMTP ayarlarını kontrol et
  const { data: emailSettings } = await supabase
    .from("email_settings")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const subject = getSubject(data.type, businessName);
  const html = getEmailHtml(data, businessName);

  if (emailSettings?.smtp_enabled && emailSettings?.smtp_host && emailSettings?.smtp_user) {
    // SMTP ile gönder (firmanın kendi maili)
    await sendViaSMTP(emailSettings, data.customerEmail, subject, html, businessName);
  } else {
    // Resend ile gönder (varsayılan)
    await sendViaResend(data.customerEmail, subject, html, businessName, tenantId);
  }
}

async function sendViaSMTP(
  settings: any,
  to: string,
  subject: string,
  html: string,
  businessName: string
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: settings.smtp_host,
    port: settings.smtp_port || 587,
    secure: settings.smtp_port === 465,
    auth: {
      user: settings.smtp_user,
      pass: settings.smtp_pass_encrypted, // TODO: decrypt if encrypted
    },
  });

  await transporter.sendMail({
    from: `"${settings.smtp_from_name || businessName}" <${settings.smtp_user}>`,
    to,
    subject,
    html,
  });

  console.log(`[Email] SMTP ile gönderildi: ${to} (from: ${settings.smtp_user})`);
}

async function sendViaResend(
  to: string,
  subject: string,
  html: string,
  businessName: string,
  tenantId: string
): Promise<void> {
  // Firma iletişim mailini Reply-To olarak al
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

  console.log(`[Email] Resend ile gönderildi: ${to}`);
}

function getSubject(
  type: string,
  businessName: string
): string {
  switch (type) {
    case "appointment_created":
      return `✅ Randevu Onayı — ${businessName}`;
    case "appointment_cancelled":
      return `❌ Randevu İptali — ${businessName}`;
    case "appointment_rescheduled":
      return `🔄 Randevu Güncellendi — ${businessName}`;
    default:
      return `📅 Randevu Bildirimi — ${businessName}`;
  }
}

function getEmailHtml(
  data: AppointmentEmailData,
  businessName: string
): string {
  const typeLabels: Record<string, { title: string; color: string; icon: string }> = {
    appointment_created: { title: "Randevunuz Onaylandı", color: "#16a34a", icon: "✅" },
    appointment_cancelled: { title: "Randevunuz İptal Edildi", color: "#dc2626", icon: "❌" },
    appointment_rescheduled: { title: "Randevunuz Güncellendi", color: "#2563eb", icon: "🔄" },
  };

  const label = typeLabels[data.type] || typeLabels.appointment_created;

  return `
    <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f8fafc;padding:24px;">
      <div style="max-width:520px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);">
        <div style="background:linear-gradient(135deg,${label.color} 0%,${label.color}cc 100%);padding:28px 24px;text-align:center;">
          <div style="font-size:40px;margin-bottom:8px;">${label.icon}</div>
          <h1 style="color:white;margin:0;font-size:22px;font-weight:700;">${label.title}</h1>
          <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">${businessName}</p>
        </div>
        <div style="padding:28px 24px;">
          <p style="color:#334155;font-size:15px;margin:0 0 20px;">
            Merhaba <strong>${data.customerName}</strong>,
          </p>
          <div style="background:#f1f5f9;border-radius:12px;padding:20px;margin-bottom:20px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:8px 0;color:#64748b;font-size:13px;width:100px;">İşlem</td>
                <td style="padding:8px 0;color:#0f172a;font-weight:600;font-size:14px;">${data.appointmentTitle}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#64748b;font-size:13px;">Tarih & Saat</td>
                <td style="padding:8px 0;color:#0f172a;font-weight:600;font-size:14px;">${data.appointmentDate}</td>
              </tr>
              ${data.employeeName ? `
              <tr>
                <td style="padding:8px 0;color:#64748b;font-size:13px;">Personel</td>
                <td style="padding:8px 0;color:#0f172a;font-weight:600;font-size:14px;">${data.employeeName}</td>
              </tr>` : ""}
            </table>
          </div>
          <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;">
            Bu e-posta ${businessName} tarafından otomatik olarak gönderilmiştir.
          </p>
        </div>
      </div>
    </div>
  `;
}

/**
 * SMTP bağlantısını test eder
 */
export async function testSmtpConnection(settings: {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const transporter = nodemailer.createTransport({
      host: settings.smtp_host,
      port: settings.smtp_port,
      secure: settings.smtp_port === 465,
      auth: {
        user: settings.smtp_user,
        pass: settings.smtp_pass,
      },
    });

    await transporter.verify();
    return { success: true, message: "SMTP bağlantısı başarılı!" };
  } catch (error: any) {
    return { success: false, message: "Bağlantı hatası: " + error.message };
  }
}
