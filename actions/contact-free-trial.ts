'use server';

import { Resend } from 'resend';
import { z } from 'zod';

const resend = new Resend(process.env.RESEND_API_KEY);

// ---- Yardımcı fonksiyonlar (inline) ----

function isGibberish(text: string): boolean {
  const cleaned = text.trim().toLowerCase().replace(/\s/g, '');
  if (cleaned.length < 3) return false;
  // Aynı 2+ karakter grubunun 3+ kez tekrarı (asdasdasd)
  if (/(.{2,})\1{2,}/.test(cleaned)) return true;
  // Aynı karakterin 4+ kez tekrarı (aaaa)
  if (/(.)\1{3,}/.test(cleaned)) return true;
  // Benzersiz karakter oranı çok düşük (5+ char metinlerde)
  if (cleaned.length >= 5) {
    const unique = new Set(cleaned).size;
    if (unique / cleaned.length < 0.3) return true;
  }
  return false;
}

function validateFullName(name: string): string | null {
  const trimmed = name.trim();
  // Sadece harf, boşluk, Türkçe karakter
  if (!/^[a-zA-ZçÇğĞıİöÖşŞüÜ\s]+$/.test(trimmed)) {
    return 'Ad Soyad yalnızca harf içermelidir';
  }
  // En az 2 kelime
  const words = trimmed.split(/\s+/).filter(w => w.length > 0);
  if (words.length < 2) {
    return 'Lütfen adınızı ve soyadınızı giriniz';
  }
  // Her kelime en az 2 karakter
  if (words.some(w => w.length < 2)) {
    return 'Ad ve soyad en az 2 karakter olmalıdır';
  }
  // Anlamsız metin kontrolü
  if (isGibberish(trimmed)) {
    return 'Lütfen gerçek adınızı ve soyadınızı giriniz';
  }
  return null;
}

function validatePhone(phone: string): string | null {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (!/^(\+90|0)?5\d{9}$/.test(cleaned)) {
    return 'Geçerli bir telefon numarası giriniz (05XX XXX XX XX)';
  }
  return null;
}

// ---- Zod Schema ----

const freeTrialSchema = z.object({
  fullName: z.string().min(2, "Ad Soyad en az 2 karakter olmalıdır"),
  companyName: z.string().min(2, "Firma Adı en az 2 karakter olmalıdır"),
  phone: z.string().min(10, "Geçerli bir telefon numarası giriniz"),
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  description: z.string().min(10, "Lütfen sektörünüzü ve iş akışınızı biraz daha detaylandırın"),
  consent: z.boolean().refine((val) => val === true, {
    message: "KVKK ve Gizlilik Sözleşmesini onaylamanız gerekmektedir",
  }),
});

export type FreeTrialState = {
  success?: boolean;
  error?: string;
  errors?: Record<string, string[]>;
}

export async function sendFreeTrialContact(prevState: FreeTrialState, formData: FormData): Promise<FreeTrialState> {
  const rawData = {
    fullName: formData.get('fullName'),
    companyName: formData.get('companyName'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    description: formData.get('description'),
    consent: formData.get('consent') === 'on',
  };

  // 1. Zod validasyonu
  const validatedFields = freeTrialSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { fullName, companyName, phone, email, description } = validatedFields.data;

  // 2. Ek spam kontrolleri
  const spamErrors: Record<string, string[]> = {};

  const nameError = validateFullName(fullName);
  if (nameError) spamErrors.fullName = [nameError];

  const phoneError = validatePhone(phone);
  if (phoneError) spamErrors.phone = [phoneError];

  if (isGibberish(description)) {
    spamErrors.description = ['Lütfen sektörünüzü ve iş akışınızı anlamlı bir şekilde açıklayınız.'];
  }

  if (isGibberish(companyName)) {
    spamErrors.companyName = ['Lütfen gerçek firma adınızı giriniz.'];
  }

  if (Object.keys(spamErrors).length > 0) {
    return {
      success: false,
      errors: spamErrors,
    };
  }

  // 3. E-posta gönder
  try {
    const { data, error: sendError } = await resend.emails.send({
      from: 'UppyPro <info@upgunai.com>',
      to: 'info@upgunai.com',
      subject: `🎉 Yeni Ücretsiz Deneme Talebi: ${companyName} - ${fullName}`,
      html: `
        <div style="font-family: sans-serif; background-color: #f0fdf4; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #25D366 0%, #128C7E 100%); padding: 24px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 22px;">🎉 Yeni 14 Günlük Ücretsiz Deneme Talebi</h1>
              <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">UppyPro Landing Page - Ücretsiz Dene Formu</p>
            </div>
            <div style="padding: 28px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 13px; width: 140px;">Ad Soyad</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-weight: 600;">${fullName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 13px;">Firma Adı</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-weight: 600;">${companyName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 13px;">Telefon</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-weight: 600;"><a href="tel:${phone}" style="color: #25D366;">${phone}</a></td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 13px;">E-posta</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-weight: 600;"><a href="mailto:${email}" style="color: #25D366;">${email}</a></td>
                </tr>
              </table>

              <div style="margin-top: 24px;">
                <h3 style="color: #111827; margin-bottom: 12px; font-size: 15px;">Sektör ve İş Akışı:</h3>
                <div style="background-color: #f0fdf4; padding: 16px; border-radius: 8px; color: #374151; white-space: pre-wrap; border-left: 4px solid #25D366; font-size: 14px; line-height: 1.6;">
                  ${description}
                </div>
              </div>
            </div>
            <div style="background-color: #f9fafb; padding: 16px; text-align: center; color: #6b7280; font-size: 12px;">
              Bu e-posta UppyPro ücretsiz deneme başvuru formundan gönderilmiştir.
            </div>
          </div>
        </div>
      `,
    });

    if (sendError) {
      console.error('Free trial email sending failed:', sendError);
      return { success: false, error: 'E-posta gönderilirken bir hata oluştu. Lütfen daha sonra tekrar deneyiniz.' };
    }

    console.log('Free trial email sent successfully:', data?.id);
    return { success: true };
  } catch (error) {
    console.error('Free trial email sending failed:', error);
    return { success: false, error: 'E-posta gönderilirken bir hata oluştu. Lütfen daha sonra tekrar deneyiniz.' };
  }
}
