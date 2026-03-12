const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// 1. Load Iyzico Config
const IyzicoConfig = {
    apiKey: process.env.IYZICO_API_KEY,
    secretKey: process.env.IYZICO_SECRET_KEY,
    baseUrl: process.env.IYZICO_BASE_UR || process.env.IYZICO_BASE_URL || 'https://api.iyzipay.com', // PROD DEFAULT
    locale: 'tr',
    conversationId: Date.now().toString()
};

// 2. Load Supabase Config
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function generateRandomString() {
    return Date.now().toString() + crypto.randomBytes(4).toString('hex');
}

function generateIyzicoV2Header(uri, apiKey, secretKey, randomString, requestBody) {
    let uriPath = uri;
    const v2Index = uri.indexOf('/v2');
    if (v2Index !== -1) uriPath = uri.substring(v2Index);
    let payload = randomString + uriPath + requestBody;
    const signature = crypto.createHmac('sha256', secretKey).update(payload).digest('hex');
    const authString = `apiKey:${apiKey}&randomKey:${randomString}&signature:${signature}`;
    return `IYZWSv2 ${Buffer.from(authString).toString('base64')}`;
}

async function createProduct(name) {
    const requestBody = JSON.stringify({ locale: IyzicoConfig.locale, conversationId: IyzicoConfig.conversationId, name: name, description: name });
    const randomString = generateRandomString();
    const uri = `${IyzicoConfig.baseUrl}/v2/subscription/products`;
    const authString = generateIyzicoV2Header(uri, IyzicoConfig.apiKey, IyzicoConfig.secretKey, randomString, requestBody);

    try {
        const response = await fetch(uri, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': authString, 'x-iyzi-rnd': randomString },
            body: requestBody
        });
        return await response.json();
    } catch (error) {
        console.error("Product Create Error:", error);
        return { status: 'failure' };
    }
}

async function createPricingPlan(productReferenceCode, name, price) {
    const requestBody = JSON.stringify({
        locale: IyzicoConfig.locale,
        conversationId: IyzicoConfig.conversationId,
        productReferenceCode: productReferenceCode,
        name: name,
        price: price.toFixed(2),
        currencyCode: 'TRY',
        paymentInterval: 'MONTHLY',
        paymentIntervalCount: 1,
        planPaymentType: 'RECURRING'
    });
    const randomString = generateRandomString();
    const uri = `${IyzicoConfig.baseUrl}/v2/subscription/products/${productReferenceCode}/pricing-plans`;
    const authString = generateIyzicoV2Header(uri, IyzicoConfig.apiKey, IyzicoConfig.secretKey, randomString, requestBody);

    try {
        const response = await fetch(uri, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': authString, 'x-iyzi-rnd': randomString },
            body: requestBody
        });
        return await response.json();
    } catch (error) {
        console.error("Pricing Plan Create Error:", error);
        return { status: 'failure' };
    }
}

// UppyPro Fiyat Listesi (KDV Hariçiyat + %20 KDV)
// Check Supabase 'pricing' table for exactly how it is mapped, but these are the DB values:
const PLANS = [
    { key: 'uppypro_inbox', name: 'UppyPro Inbox', price: 895 * 1.20 },
    { key: 'uppypro_ai', name: 'UppyPro AI', price: 3995 * 1.20 },
    { key: 'uppypro_corporate_small', name: 'UppyPro Kurumsal (Small)', price: 4995 * 1.20 },
    { key: 'uppypro_corporate_medium', name: 'UppyPro Kurumsal (Medium)', price: 6995 * 1.20 },
    { key: 'uppypro_corporate_large', name: 'UppyPro Kurumsal (Large)', price: 9995 * 1.20 },
    { key: 'uppypro_corporate_xl', name: 'UppyPro Kurumsal (XL)', price: 12995 * 1.20 }
];

async function main() {
    console.log("-----------------------------------------");
    console.log(`Starting Iyzico PROD Sync script...`);
    console.log(`Base URL: ${IyzicoConfig.baseUrl}`);
    
    if (!IyzicoConfig.apiKey || IyzicoConfig.apiKey.includes('sandbox')) {
        console.log("WARNING: You are using SANDBOX keys. If you want production, change .env.local first!");
    }

    for (const plan of PLANS) {
        console.log(`\n>>> Processing: ${plan.name} (Amount: ${plan.price.toFixed(2)} TL)`);
        
        let targetPlanRefCode = "";
        
        // 1. Create Prod Product
        const prodRes = await createProduct(plan.name);
        if (prodRes.status !== 'success') {
            console.error(`  [X] Failed product creation:`, prodRes.errorMessage || prodRes);
            continue;
        }
        const productRef = prodRes.referenceCode || prodRes.data?.referenceCode;
        console.log(`  [OK] Product created. Ref Code: ${productRef}`);

        // 2. Create Pricing Plan
        const planRes = await createPricingPlan(productRef, `${plan.name} Aylik Plan`, plan.price);
        if (planRes.status !== 'success') {
            console.error(`  [X] Failed plan creation:`, planRes.errorMessage || planRes);
            continue;
        }
        const planRef = planRes.referenceCode || planRes.data?.referenceCode;
        console.log(`  [OK] Pricing Plan created. Ref Code: ${planRef}`);
        targetPlanRefCode = planRef;

        // 3. Update Supabase 'pricing' table
        if (targetPlanRefCode) {
            console.log(`  [*] Updating Supabase for key: ${plan.key} ...`);
            const { error } = await supabase
                .from('pricing')
                .update({ iyzico_pricing_plan_reference_code: targetPlanRefCode })
                .eq('product_key', plan.key)
                .eq('billing_cycle', 'monthly');

            if (error) {
                console.error(`  [X] Supabase update failed:`, error.message);
            } else {
                console.log(`  [OK] Supabase updated successfully with new Iyzico Plan Ref Code.`);
            }
        }
    }
    
    console.log("\n-----------------------------------------");
    console.log("SYNC COMPLETE. Ensure new keys are in Vercel!");
}

main();
