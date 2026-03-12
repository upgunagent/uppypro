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

// İlk başarılı sync'ten bilinen referans kodları (POST ile oluşturulanlar)
const KNOWN_REFS = [
    { 
        dbKey: 'uppypro_inbox', 
        productRef: '25abfcd4-77dd-4eae-8d91-677e289e35f1',
        oldPlanRef: '11c3c28c-b74a-4257-b39a-01871adcc9a1', // YANLIŞ FİYAT (1074 TL)
        correctPriceTL: 995, // Doğru fiyat
        needsNewPlan: true   // Yeni plan oluşturulacak
    },
    {
        dbKey: 'uppypro_ai',
        productRef: '9e770206-ce9d-4548-b354-ab6a42516e77',
        oldPlanRef: 'f4435c9a-70b1-48f5-9a5d-1c0ae2f42ffe',
        correctPriceTL: 3995,
        needsNewPlan: false
    },
    {
        dbKey: 'uppypro_corporate_small',
        productRef: '8035b4ef-7c26-4487-8e95-9d0e4936f27b',
        oldPlanRef: 'a1882dd4-33eb-465a-b68d-c7108730da5c',
        correctPriceTL: 4995,
        needsNewPlan: false
    },
    {
        dbKey: 'uppypro_corporate_medium',
        productRef: 'd127e03d-28f9-4f76-87ef-e63cec2cbc15',
        oldPlanRef: '2638f828-a73d-470c-a15f-3249157fc439',
        correctPriceTL: 6995,
        needsNewPlan: false
    },
    {
        dbKey: 'uppypro_corporate_large',
        productRef: '3a1123b0-ce1b-446c-b582-f3ef3c773afc',
        oldPlanRef: '21938b44-093a-42b4-bc69-5f339d1be266',
        correctPriceTL: 9995,
        needsNewPlan: false
    },
    {
        dbKey: 'uppypro_corporate_xl',
        productRef: '37dfac29-3b86-4cc6-b83b-ba6b1ad29717',
        oldPlanRef: '2fffa3e4-0baa-4222-87df-904122117b48',
        correctPriceTL: 12995,
        needsNewPlan: false
    }
];

async function main() {
    console.log("=== IYZICO DIRECT FIX SCRIPT ===");
    console.log(`Base URL: ${IyzicoConfig.baseUrl}`);
    console.log(`API Key: ${IyzicoConfig.apiKey ? IyzicoConfig.apiKey.substring(0,10) + '...' : 'MISSING!'}`);

    for (const item of KNOWN_REFS) {
        console.log(`\n>>> ${item.dbKey}`);
        
        let finalPlanRef = item.oldPlanRef;

        // Inbox için doğru fiyatla yeni plan oluştur
        if (item.needsNewPlan) {
            const kdvDahil = item.correctPriceTL * 1.20;
            console.log(`  [*] Yeni plan oluşturuluyor (KDV dahil: ${kdvDahil.toFixed(2)} TL)...`);
            
            const res = await createPricingPlan(
                item.productRef,
                `${item.dbKey} Aylik Plan`,
                kdvDahil
            );
            
            if (res.status === 'success') {
                finalPlanRef = res.referenceCode || res.data?.referenceCode;
                console.log(`  [OK] Yeni plan oluşturuldu: ${finalPlanRef}`);
            } else {
                console.error(`  [X] Plan oluşturulamadı:`, res.errorMessage);
                console.log(`  [!] Eski plan ref kullanılacak: ${item.oldPlanRef}`);
            }
        }

        // Supabase güncelle
        console.log(`  [*] Supabase güncelleniyor...`);
        const { error } = await supabase
            .from('pricing')
            .update({ 
                iyzico_pricing_plan_reference_code: finalPlanRef
            })
            .eq('product_key', item.dbKey)
            .eq('billing_cycle', 'monthly');

        if (error) {
            console.error(`  [X] Supabase hatası:`, error.message);
        } else {
            console.log(`  [OK] Supabase güncellendi (Plan Ref: ${finalPlanRef})`);
        }
    }

    console.log("\n=== İŞLEM TAMAMLANDI ===");
}

main();
