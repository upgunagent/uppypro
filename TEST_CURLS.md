# UppyPro API Test Komutları (cURL)

## 1. Webhook Doğrulama (GET)
Meta ile webhook konfigürasyonunu doğrulamak için kullanılır.

```bash
curl -X GET "http://localhost:3000/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=uppypro_verify_token&hub.challenge=12345"
```
**Beklenen Çıktı**: `12345` (status 200)

## 2. Gelen WhatsApp Mesajını Simüle Et (POST)
WhatsApp'tan bir mesaj gelmiş gibi simüle edin.
**Not**: Öncelikle Kanal Ayarları sayfasından `mock_id` değerini `123456` olarak ayarlamalısınız (veya tenant'ın `meta_identifiers` alanında bu ID olmalı).

```bash
curl -X POST "http://localhost:3000/api/webhooks/meta" \
-H "Content-Type: application/json" \
-d '{
  "entry": [
    {
      "changes": [
        {
          "value": {
            "messages": [
              {
                "id": "wamid.12345",
                "from": "905551234567",
                "text": {
                  "body": "Merhaba, fiyatlarınız nedir?"
                },
                "timestamp": "1704380000"
              }
            ],
            "metadata": {
              "phone_number_id": "123456"
            }
          }
        }
      ]
    }
  ]
}'
```

## 3. Gelen Instagram Mesajını Simüle Et (POST)
```bash
curl -X POST "http://localhost:3000/api/webhooks/meta" \
-H "Content-Type: application/json" \
-d '{
  "entry": [
    {
      "messaging": [
        {
          "sender": { "id": "IG_USER_1" },
          "recipient": { "id": "IG_PAGE_1" },
          "timestamp": 1704380000,
          "message": {
            "mid": "igmid.123",
            "text": "Stok durumu nedir?"
          }
        }
      ]
    }
  ]
}'
```

## 4. Dahili API ile Mesaj Gönder (n8n kullanımı) (POST)
`.env` dosyasındaki `BOT_API_KEY` değerinin header ile eşleştiğinden emin olun.

```bash
curl -X POST "http://localhost:3000/api/messages/send" \
-H "Content-Type: application/json" \
-H "x-api-key: guvenli_rastgele_string" \
-d '{
  "tenant_id": "TENANT_UUID_BURAYA",
  "conversation_id": "CONVERSATION_UUID_BURAYA",
  "text": "Merhaba! Ben AI asistanıyım.",
  "sender": "BOT"
}'
```
