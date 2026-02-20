// Fatura email HTML template — ayrı dosya (server action olmayan)

export function generateInvoiceEmailHtml(props: {
    recipientName: string;
    planName: string;
    amount: string;
    paymentDate: string;
    logoUrl: string;
}): string {
    const { recipientName, planName, amount, paymentDate, logoUrl } = props;

    return `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Faturanız</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #334155; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; }
        .header { background-color: #ffffff; padding: 40px 20px 20px 20px; text-align: center; border-bottom: 1px solid #f1f5f9; }
        .logo { max-height: 50px; margin-bottom: 20px; }
        .header h1 { color: #0f172a; margin: 0; font-size: 22px; font-weight: 700; }
        .content { padding: 40px 30px; }
        .greeting { font-size: 16px; color: #334155; margin-bottom: 24px; }
        .details-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
        .details-title { font-weight: 600; color: #0f172a; margin-bottom: 16px; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; }
        .detail-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
        .detail-label { color: #64748b; }
        .detail-value { font-weight: 600; color: #0f172a; }
        .message { font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
        .info-box { background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 16px; border-radius: 8px; font-size: 14px; margin-bottom: 24px; line-height: 1.5; }
        .footer { background-color: #f8fafc; padding: 30px; text-align: center; font-size: 13px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="${logoUrl}" alt="UPGUN AI" class="logo">
            <h1>Ödeme Bilgilendirmesi</h1>
        </div>
        <div class="content">
            <p class="greeting">Sayın <strong>${recipientName}</strong>,</p>
            <p class="message">Aylık abonelik ücretiniz başarıyla tahsil edilmiştir. Ödeme detaylarınız aşağıda yer almaktadır.</p>

            <div class="details-card">
                <div class="details-title">Ödeme Detayları</div>
                <div class="detail-row">
                    <span class="detail-label">Paket:</span>
                    <span class="detail-value">${planName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Tutar:</span>
                    <span class="detail-value">${amount}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Ödeme Tarihi:</span>
                    <span class="detail-value">${paymentDate}</span>
                </div>
            </div>

            <div class="info-box">
                📎 Faturanız bu e-postanın ekinde PDF formatında yer almaktadır.
            </div>

            <p class="message">
                Aboneliğiniz iptal edilmediği sürece, ödeme her yenileme döneminde kayıtlı kartınızdan otomatik olarak tahsil edilecektir.
            </p>
            
            <p class="message" style="margin-top: 40px;">
                Herhangi bir sorunuz olursa bizimle iletişime geçmekten çekinmeyin.
                <br><br>
                Saygılarımızla,<br>
                <strong>UPGUN AI Ekibi</strong><br>
                <a href="mailto:info@upgunai.com" style="color: #64748b; text-decoration: none; font-size: 14px;">info@upgunai.com</a>
            </p>
        </div>
        <div class="footer">
            <p style="margin-bottom: 10px;">© ${new Date().getFullYear()} UPGUN AI. Tüm hakları saklıdır.</p>
            <p>UPGUN AI - Office İstanbul, Nisbetiye Mh. Gazi Güçnar Sk. No: 4, Zincirlikuyu, Beşiktaş, İstanbul</p>
        </div>
    </div>
</body>
</html>`;
}
