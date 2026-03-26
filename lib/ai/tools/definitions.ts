/**
 * Gemini Function Calling (Tool) tanımları
 * n8n'deki tool'ların birebir Gemini formatında karşılıkları
 */

import { SchemaType } from "@google/generative-ai";

export const aiToolDefinitions = [
  {
    functionDeclarations: [
      {
        name: "check_availability",
        description:
          "Belirtilen personelin belirtilen tarihte müsait saatlerini kontrol eder. Randevu oluşturmadan ÖNCE mutlaka bu tool çağrılmalıdır. Asla müsaitlik kontrolü yapmadan randevu önerme.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            date: {
              type: SchemaType.STRING,
              description: "Kontrol edilecek tarih (YYYY-MM-DD formatında)",
            },
            employee_name: {
              type: SchemaType.STRING,
              description: "Personelin adı",
            },
          },
          required: ["date", "employee_name"],
        },
      },
      {
        name: "create_appointment",
        description:
          "Yeni bir randevu oluşturur. Müşteri bilgileri ve seçilen zaman dilimi gereklidir. Randevu oluşturmadan önce mutlaka check_availability ile müsaitlik kontrol edilmelidir. Oluşturulduktan sonra mail_gonder tool'u ile onay maili gönder.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            customer_name: {
              type: SchemaType.STRING,
              description: "Müşterinin adı soyadı",
            },
            customer_email: {
              type: SchemaType.STRING,
              description: "Müşterinin e-posta adresi",
            },
            customer_phone: {
              type: SchemaType.STRING,
              description: "Müşterinin telefon numarası",
            },
            start_time: {
              type: SchemaType.STRING,
              description:
                "Randevu başlangıç zamanı (YYYY-MM-DD HH:MM formatında, Türkiye saati)",
            },
            end_time: {
              type: SchemaType.STRING,
              description:
                "Randevu bitiş zamanı (YYYY-MM-DD HH:MM formatında, Türkiye saati)",
            },
            title: {
              type: SchemaType.STRING,
              description: "Randevu başlığı (örn: 'Saç Kesimi', 'Diş Kontrolü')",
            },
            description: {
              type: SchemaType.STRING,
              description: "Randevu açıklaması veya notlar",
            },
            employee_name: {
              type: SchemaType.STRING,
              description: "Randevuyu verecek personelin adı",
            },
          },
          required: [
            "customer_name",
            "customer_email",
            "customer_phone",
            "start_time",
            "end_time",
            "title",
            "description",
            "employee_name",
          ],
        },
      },
      {
        name: "get_my_appointments",
        description:
          "Müşterinin gelecekteki randevularını listeler. E-posta veya telefon numarası ile sorgulama yapılır.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            customer_identifier: {
              type: SchemaType.STRING,
              description:
                "Müşterinin e-posta adresi veya telefon numarası",
            },
          },
          required: ["customer_identifier"],
        },
      },
      {
        name: "cancel_appointment",
        description:
          "Bir randevuyu iptal eder. Önce get_my_appointments ile randevu ID'si bulunmalıdır. İptalden sonra mail_gonder ile bilgilendirme maili gönder.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            appointment_id: {
              type: SchemaType.STRING,
              description: "İptal edilecek randevunun UUID'si",
            },
          },
          required: ["appointment_id"],
        },
      },
      {
        name: "reschedule_appointment",
        description:
          "Bir randevunun tarih ve saatini değiştirir. Yeni zaman için önce check_availability ile müsaitlik kontrol edilmelidir. Değişiklikten sonra mail_gonder ile bilgilendirme maili gönder.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            appointment_id: {
              type: SchemaType.STRING,
              description: "Değiştirilecek randevunun UUID'si",
            },
            new_start_time: {
              type: SchemaType.STRING,
              description:
                "Yeni başlangıç zamanı (YYYY-MM-DD HH:MM formatında, Türkiye saati)",
            },
            new_end_time: {
              type: SchemaType.STRING,
              description:
                "Yeni bitiş zamanı (YYYY-MM-DD HH:MM formatında, Türkiye saati)",
            },
          },
          required: ["appointment_id", "new_start_time", "new_end_time"],
        },
      },
      {
        name: "notify_human_agent",
        description:
          "Müşteri canlı destek talep ettiğinde veya AI'ın çözemediği bir durum olduğunda insan temsilciye eskalasyon yapar. Konuşma modu otomatik olarak HUMAN'a geçer.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            summary: {
              type: SchemaType.STRING,
              description:
                "Müşterinin talebi ve konuşma özetinin kısa açıklaması",
            },
          },
          required: ["summary"],
        },
      },
      {
        name: "update_customer",
        description:
          "Kayıtlı müşterinin bilgilerini günceller. Güncellenebilir alanlar: email, phone, full_name, company_name, instagram_username",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            customer_phone: {
              type: SchemaType.STRING,
              description: "Müşterinin mevcut telefon numarası (kimlik doğrulama)",
            },
            field: {
              type: SchemaType.STRING,
              description:
                "Güncellenecek alan adı: email, phone, full_name, company_name veya instagram_username",
            },
            value: {
              type: SchemaType.STRING,
              description: "Yeni değer",
            },
          },
          required: ["customer_phone", "field", "value"],
        },
      },
      {
        name: "mail_gonder",
        description:
          "Randevu oluşturulduğunda, iptal edildiğinde veya güncellendiğinde müşteriye e-posta bildirimi gönderir. create_appointment, cancel_appointment veya reschedule_appointment başarılı olduktan sonra çağrılmalıdır.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            type: {
              type: SchemaType.STRING,
              description:
                "Mail türü: 'appointment_created', 'appointment_cancelled', 'appointment_rescheduled'",
            },
            customer_name: {
              type: SchemaType.STRING,
              description: "Müşterinin adı",
            },
            customer_email: {
              type: SchemaType.STRING,
              description: "Müşterinin e-posta adresi",
            },
            appointment_title: {
              type: SchemaType.STRING,
              description: "Randevu başlığı",
            },
            appointment_date: {
              type: SchemaType.STRING,
              description: "Randevu tarihi ve saati (okunabilir format)",
            },
            employee_name: {
              type: SchemaType.STRING,
              description: "Personel adı",
            },
          },
          required: [
            "type",
            "customer_name",
            "customer_email",
            "appointment_title",
            "appointment_date",
          ],
        },
      },
      // ─── TRENDYOL TOOLS ───
      {
        name: "search_trendyol_products",
        description:
          "Trendyol mağazasındaki ürünleri arar. Müşteri bir ürün sorduğunda, ürün bilgisi istediğinde, alışveriş yapmak istediğinde veya ürün önerisi talep ettiğinde bu aracı kullan. Sonuçlarda ürün adı, fiyatı, stok durumu, özellikleri ve Trendyol satış linki döner.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            query: {
              type: SchemaType.STRING,
              description:
                "Aranacak ürün (ör: 'kırmızı spor ayakkabı', 'laptop çantası 15.6 inç', 'hediye öneri')",
            },
            category: {
              type: SchemaType.STRING,
              description: "Opsiyonel kategori filtresi (ör: 'Elektronik', 'Giyim')",
            },
            max_price: {
              type: SchemaType.NUMBER,
              description: "Opsiyonel: Maksimum fiyat filtresi (TL)",
            },
            min_price: {
              type: SchemaType.NUMBER,
              description: "Opsiyonel: Minimum fiyat filtresi (TL)",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "check_trendyol_order",
        description:
          "Trendyol siparişinin durumunu sorgular. Müşteri sipariş durumunu, kargo takibini veya teslimat süresini sorduğunda bu aracı kullan.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            order_number: {
              type: SchemaType.STRING,
              description: "Trendyol sipariş numarası",
            },
          },
          required: ["order_number"],
        },
      },
      {
        name: "create_trendyol_return",
        description:
          "Trendyol siparişi için iade talebi oluşturur. Müşteri iade, değişim veya ürünle ilgili şikayette bulunduğunda bu aracı kullan. Önce sipariş numarasını ve iade sebebini sor.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            order_number: {
              type: SchemaType.STRING,
              description: "İade edilecek siparişin numarası",
            },
            reason: {
              type: SchemaType.STRING,
              description:
                "İade sebebi (ör: 'Ürün hasarlı geldi', 'Yanlış ürün gönderildi', 'Beğenmedim')",
            },
          },
          required: ["order_number", "reason"],
        },
      },
    ],
  },
];
