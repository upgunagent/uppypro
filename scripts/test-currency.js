
const { XMLParser } = require('fast-xml-parser');
const https = require('https');

async function fetchUrl(url, options = {}) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, text: () => Promise.resolve(data), json: () => Promise.resolve(JSON.parse(data)) }));
        });
        req.on('error', (e) => reject(e));
    });
}

async function test() {
    console.log("Testing Currency APIs...");

    // 1. TCMB Mirror (Truncgil)
    try {
        console.log("1. TCMB Mirror (Truncgil):");
        const res = await fetchUrl("https://finans.truncgil.com/today.json", { headers: { "User-Agent": "Mozilla/5.0" } });
        const data = await res.json();
        const usdRate = parseFloat(data.USD.Satış.replace(',', '.'));
        console.log("   Rate:", usdRate);
    } catch (e) {
        console.error("   Error:", e.message);
    }

    // 2. TCMB Official
    try {
        console.log("2. TCMB Official:");
        const res = await fetchUrl("https://www.tcmb.gov.tr/kurlar/today.xml", { headers: { "User-Agent": "Mozilla/5.0" } });
        const xml = await res.text();
        const parser = new XMLParser({ ignoreAttributes: false });
        const data = parser.parse(xml);
        const usdData = data.Tarih_Date.Currency.find((c) => c["@_CurrencyCode"] === "USD");
        console.log("   Rate:", parseFloat(usdData.ForexSelling));
    } catch (e) {
        console.error("   Error:", e.message);
    }

    // 3. Frankfurter
    try {
        console.log("3. Frankfurter:");
        const res = await fetchUrl("https://api.frankfurter.app/latest?from=USD&to=TRY");
        const data = await res.json();
        console.log("   Rate:", data.rates.TRY);
    } catch (e) {
        console.error("   Error:", e.message);
    }

    // 4. Open ER API
    try {
        console.log("4. Open ER API:");
        const res = await fetchUrl("https://open.er-api.com/v6/latest/USD");
        const data = await res.json();
        console.log("   Rate:", data.rates.TRY);
    } catch (e) {
        console.error("   Error:", e.message);
    }
}

test();
