"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { resend, EMAIL_FROM } from "@/lib/resend";

export async function sendPasswordResetEmail(email: string) {
    const supabaseAdmin = createAdminClient();

    try {
        // Generate Recovery Link
        const { data, error } = await supabaseAdmin.auth.admin.generateLink({
            type: "recovery",
            email: email,
            options: {
                redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/update-password`
            }
        });

        if (error) {
            console.error("Link generation error:", error);
            return { error: "Link oluşturulamadı." };
        }

        const { user, properties } = data;
        const resetLink = properties.action_link;

        // Send Email via Resend
        const { error: emailError } = await resend.emails.send({
            from: EMAIL_FROM,
            to: email,
            subject: 'UppyPro Şifre Sıfırlama',
            html: `
                <h1>Şifrenizi Sıfırlayın</h1>
                <p>Hesabınız için şifre sıfırlama talebinde bulundunuz.</p>
                <p>Aşağıdaki bağlantıya tıklayarak şifrenizi yenileyebilirsiniz:</p>
                <a href="${resetLink}" style="display:inline-block;padding:10px 20px;background:#ea580c;color:white;text-decoration:none;border-radius:5px;">Şifremi Sıfırla</a>
                <p>Eğer bu talebi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
            `
        });

        if (emailError) {
            console.error("Resend error:", emailError);
            return { error: "E-posta gönderilemedi." };
        }

        return { success: true };

    } catch (err: any) {
        console.error("Reset Password Action Error:", err);
        return { error: err.message };
    }
}

interface AppointmentEmailProps {
    recipientEmail: string;
    recipientName: string;
    businessName: string;
    businessLogoUrl?: string; // Optional
    businessPhone?: string; // Optional
    eventTitle: string;
    startTime: string; // ISO String or formatted
    endTime: string;
}

export async function sendAppointmentEmail(props: AppointmentEmailProps) {
    const { recipientEmail, recipientName, businessName, businessLogoUrl, businessPhone, eventTitle, startTime, endTime } = props;

    // Formatting date using Intl
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };

    const formattedDate = startDate.toLocaleDateString('tr-TR', dateOptions);
    const formattedStartTime = startDate.toLocaleTimeString('tr-TR', timeOptions);
    const formattedEndTime = endDate.toLocaleTimeString('tr-TR', timeOptions);

    const htmlContent = `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Randevu Onayı</title>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #334155; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
        .header { background-color: #ffffff; padding: 40px 20px 20px 20px; text-align: center; border-bottom: 3px solid #f97316; }
        .logo-container { width: 80px; height: 80px; margin: 0 auto 15px auto; border-radius: 50%; overflow: hidden; background-color: #f1f5f9; border: 2px solid #e2e8f0; display: flex; align-items: center; justify-content: center; }
        .logo-img { width: 100%; height: 100%; object-fit: cover; }
        .logo-fallback { font-size: 32px; font-weight: bold; color: #94a3b8; }
        .business-name { font-size: 20px; font-weight: bold; color: #0f172a; margin: 0; }
        .content { padding: 40px 30px; }
        .greeting { font-size: 18px; color: #334155; margin-bottom: 24px; }
        .event-card { background-color: #fff7ed; border-left: 4px solid #f97316; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
        .event-title { font-size: 18px; font-weight: bold; color: #c2410c; margin: 0 0 10px 0; }
        .event-details { font-size: 15px; color: #431407; margin: 5px 0; }
        .message { font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 30px; }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        .contact-info { margin-top: 15px; font-size: 14px; color: #64748b; }
        .button { display: inline-block; background-color: #f97316; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            ${businessLogoUrl ? `
            <div class="logo-container">
                <img src="${businessLogoUrl}" alt="${businessName}" class="logo-img">
            </div>` : `
            <div class="logo-container">
                <span class="logo-fallback">${businessName.slice(0, 1).toUpperCase()}</span>
            </div>
            `}
            <h1 class="business-name">${businessName}</h1>
        </div>
        <div class="content">
            <p class="greeting">Sayın <strong>${recipientName}</strong>,</p>
            <p class="message">Randevunuz başarıyla oluşturuldu. Sizi aramızda görmek için sabırsızlanıyoruz.</p>
            
            <div class="event-card">
                <h2 class="event-title">${eventTitle}</h2>
                <p class="event-details">📅 ${formattedDate}</p>
                <p class="event-details">⏰ ${formattedStartTime} - ${formattedEndTime}</p>
            </div>

            <p class="message">
                Eğer katılamayacak olursanız, lütfen bizimle erkenden iletişime geçmenizi rica ederiz. Böylece zaman planlamamızı daha iyi yapabiliriz.
            </p>
            
            <p class="message" style="margin-top: 30px;">
                Saygılarımızla,<br>
                <strong>${businessName}</strong>
                ${businessPhone ? `<br><span style="font-size: 14px; font-weight: normal; color: #64748b; display: inline-block; margin-top: 5px;">İletişim: ${businessPhone}</span>` : ''}
            </p>
        </div>
        <div class="footer">
            © ${formattedDate.split(' ').pop()} ${businessName}. Tüm hakları saklıdır.
        </div>
    </div>
</body>
</html>
    `;

    try {
        const { data, error } = await resend.emails.send({
            from: EMAIL_FROM, // Using the exported constant from existing file
            to: [recipientEmail],
            subject: `Randevu Onayı: ${eventTitle} - ${businessName}`,
            html: htmlContent,
        });

        if (error) {
            console.error("Resend Error:", error);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (error: any) {
        console.error("Email Sending Exception:", error);
        return { success: false, error: error.message };
    }
}
