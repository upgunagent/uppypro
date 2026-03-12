const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const IyzicoConfig = {
    apiKey: process.env.IYZICO_API_KEY,
    secretKey: process.env.IYZICO_SECRET_KEY,
    baseUrl: process.env.IYZICO_BASE_URL || 'https://api.iyzipay.com',
    locale: 'tr',
    conversationId: Date.now().toString()
};

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function generateIyzicoV2Header(uri, apiKey, secretKey, randomString, requestBody) {
    let uriPath = uri;
    const v2Index = uri.indexOf('/v2');
    if (v2Index !== -1) uriPath = uri.substring(v2Index);
    let payload = randomString + uriPath + (requestBody || '');
    const signature = crypto.createHmac('sha256', secretKey).update(payload).digest('hex');
    const authString = `apiKey:${apiKey}&randomKey:${randomString}&signature:${signature}`;
    return `IYZWSv2 ${Buffer.from(authString).toString('base64')}`;
}

async function getProducts() {
    const randomString = Date.now().toString() + crypto.randomBytes(4).toString('hex');
    const path = '/v2/subscription/products';
    const params = 'conversationId=' + IyzicoConfig.conversationId + '&count=100&locale=tr&page=1';
    const uri = `${IyzicoConfig.baseUrl}${path}?${params}`;
    
    const payload = randomString + `${path}?${params}`;
    const signature = crypto.createHmac('sha256', IyzicoConfig.secretKey).update(payload).digest('hex');
    const authStr = `apiKey:${IyzicoConfig.apiKey}&randomKey:${randomString}&signature:${signature}`;
    const token = `IYZWSv2 ${Buffer.from(authStr).toString('base64')}`;
    
    const response = await fetch(uri, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token,
            'x-iyzi-rnd': randomString,
            'x-iyzi-client-version': 'iyzipay-node-2.0.48'
        }
    });
    return await response.json();
}

async function getPricingPlans(productRefCode) {
    const randomString = Date.now().toString() + crypto.randomBytes(4).toString('hex');
    const path = `/v2/subscription/products/${productRefCode}/pricing-plans`;
    const params = 'conversationId=' + IyzicoConfig.conversationId + '&count=10&locale=tr&page=1';
    const uri = `${IyzicoConfig.baseUrl}${path}?${params}`;
    
    const payload = randomString + `${path}?${params}`;
    const signature = crypto.createHmac('sha256', IyzicoConfig.secretKey).update(payload).digest('hex');
    const authStr = `apiKey:${IyzicoConfig.apiKey}&randomKey:${randomString}&signature:${signature}`;
    const token = `IYZWSv2 ${Buffer.from(authStr).toString('base64')}`;
    
    const response = await fetch(uri, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token,
            'x-iyzi-rnd': randomString,
            'x-iyzi-client-version': 'iyzipay-node-2.0.48'
        }
    });
    return await response.json();
}

async function createPricingPlan(productRefCode, name, price) {
    const requestBody = JSON.stringify({
        locale: IyzicoConfig.locale,
        conversationId: IyzicoConfig.conversationId,
        productReferenceCode: productRefCode,
        name: name,
        price: price.toFixed(2),
        currencyCode: 'TRY',
        paymentInterval: 'MONTHLY',
        paymentIntervalCount: 1,
        planPaymentType: 'RECURRING'
    });
    const randomString = Date.now().toString() + crypto.randomBytes(4).toString('hex');
    const uri = `${IyzicoConfig.baseUrl}/v2/subscription/products/${productRefCode}/pricing-plans`;
    const authString = generateIyzicoV2Header(uri, IyzicoConfig.apiKey, IyzicoConfig.secretKey, randomString, requestBody);

    const response = await fetch(uri, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': authString,
            'x-iyzi-rnd': randomString,
            'x-iyzi-client-version': 'iyzipay-node-2.0.48'
        },
        body: requestBody
    });
    return await response.json();
}

// Supabase'deki GERÇEK fiyatları oku ve İyzico ile eşleştir
const PLANS_MAP = {
    'UppyPro Inbox': 'uppypro_inbox',
    'UppyPro AI': 'uppypro_ai',
    'UppyPro Kurumsal (Small)': 'uppypro_corporate_small',
    'UppyPro Kurumsal (Medium)': 'uppypro_corporate_medium',
    'UppyPro Kurumsal (Large)': 'uppypro_corporate_large',
    'UppyPro Kurumsal (XL)': 'uppypro_corporate_xl'
};

async function main() {
    console.log("==============================================");
    console.log(`IYZICO RECOVERY & FIX SCRIPT`);
    console.log(`Base URL: ${IyzicoConfig.baseUrl}`);
    console.log(`API Key: ${IyzicoConfig.apiKey ? IyzicoConfig.apiKey.substring(0,10) + '...' : 'MISSING!'}`);
    console.log("==============================================");

    if (!IyzicoConfig.apiKey) {
        console.error("[HATA] IYZICO_API_KEY bulunamadı! .env.local dosyanızı kontrol edin.");
        return;
    }

    // 1. Supabase'den güncel fiyatları oku
    console.log("\n[1] Supabase'den güncel fiyatlar okunuyor...");
    const { data: dbPrices } = await supabase
        .from('pricing')
        .select('product_key, monthly_price_try, iyzico_pricing_plan_reference_code, billing_cycle')
        .eq('billing_cycle', 'monthly');
    
    if (!dbPrices || dbPrices.length === 0) {
        console.error("[HATA] Supabase'den fiyatlar okunamadı!");
        return;
    }
    
    console.log("  Supabase fiyatları:");
    dbPrices.forEach(p => console.log(`    ${p.product_key}: ${p.monthly_price_try} TL (KDV dahil: ${(p.monthly_price_try * 1.20).toFixed(2)} TL)`));

    // 2. İyzico'dan mevcut ürünleri çek
    console.log("\n[2] İyzico'dan mevcut ürünler çekiliyor...");
    const prodRes = await getProducts();
    if (prodRes.status !== 'success' || !prodRes.data?.items) {
        console.error("[HATA] İyzico ürünleri çekilemedi:", prodRes.errorMessage || prodRes);
        return;
    }
    
    const products = prodRes.data.items;
    console.log(`  ${products.length} ürün bulundu.`);

    // 3. Her ürünü eşleştir ve fiyat kontrolü yap
    for (const product of products) {
        const mappedKey = PLANS_MAP[product.name];
        if (!mappedKey) continue;

        const dbPrice = dbPrices.find(p => p.product_key === mappedKey);
        if (!dbPrice) {
            console.log(`\n[!] ${product.name}: Supabase'de eşleşen kayıt bulunamadı (key: ${mappedKey})`);
            continue;
        }

        console.log(`\n>>> ${product.name} (DB key: ${mappedKey})`);
        console.log(`    DB Fiyat: ${dbPrice.monthly_price_try} TL | KDV dahil: ${(dbPrice.monthly_price_try * 1.20).toFixed(2)} TL`);
        
        // İyzico'daki mevcut planları çek
        const plansRes = await getPricingPlans(product.referenceCode);
        let existingPlan = null;
        
        if (plansRes.status === 'success' && plansRes.data?.items?.length > 0) {
            existingPlan = plansRes.data.items[0]; // En son oluşturulan plan
            console.log(`    İyzico Plan: ${existingPlan.referenceCode} | Fiyat: ${existingPlan.price} TL`);
            
            // Fiyat uyuşuyor mu kontrol et
            const expectedKdvPrice = parseFloat((dbPrice.monthly_price_try * 1.20).toFixed(2));
            const iyzicoPrice = parseFloat(existingPlan.price);
            
            if (Math.abs(iyzicoPrice - expectedKdvPrice) > 1) {
                console.log(`    [!] FIYAT UYUŞMAZLIĞI! İyzico: ${iyzicoPrice} TL vs Beklenen: ${expectedKdvPrice} TL`);
                console.log(`    [*] Yeni doğru fiyatla plan oluşturuluyor...`);
                
                // Yeni plan oluştur
                const newPlanRes = await createPricingPlan(
                    product.referenceCode, 
                    `${product.name} Aylik Plan`, 
                    expectedKdvPrice
                );
                
                if (newPlanRes.status === 'success') {
                    const newPlanRef = newPlanRes.referenceCode || newPlanRes.data?.referenceCode;
                    console.log(`    [OK] Yeni plan oluşturuldu: ${newPlanRef} (Fiyat: ${expectedKdvPrice} TL)`);
                    
                    // Supabase'i güncelle
                    const { error } = await supabase
                        .from('pricing')
                        .update({ 
                            iyzico_pricing_plan_reference_code: newPlanRef
                        })
                        .eq('product_key', mappedKey)
                        .eq('billing_cycle', 'monthly');
                    
                    if (error) console.error(`    [X] Supabase güncelleme hatası:`, error.message);
                    else console.log(`    [OK] Supabase güncellendi.`);
                } else {
                    console.error(`    [X] Yeni plan oluşturulamadı:`, newPlanRes.errorMessage);
                }
            } else {
                console.log(`    [OK] Fiyat eşleşiyor.`);
                
                // Supabase'de referans kodu eksikse güncelle
                if (!dbPrice.iyzico_pricing_plan_reference_code) {
                    const { error } = await supabase
                        .from('pricing')
                        .update({ iyzico_pricing_plan_reference_code: existingPlan.referenceCode })
                        .eq('product_key', mappedKey)
                        .eq('billing_cycle', 'monthly');
                    
                    if (error) console.error(`    [X] Supabase güncelleme hatası:`, error.message);
                    else console.log(`    [OK] Supabase ref kodu güncellendi.`);
                }
            }
        } else {
            console.log(`    [!] İyzico'da plan bulunamadı. Yeni plan oluşturuluyor...`);
            const expectedKdvPrice = parseFloat((dbPrice.monthly_price_try * 1.20).toFixed(2));
            
            const newPlanRes = await createPricingPlan(
                product.referenceCode,
                `${product.name} Aylik Plan`,
                expectedKdvPrice
            );
            
            if (newPlanRes.status === 'success') {
                const newPlanRef = newPlanRes.referenceCode || newPlanRes.data?.referenceCode;
                console.log(`    [OK] Plan oluşturuldu: ${newPlanRef} (Fiyat: ${expectedKdvPrice} TL)`);
                
                const { error } = await supabase
                    .from('pricing')
                    .update({ iyzico_pricing_plan_reference_code: newPlanRef })
                    .eq('product_key', mappedKey)
                    .eq('billing_cycle', 'monthly');
                
                if (error) console.error(`    [X] Supabase güncelleme hatası:`, error.message);
                else console.log(`    [OK] Supabase güncellendi.`);
            } else {
                console.error(`    [X] Plan oluşturulamadı:`, newPlanRes.errorMessage);
            }
        }
    }
    
    console.log("\n==============================================");
    console.log("İŞLEM TAMAMLANDI!");
    console.log("==============================================");
}

main();
