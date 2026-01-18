
const https = require('https');

const SUPABASE_URL = "https://sxddrjjiohqflealwfnw.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Müşteri tablosunu sorguluyoruz
const URL = `${SUPABASE_URL}/rest/v1/customers?email=eq.otopkan@gmail.com&select=id,full_name,email,phone`;

const options = {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY
    }
};

console.log(`Checking customer for email: otopkan@gmail.com`);

const req = https.request(URL, options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Customer Data Found:');
        console.log(data);
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.end();
