'use server';

import { Resend } from 'resend';
import { z } from 'zod';

const resend = new Resend(process.env.RESEND_API_KEY);

const contactSchema = z.object({
  fullName: z.string().min(2, "Ad Soyad en az 2 karakter olmalıdır"),
  companyName: z.string().min(2, "Firma Adı en az 2 karakter olmalıdır"),
  phone: z.string().min(10, "Geçerli bir telefon numarası giriniz"),
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  description: z.string().min(10, "Lütfen talebinizi biraz daha detaylandırın"),
  consent: z.boolean().refine((val) => val === true, {
    message: "KVKK ve Gizlilik Sözleşmesini onaylamanız gerekmektedir",
  }),
});

export type ContactState = {
  success?: boolean;
  error?: string;
  errors?: Record<string, string[]>;
}

export async function sendEnterpriseContact(prevState: ContactState, formData: FormData): Promise<ContactState> {
  const rawData = {
    fullName: formData.get('fullName'),
    companyName: formData.get('companyName'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    description: formData.get('description'),
    consent: formData.get('consent') === 'on',
  };

  const validatedFields = contactSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { fullName, companyName, phone, email, description } = validatedFields.data;

  try {
    await resend.emails.send({
      from: 'UppyPro Enterprise <info@upgunai.com>', // Update this if you have a verified domain
      to: 'info@upgunai.com',
      subject: `🚀 Yeni Kurumsal Müşteri Talebi: ${companyName}`,
      html: `
        <div style="font-family: sans-serif; background-color: #f9fafb; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background-color: #4f46e5; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Yeni Kurumsal Talep</h1>
            </div>
            <div style="padding: 24px;">
              <p><strong>Ad Soyad:</strong> ${fullName}</p>
              <p><strong>Firma Adı:</strong> ${companyName}</p>
              <p><strong>Telefon:</strong> <a href="tel:${phone}">${phone}</a></p>
              <p><strong>E-posta:</strong> <a href="mailto:${email}">${email}</a></p>
              
              <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
              
              <h3 style="color: #111827; margin-bottom: 12px;">Talep Detayları & Otomasyon İhtiyaçları:</h3>
              <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; color: #374151; white-space: pre-wrap;">
                ${description}
              </div>
            </div>
            <div style="background-color: #f9fafb; padding: 16px; text-align: center; color: #6b7280; font-size: 12px;">
              Bu e-posta UppyPro Kurumsal iletişim formundan gönderilmiştir.
            </div>
          </div>
        </div>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error: 'E-posta gönderilirken bir hata oluştu. Lütfen daha sonra tekrar deneyiniz.' };
  }
}
