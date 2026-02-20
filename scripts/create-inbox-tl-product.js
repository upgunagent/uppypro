
const crypto = require('crypto');

// Iyzico Yapılandırması (Doğrudan ENV'den okumazsa diye tekrar deniyorum, require dotenv ekledim)
const IyzicoConfig = {
    apiKey: process.env.IYZICO_API_KEY,
    secretKey: process.env.IYZICO_SECRET_KEY,
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
        return { status: 'failure', errorMessage: error.message };
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
        return { status: 'failure', errorMessage: error.message };
    }
}

async function main() {
    try {
        require('dotenv').config({ path: '.env.local' });
        IyzicoConfig.apiKey = process.env.IYZICO_API_KEY;
        IyzicoConfig.secretKey = process.env.IYZICO_SECRET_KEY;
    } catch (e) { }

    console.log("Creating NEW Inbox Product (TL Version)...");

    // Creating a fresh product to bypass "Product already exists" and auth issues with GET
    const prodRes = await createProduct('UppyPro Inbox TL');

    if (prodRes.status !== 'success') {
        console.error("Product Create Error:", prodRes.errorMessage);
        return;
    }

    const productRef = prodRes.referenceCode || prodRes.data?.referenceCode;
    console.log(`Product Created: ${productRef}`);

    const price = 895 * 1.20; // 1074.00 TL
    const planRes = await createPricingPlan(productRef, 'UppyPro Inbox Aylık Plan (TL)', price);

    if (planRes.status === 'success') {
        const planRef = planRes.referenceCode || planRes.data.referenceCode;
        console.log(`>>> RESULT: UppyPro Inbox -> ProductRef: ${productRef} | PlanRef: ${planRef}`);
    } else {
        console.error("Plan Create Error:", planRes.errorMessage);
    }
}

main();
