# UppyPro

UppyPro, WhatsApp ve Instagram DM mesajlarını tek bir panelden yönetmeyi sağlayan, n8n üzerinden isteğe bağlı AI otomatik cevaplama entegrasyonu sunan bir SaaS uygulamasıdır.

## Özellikler

- **Çok Kiracılı (Multi-Tenant) SaaS Mimarisi**: Ajans Yöneticisi ve İşletme Sahibi rolleri.
- **Birleşik Inbox**: WhatsApp ve Instagram mesajlarını tek yerden yönetin.
- **AI Entegrasyonu**: Açılıp kapatılabilir AI modu (Bot vs İnsan). n8n senaryolarına bağlanır.
- **Faturalandırma**: Iyzico ödemeleri için entegrasyon yapısı.
- **Karanlık Mod UI**: Premium, modern arayüz.

## Teknolojiler

- **Framework**: Next.js 14 (App Router)
- **Veritabanı**: Supabase (Postgres)
- **Kimlik Doğrulama**: Supabase Auth
- **Stil**: Tailwind CSS

## Başlangıç

### 1. Gereksinimler
- Node.js 18+
- Supabase Projesi (supabase.com üzerinde oluşturun)

### 2. Ortam Değişkenleri
`.env.local.example` dosyasını `.env.local` olarak kopyalayın ve değerleri doldurun:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://projeniz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-key-değeriniz
SUPABASE_SERVICE_ROLE_KEY=service-role-key-değeriniz
META_VERIFY_TOKEN=uppypro_verify_token
BOT_API_KEY=guvenli_rastgele_string
MOCK_META_SEND=true
```

### 3. Veritabanı Kurulumu
1. Supabase SQL Editörüne gidin.
2. `supabase/migrations/` klasöründeki dosyaları sırasıyla çalıştırın:
   - `0001_initial_schema.sql`
   - `0002_billing_schema.sql`
   - `0003_rls_policies.sql`
3. Seed verisini çalıştırın:
   - `seed.sql`

### 4. Kurulum ve Çalıştırma
```bash
npm install
npm run dev
```

`http://localhost:3000` adresine gidin.

### 5. Webhook Kurulumu
- **Meta (Facebook) Developer Portal**: Webhook URL'ini `https://alanadiniz.com/api/webhooks/meta` olarak ayarlayın. Doğrulama tokeni: `uppypro_verify_token`.
- **n8n**: n8n senaryonuzun `https://alanadiniz.com/api/messages/send` adresine `x-api-key` ile POST isteği atmasını sağlayın.

## Test Etme

- **Kayıt Ol**: `/signup` sayfasına gidin, bir plan seçin ve yeni bir işletme oluşturun.
- **Giriş**: `/login` sayfasından giriş yapın.
- **Admin**: İlk kullanıcı otomatik Admin değildir. `/admin` sayfasına erişmek için Supabase panelinden `tenant_members` tablosundaki kullanıcınızın rolünü `agency_admin` olarak güncelleyin.

## Lisans
Özel Mülkiyet.
