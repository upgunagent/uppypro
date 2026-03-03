'use server';

import { Resend } from 'resend';
import { z } from 'zod';

const resend = new Resend(process.env.RESEND_API_KEY);

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

  const validatedFields = freeTrialSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { fullName, companyName, phone, email, description } = validatedFields.data;

  try {
    await resend.emails.send({
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

    return { success: true };
  } catch (error) {
    console.error('Free trial email sending failed:', error);
    return { success: false, error: 'E-posta gönderilirken bir hata oluştu. Lütfen daha sonra tekrar deneyiniz.' };
  }
}
