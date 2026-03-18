'use server';

import { Resend } from 'resend';
import { z } from 'zod';

const resend = new Resend(process.env.RESEND_API_KEY);

// ---- Yardımcı fonksiyonlar (inline) ----

function isGibberish(text: string): boolean {
  const cleaned = text.trim().toLowerCase().replace(/\s/g, '');
  if (cleaned.length < 3) return false;
  if (/(.{2,})\1{2,}/.test(cleaned)) return true;
  if (/(.)\1{3,}/.test(cleaned)) return true;
  if (cleaned.length >= 5) {
    const unique = new Set(cleaned).size;
    if (unique / cleaned.length < 0.3) return true;
  }
  return false;
}

function validateFullName(name: string): string | null {
  const trimmed = name.trim();
  if (!/^[a-zA-ZçÇğĞıİöÖşŞüÜ\s]+$/.test(trimmed)) {
    return 'Ad Soyad yalnızca harf içermelidir';
  }
  const words = trimmed.split(/\s+/).filter(w => w.length > 0);
  if (words.length < 2) {
    return 'Lütfen adınızı ve soyadınızı giriniz';
  }
  if (words.some(w => w.length < 2)) {
    return 'Ad ve soyad en az 2 karakter olmalıdır';
  }
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

const contactSchema = z.object({
  fullName: z.string().min(2, "Ad Soyad en az 2 karakter olmalıdır"),
  companyName: z.string().optional(),
  phone: z.string().min(10, "Geçerli bir telefon numarası giriniz"),
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  description: z.string().min(10, "Lütfen talebinizi biraz daha detaylandırın"),
});

export type ContactState = {
  success?: boolean;
  error?: string;
  errors?: Record<string, string[]>;
}

export async function sendMeetingRequest(prevState: ContactState, formData: FormData): Promise<ContactState> {
  const rawData = {
    fullName: formData.get('fullName'),
    companyName: formData.get('companyName'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    description: formData.get('description'),
  };

  // 1. Zod validasyonu
  const validatedFields = contactSchema.safeParse(rawData);

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
    spamErrors.description = ['Lütfen talebinizi anlamlı bir şekilde açıklayınız.'];
  }

  if (companyName && isGibberish(companyName)) {
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
      subject: `🚀 Yeni Görüşme Talebi: ${fullName}`,
      html: `
        <div style="font-family: sans-serif; background-color: #f9fafb; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background-color: #ea580c; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Yeni Görüşme Talebi</h1>
            </div>
            <div style="padding: 24px;">
              <p><strong>Ad Soyad:</strong> ${fullName}</p>
              <p><strong>Firma Adı:</strong> ${companyName || '-'}</p>
              <p><strong>Telefon:</strong> <a href="tel:${phone}">${phone}</a></p>
              <p><strong>E-posta:</strong> <a href="mailto:${email}">${email}</a></p>
              
              <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
              
              <h3 style="color: #111827; margin-bottom: 12px;">En Çok Zorlandığı Süreç:</h3>
              <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; color: #374151; white-space: pre-wrap;">
                ${description}
              </div>
            </div>
            <div style="background-color: #f9fafb; padding: 16px; text-align: center; color: #6b7280; font-size: 12px;">
              Bu e-posta UppyPro Görüşme Talep formundan gönderilmiştir.
            </div>
          </div>
        </div>
      `,
    });

    if (sendError) {
      console.error('Meeting email sending failed:', sendError);
      return { success: false, error: 'E-posta gönderilirken bir hata oluştu. Lütfen daha sonra tekrar deneyiniz.' };
    }

    console.log('Meeting email sent successfully:', data?.id);
    return { success: true };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error: 'E-posta gönderilirken bir hata oluştu. Lütfen daha sonra tekrar deneyiniz.' };
  }
}
