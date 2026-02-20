
const crypto = require('crypto');

// Iyzico Yapılandırması
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

// Fixed for GET requests (signature includes query params in path)
function generateAuth(uri, body = null) {
    let uriPath = uri;
    const v2Index = uri.indexOf('/v2');
    if (v2Index !== -1) {
        uriPath = uri.substring(v2Index);
    }
    const randomString = Date.now().toString() + crypto.randomBytes(4).toString('hex');
    let payload = randomString + uriPath;
    if (body) payload += body;

    const signature = crypto.createHmac('sha256', IyzicoConfig.secretKey).update(payload).digest('hex');
    const authString = `apiKey:${IyzicoConfig.apiKey}&randomKey:${randomString}&signature:${signature}`;
    const token = `IYZWSv2 ${Buffer.from(authString).toString('base64')}`;
    return { token, randomString };
}

async function getAllProducts() {
    const path = '/v2/subscription/products';
    const qs = `conversationId=${IyzicoConfig.conversationId}&locale=tr&page=1&count=100`;
    const uri = `${IyzicoConfig.baseUrl}${path}?${qs}`;

    // Auth for GET with Query Params: payload includes full path with query
    const { token, randomString } = generateAuth(uri, null);

    try {
        const response = await fetch(uri, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token,
                'x-iyzi-rnd': randomString
            }
        });
        return await response.json();
    } catch (e) {
        return { status: 'failure', errorMessage: e.message };
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

    const uri = `${IyzicoConfig.baseUrl}/v2/subscription/products/${productReferenceCode}/pricing-plans`;
    const { token, randomString } = generateAuth(uri, requestBody);

    try {
        const response = await fetch(uri, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token,
                'x-iyzi-rnd': randomString
            },
            body: requestBody
        });
        return await response.json();
    } catch (e) {
        return { status: 'failure', errorMessage: e.message };
    }
}

async function main() {
    // Load env manually if not passed
    if (!process.env.IYZICO_API_KEY) {
        try {
            require('dotenv').config({ path: '.env.local' });
            IyzicoConfig.apiKey = process.env.IYZICO_API_KEY;
            IyzicoConfig.secretKey = process.env.IYZICO_SECRET_KEY;
        } catch (e) { }
    }

    console.log("Fetching Products...");
    const productsRes = await getAllProducts();

    if (productsRes.status !== 'success') {
        console.error("Fetch Error:", productsRes.errorMessage);
        return;
    }

    const items = productsRes.data?.items || productsRes.items || [];
    const inbox = items.find(p => p.name === 'UppyPro Inbox');

    if (!inbox) {
        console.error("Inbox Product Not Found!", items.map(p => p.name));
        return;
    }

    console.log(`Found Inbox Ref: ${inbox.referenceCode}`);

    // Create Plan
    const price = 895 * 1.20; // 1074.00 TL
    const planRes = await createPricingPlan(inbox.referenceCode, 'UppyPro Inbox Aylık Plan (TL)', price);

    if (planRes.status === 'success') {
        const planRef = planRes.referenceCode || planRes.data.referenceCode;
        console.log(`>>> RESULT: UppyPro Inbox -> ProductRef: ${inbox.referenceCode} | PlanRef: ${planRef}`);
    } else {
        console.error("Plan Create Error:", planRes.errorMessage);
    }
}

main();
