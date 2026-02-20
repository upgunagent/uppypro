
const crypto = require('crypto');

// Iyzico Yapılandırması (Environment'dan veya manuel)
const IyzicoConfig = {
    apiKey: process.env.IYZICO_API_KEY || 'sandbox-U2Y8K3wKj2...',
    secretKey: process.env.IYZICO_SECRET_KEY || 'sandbox-sK8j2...',
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

// UppyPro Inbox Product Reference Code from screenshot/previous check (or fallback to user provided logic if we could fetch it)
// We assume it is 'ca89c794-0cdf-4bea-80ca-9366ff7dcd4b' based on user context/logs but I didn't verify it with API call specifically here.
// But wait, the previous script failed with "Ürün zaten var" probably because it tried to create 'UppyPro Inbox' product.
// I should rely on the name "UppyPro Inbox" if I could find its code via API, but I don't want to overcomplicate.
// Let's assume the user has access to dashboard or I can fetch all products to find it.
// I'll fetch all products first to be safe, then create plan.

async function getAllProducts() {
    const randomString = generateRandomString();
    const path = '/v2/subscription/products';
    const qs = `conversationId=${IyzicoConfig.conversationId}&locale=tr&page=1&count=100`;
    const uri = `${IyzicoConfig.baseUrl}${path}?${qs}`;

    // Auth for GET with Query Params: payload = randomString + path + queryParams
    const payload = randomString + path + '?' + qs;
    const signature = crypto.createHmac('sha256', IyzicoConfig.secretKey).update(payload).digest('hex');
    const authString = `apiKey:${IyzicoConfig.apiKey}&randomKey:${randomString}&signature:${signature}`;
    const token = `IYZWSv2 ${Buffer.from(authString).toString('base64')}`;

    const response = await fetch(uri, {
        headers: {
            'Authorization': token,
            'x-iyzi-rnd': randomString
        }
    });
    return await response.json();
}

async function main() {
    if (!process.env.IYZICO_API_KEY) {
        try {
            require('dotenv').config({ path: '.env.local' });
            IyzicoConfig.apiKey = process.env.IYZICO_API_KEY;
            IyzicoConfig.secretKey = process.env.IYZICO_SECRET_KEY;
        } catch (e) { }
    }

    // 1. Find 'UppyPro Inbox' Product Ref
    const productsRes = await getAllProducts();
    if (productsRes.status !== 'success') {
        console.error("Failed to fetch products:", productsRes.errorMessage);
        return;
    }

    const inboxProduct = productsRes.data.items.find(p => p.name === 'UppyPro Inbox');
    if (!inboxProduct) {
        console.error("UppyPro Inbox product not found!");
        return;
    }

    const productRef = inboxProduct.referenceCode;
    console.log(`Found Inbox Product: ${productRef}`);

    // 2. Create Plan
    const price = 895 * 1.20; // 1074.00 TL
    const planRes = await createPricingPlan(productRef, 'UppyPro Inbox Aylık Plan', price);

    if (planRes.status === 'success') {
        const planRef = planRes.referenceCode || planRes.data.referenceCode;
        console.log(`>>> RESULT: UppyPro Inbox -> ProductRef: ${productRef} | PlanRef: ${planRef}`);
    } else {
        console.error("Plan creation failed:", planRes.errorMessage);
    }
}

main();
