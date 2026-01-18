
const https = require('https');

const SUPABASE_URL = "https://sxddrjjiohqflealwfnw.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// v5 fonksiyonunu test ediyoruz
const FUNCTION_NAME = "create_appointment_v5";
const URL = `${SUPABASE_URL}/rest/v1/rpc/${FUNCTION_NAME}`;

const payload = JSON.stringify({
    p_tenant_id: "3f00414e-3109-4d16-83f8-1a1734e864b9", // Hakan Turan Tenant ID
    p_customer_name: "Test User",
    p_customer_email: "test_debug@example.com",
    p_customer_phone: "+905551234567",
    p_start_time: "2026-01-20 14:00:00", // Gelecek bir tarih
    p_end_time: "2026-01-20 15:00:00",
    p_title: "Debug Randevusu",
    p_description: "Bu bir otomatik test randevusudur."
});

const options = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY
    }
};

console.log(`Sending request to: ${URL}`);
console.log(`Payload: ${payload}`);

const req = https.request(URL, options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log(`Status Code: ${res.statusCode}`);
        console.log('Response Body:');
        console.log(data);
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.write(payload);
req.end();
