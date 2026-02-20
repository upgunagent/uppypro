
const { IyzicoConfig, generateIyzicoV2Header, getIyzicoHeaders, generateRandomString } = require('../lib/iyzico');
const crypto = require('crypto');

// Load env
try {
    require('dotenv').config({ path: '.env.local' });
    IyzicoConfig.apiKey = process.env.IYZICO_API_KEY;
    IyzicoConfig.secretKey = process.env.IYZICO_SECRET_KEY;
    IyzicoConfig.baseUrl = process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com';
} catch (e) { }

// Need to redefine helpers if I cannot import from TS file easily in JS script context without compilation.
// Since 'lib/iyzico.ts' is TS, node cannot run it directly unless we use ts-node or similar.
// I will just copy the auth logic correctly this time (GET request signature was tricky).

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
    // Parameters MUST be sorted alphabetically for signature if there are query params?
    // Actually Iyzico V2 GET signature includes query params in the path string.
    // Let's use minimal params.
    const qs = `conversationId=${IyzicoConfig.conversationId}&locale=tr&page=1&count=100`;
    const uri = `${IyzicoConfig.baseUrl}${path}?${qs}`;

    const { token, randomString } = generateAuth(uri, null); // Body is null/empty for signature in GET? 
    // Wait, previous `lib/iyzico.ts` logic for GET:
    // "For V2 GET, iyzipay-node appends "{}" (stringified empty object) to the payload if there is no request model"
    // BUT only if it is NOT a retrieve/search with query params?
    // Let's look at `getAllProducts` in `lib/iyzico.ts`:
    // It creates payload = randomString + path + '?' + qs
    // And DOES NOT append body.

    // My previous script failed probably because of this nuance.

    const response = await fetch(uri, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token,
            'x-iyzi-rnd': randomString
        }
    });
    return await response.json();
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
}

async function main() {
    console.log("Searching for UppyPro Inbox...");
    const productsRes = await getAllProducts();

    if (productsRes.status !== 'success') {
        console.error("Products Fetch Error:", JSON.stringify(productsRes));
        return;
    }

    const items = productsRes.data?.items || productsRes.items || [];
    const inbox = items.find(p => p.name === 'UppyPro Inbox');

    if (!inbox) {
        console.error("UppyPro Inbox not found. Available:", items.map(p => p.name));
        return;
    }

    console.log(`Found Inbox: ${inbox.referenceCode}`);

    // Create Plan
    const price = 895 * 1.20;
    const planRes = await createPricingPlan(inbox.referenceCode, 'UppyPro Inbox Aylık Plan (TL)', price);

    if (planRes.status === 'success') {
        console.log(`>>> RESULT: UppyPro Inbox -> ProductRef: ${inbox.referenceCode} | PlanRef: ${planRes.referenceCode}`);
    } else {
        console.error("Plan Creation Failed:", planRes.errorMessage);
    }
}

main();
