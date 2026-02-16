import crypto from 'crypto';

export const IyzicoConfig = {
    apiKey: (process.env.IYZICO_API_KEY || '').trim(),
    secretKey: (process.env.IYZICO_SECRET_KEY || '').trim(),
    baseUrl: (process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com').trim(),
    locale: 'tr',
    conversationId: Date.now().toString()
};

// Iyzico V2 Authentication Helper
// Reference: https://github.com/iyzico/iyzipay-php/blob/master/src/Iyzipay/IyziAuthV2Generator.php
function generateIyzicoV2Header(
    uri: string,
    apiKey: string,
    secretKey: string,
    randomString: string,
    requestBody: string | null
): string {
    // 1. Extract URI Path (starts with /v2)
    // Example: https://sandbox-api.iyzipay.com/v2/subscription/products -> /v2/subscription/products
    let uriPath = uri;
    const v2Index = uri.indexOf('/v2');
    if (v2Index !== -1) {
        const questionMarkIndex = uri.indexOf('?');
        if (questionMarkIndex !== -1) {
            uriPath = uri.substring(v2Index, questionMarkIndex);
        } else {
            uriPath = uri.substring(v2Index);
        }
    }

    // 2. Prepare Payload
    // Payload = randomString + uriPath + requestBody
    let payload = randomString + uriPath;
    if (requestBody && requestBody !== '[]' && requestBody !== '{}') {
        payload += requestBody;
    }

    // 3. Generate HMAC-SHA256 Signature (Hex)
    const signature = crypto
        .createHmac('sha256', secretKey)
        .update(payload)
        .digest('hex');

    // 4. Prepare Authorization String
    // apiKey:API_KEY&randomKey:RANDOM_STRING&signature:SIGNATURE
    const authString = `apiKey:${apiKey}&randomKey:${randomString}&signature:${signature}`;

    // Debug Logging
    console.log('[IYZICO Auth Debug] URI:', uri);
    console.log('[IYZICO Auth Debug] URI Path:', uriPath);
    console.log('[IYZICO Auth Debug] Payload Length:', payload.length);
    console.log('[IYZICO Auth Debug] Payload:', payload);
    console.log('[IYZICO Auth Debug] Signature:', signature);
    console.log('[IYZICO Auth Debug] Auth String:', authString);

    // 5. Build Header
    // IYZWSv2 base64(authString)
    return `IYZWSv2 ${Buffer.from(authString).toString('base64')}`;
}

function generateRandomString(): string {
    return Date.now().toString() + crypto.randomBytes(4).toString('hex');
}

function getIyzicoHeaders(authString: string, randomString: string) {
    return {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': authString,
        'x-iyzi-rnd': randomString,
        'x-iyzi-client-version': 'iyzipay-node-2.0.48'
    };
}

// Direct HTTP API call - no npm package dependency!
export async function initializeSubscriptionCheckout(data: {
    pricingPlanReferenceCode: string;
    subscriptionInitialStatus: 'PENDING' | 'ACTIVE';
    callbackUrl: string;
    customer: {
        name: string;
        surname: string;
        email: string;
        gsmNumber: string;
        identityNumber: string;
        billingAddress: {
            contactName: string;
            city: string;
            country: string;
            address: string;
            zipCode: string;
        };
        shippingAddress: {
            contactName: string;
            city: string;
            country: string;
            address: string;
            zipCode: string;
        };
    };
}): Promise<{ token?: string; checkoutFormContent?: string; status: string; errorMessage?: string }> {
    const requestBody = JSON.stringify({
        locale: IyzicoConfig.locale,
        conversationId: IyzicoConfig.conversationId,
        pricingPlanReferenceCode: data.pricingPlanReferenceCode,
        subscriptionInitialStatus: data.subscriptionInitialStatus,
        callbackUrl: data.callbackUrl,
        customer: data.customer
    });

    const randomString = generateRandomString();
    const uri = `${IyzicoConfig.baseUrl}/v2/subscription/checkoutform/initialize`;

    const authString = generateIyzicoV2Header(
        uri,
        IyzicoConfig.apiKey,
        IyzicoConfig.secretKey,
        randomString,
        requestBody
    );

    console.log('[IYZICO] Initializing subscription checkout...');
    console.log('[IYZICO] API URL:', uri);
    console.log('[IYZICO] Request Body:', requestBody);

    try {
        const response = await fetch(uri, {
            method: 'POST',
            headers: getIyzicoHeaders(authString, randomString),
            body: requestBody
        });

        const result = await response.json();
        console.log('[IYZICO] Response:', JSON.stringify(result));

        if (result.status === 'success') {
            return {
                token: result.token,
                checkoutFormContent: result.checkoutFormContent,
                status: result.status
            };
        } else {
            console.error('[IYZICO] Error:', result.errorMessage);
            return {
                status: result.status,
                errorMessage: result.errorMessage || 'Unknown error'
            };
        }
    } catch (error: any) {
        console.error('[IYZICO] Exception:', error);
        return {
            status: 'failure',
            errorMessage: error.message
        };
    }
}

export async function getSubscriptionCheckoutFormResult(token: string): Promise<any> {
    const requestBody = JSON.stringify({
        locale: IyzicoConfig.locale,
        conversationId: IyzicoConfig.conversationId,
        token: token
    });

    const randomString = generateRandomString();
    const uri = `${IyzicoConfig.baseUrl}/v2/subscription/checkoutform/auth/result`;

    const authString = generateIyzicoV2Header(
        uri,
        IyzicoConfig.apiKey,
        IyzicoConfig.secretKey,
        randomString,
        requestBody
    );

    const response = await fetch(uri, {
        method: 'POST',
        headers: getIyzicoHeaders(authString, randomString),
        body: requestBody
    });

    return await response.json();
}

export async function cancelSubscription(subscriptionReferenceCode: string): Promise<any> {
    const requestBody = JSON.stringify({
        locale: IyzicoConfig.locale,
        conversationId: IyzicoConfig.conversationId,
        subscriptionReferenceCode: subscriptionReferenceCode
    });

    const randomString = generateRandomString();
    const uri = `${IyzicoConfig.baseUrl}/v2/subscription/cancel`;

    const authString = generateIyzicoV2Header(
        uri,
        IyzicoConfig.apiKey,
        IyzicoConfig.secretKey,
        randomString,
        requestBody
    );

    const response = await fetch(uri, {
        method: 'POST',
        headers: getIyzicoHeaders(authString, randomString),
        body: requestBody
    });

    return await response.json();
}

export async function updateSubscriptionCard(data: {
    subscriptionReferenceCode?: string;
    customerReferenceCode: string;
    callbackUrl: string;
}): Promise<{ token?: string; checkoutFormContent?: string; status: string; errorMessage?: string }> {
    const requestBody = JSON.stringify({
        locale: IyzicoConfig.locale,
        conversationId: IyzicoConfig.conversationId,
        subscriptionReferenceCode: data.subscriptionReferenceCode,
        customerReferenceCode: data.customerReferenceCode,
        callbackUrl: data.callbackUrl
    });

    const randomString = generateRandomString();
    const uri = `${IyzicoConfig.baseUrl}/v2/subscription/card-update/initialize`;

    const authString = generateIyzicoV2Header(
        uri,
        IyzicoConfig.apiKey,
        IyzicoConfig.secretKey,
        randomString,
        requestBody
    );

    const response = await fetch(uri, {
        method: 'POST',
        headers: getIyzicoHeaders(authString, randomString),
        body: requestBody
    });

    const result = await response.json();

    if (result.status === 'success') {
        return {
            token: result.token,
            checkoutFormContent: result.checkoutFormContent,
            status: result.status
        };
    } else {
        return {
            status: result.status,
            errorMessage: result.errorMessage
        };
    }
}

export async function getSubscriptionCardUpdateResult(token: string): Promise<any> {
    const requestBody = JSON.stringify({
        locale: IyzicoConfig.locale,
        conversationId: IyzicoConfig.conversationId,
        token: token
    });

    const randomString = generateRandomString();
    const uri = `${IyzicoConfig.baseUrl}/v2/subscription/card-update/auth/result`;

    const authString = generateIyzicoV2Header(
        uri,
        IyzicoConfig.apiKey,
        IyzicoConfig.secretKey,
        randomString,
        requestBody
    );

    const response = await fetch(uri, {
        method: 'POST',
        headers: getIyzicoHeaders(authString, randomString),
        body: requestBody
    });

    return await response.json();
}

export async function createProduct(data: {
    name: string;
    description?: string;
}): Promise<{ status: string; errorMessage?: string; referenceCode?: string }> {
    const requestBody = JSON.stringify({
        locale: IyzicoConfig.locale,
        conversationId: IyzicoConfig.conversationId,
        name: data.name,
        description: data.description || data.name
    });

    const randomString = generateRandomString();
    const uri = `${IyzicoConfig.baseUrl}/v2/subscription/products`;

    const authString = generateIyzicoV2Header(
        uri,
        IyzicoConfig.apiKey,
        IyzicoConfig.secretKey,
        randomString,
        requestBody
    );

    console.log('[IYZICO] Creating product:', data.name);
    console.log('[IYZICO] API URL:', uri);
    console.log('[IYZICO] Request Body:', requestBody);

    try {
        const response = await fetch(uri, {
            method: 'POST',
            headers: getIyzicoHeaders(authString, randomString),
            body: requestBody
        });

        const result = await response.json();
        console.log('[IYZICO] Product Creation Response:', JSON.stringify(result));

        if (result.status === 'success') {
            return {
                status: 'success',
                referenceCode: result.referenceCode
            };
        } else {
            return {
                status: 'failure',
                errorMessage: result.errorMessage
            };
        }
    } catch (error: any) {
        return {
            status: 'failure',
            errorMessage: error.message
        };
    }
}

export async function createPricingPlan(data: {
    productReferenceCode: string;
    name: string;
    price: number;
    currencyCode: 'TRY' | 'USD' | 'EUR';
    paymentInterval: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    paymentIntervalCount: number;
    trialPeriodDays?: number;
    planPaymentType?: 'RECURRING';
}): Promise<{ status: string; errorMessage?: string; referenceCode?: string }> {
    const requestBody = JSON.stringify({
        locale: IyzicoConfig.locale,
        conversationId: IyzicoConfig.conversationId,
        productReferenceCode: data.productReferenceCode,
        name: data.name,
        price: data.price.toFixed(2), // Ensure string format like "700.00"
        currencyCode: data.currencyCode,
        paymentInterval: data.paymentInterval,
        paymentIntervalCount: data.paymentIntervalCount,
        trialPeriodDays: data.trialPeriodDays,
        planPaymentType: data.planPaymentType || 'RECURRING'
    });

    const randomString = generateRandomString();
    // Reference code is in URL path, so we use it for URI construction but also it should be in payload logic presumably handled by URI extractor
    const uri = `${IyzicoConfig.baseUrl}/v2/subscription/products/${data.productReferenceCode}/pricing-plans`;

    const authString = generateIyzicoV2Header(
        uri,
        IyzicoConfig.apiKey,
        IyzicoConfig.secretKey,
        randomString,
        requestBody
    );

    console.log('[IYZICO] Creating pricing plan:', data.name);
    console.log('[IYZICO] API URL:', uri);
    console.log('[IYZICO] Request Body:', requestBody);

    try {
        const response = await fetch(uri, {
            method: 'POST',
            headers: getIyzicoHeaders(authString, randomString),
            body: requestBody
        });

        const result = await response.json();
        console.log('[IYZICO] Pricing Plan Response:', JSON.stringify(result));

        if (result.status === 'success') {
            return {
                status: 'success',
                referenceCode: result.referenceCode
            };
        } else {
            return {
                status: 'failure',
                errorMessage: result.errorMessage
            };
        }
    } catch (error: any) {
        return {
            status: 'failure',
            errorMessage: error.message
        };
    }
}
