
const crypto = require('crypto');

// Iyzico Yapılandırması (Environment'dan veya manuel)
const IyzicoConfig = {
    apiKey: process.env.IYZICO_API_KEY || 'sandbox-U2Y8K3wKj2...', // Kendi API Key'inizi environment'dan alın
    secretKey: process.env.IYZICO_SECRET_KEY || 'sandbox-sK8j2...', // Kendi Secret Key'inizi environment'dan alın
    baseUrl: process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com',
    locale: 'tr',
    conversationId: Date.now().toString()
};

function generateRandomString() {
    return Date.now().toString() + crypto.randomBytes(4).toString('hex');
}

function generateIyzicoV2Header(uri, apiKey, secretKey, randomString, requestBody) {
    let uriPath = uri;
    const v2Index = uri.indexOf('/v2');
    if (v2Index !== -1) {
        uriPath = uri.substring(v2Index);
    }
    let payload = randomString + uriPath + requestBody;
    const signature = crypto.createHmac('sha256', secretKey).update(payload).digest('hex');
    const authString = `apiKey:${apiKey}&randomKey:${randomString}&signature:${signature}`;
    return `IYZWSv2 ${Buffer.from(authString).toString('base64')}`;
}

async function createProduct(name) {
    const requestBody = JSON.stringify({
        locale: IyzicoConfig.locale,
        conversationId: IyzicoConfig.conversationId,
        name: name,
        description: name
    });
    const randomString = generateRandomString();
    const uri = `${IyzicoConfig.baseUrl}/v2/subscription/products`;
    const authString = generateIyzicoV2Header(uri, IyzicoConfig.apiKey, IyzicoConfig.secretKey, randomString, requestBody);

    try {
        const response = await fetch(uri, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authString,
                'x-iyzi-rnd': randomString
            },
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
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authString,
                'x-iyzi-rnd': randomString
            },
            body: requestBody
        });
        return await response.json();
    } catch (error) {
        console.error("Pricing Plan Create Error:", error);
        return { status: 'failure' };
    }
}

const PLANS = [
    { name: 'UppyPro Inbox', price: 895 * 1.20 }, // +%20 KDV
    { name: 'UppyPro AI', price: 3995 * 1.20 },
    { name: 'UppyPro Kurumsal (Small)', price: 4995 * 1.20 },
    { name: 'UppyPro Kurumsal (Medium)', price: 6995 * 1.20 },
    { name: 'UppyPro Kurumsal (Large)', price: 9995 * 1.20 },
    { name: 'UppyPro Kurumsal (XL)', price: 12995 * 1.20 }
];

async function main() {
    console.log("Creating Iyzico TL Plans...");

    // Check Config
    if (!process.env.IYZICO_API_KEY) {
        console.error("Error: IYZICO_API_KEY environment variable not set.");
        // Fallback for run_command tool limitation, checking hardcoded or mocked env
        // But for this script to work, it MUST have keys.
        // Assuming the user will run this where .env.local is loaded or I will load it.
        // For now, let's try to load dotenv.
        try {
            require('dotenv').config({ path: '.env.local' });
            IyzicoConfig.apiKey = process.env.IYZICO_API_KEY;
            IyzicoConfig.secretKey = process.env.IYZICO_SECRET_KEY;
            IyzicoConfig.baseUrl = process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com';
        } catch (e) {
            console.log("dotenv not found or error loading.");
        }
    }

    if (!IyzicoConfig.apiKey) {
        console.error("API Key missing! Exiting.");
        return;
    }

    for (const plan of PLANS) {
        console.log(`\nProcessing: ${plan.name} (Price: ${plan.price.toFixed(2)} TL)`);

        // 1. Create Product
        // We create a new product for each plan to keep it clean, or we could reuse 'UppyPro' product.
        // Let's creating dedicated products for simplicity in management.
        const prodRes = await createProduct(plan.name);

        if (prodRes.status !== 'success') {
            console.error(`Failed to create product for ${plan.name}:`, prodRes.errorMessage);
            continue;
        }

        const productRef = prodRes.referenceCode || prodRes.data?.referenceCode;
        console.log(`Product Created. Ref: ${productRef}`);

        // 2. Create Pricing Plan
        const planRes = await createPricingPlan(productRef, `${plan.name} Aylık Plan`, plan.price);

        if (planRes.status !== 'success') {
            console.error(`Failed to create pricing plan for ${plan.name}:`, planRes.errorMessage);
            continue;
        }

        const planRef = planRes.referenceCode || planRes.data?.referenceCode;
        console.log(`Pricing Plan Created. Ref: ${planRef}`);
        console.log(`>>> RESULT: ${plan.name} -> ProductRef: ${productRef} | PlanRef: ${planRef}`);
    }
}

main();
