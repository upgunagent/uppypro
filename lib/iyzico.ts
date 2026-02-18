import crypto from 'crypto';

export const IyzicoConfig = {
    apiKey: (process.env.IYZICO_API_KEY || '').trim(),
    secretKey: (process.env.IYZICO_SECRET_KEY || '').trim(),
    baseUrl: (process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com').trim(),
    locale: 'tr',
    conversationId: Date.now().toString()
};

// Iyzico V2 Authentication Helper
function generateIyzicoV2Header(
    uri: string,
    apiKey: string,
    secretKey: string,
    randomString: string,
    requestBody: string | null
): string {
    let uriPath = uri;
    const v2Index = uri.indexOf('/v2');
    if (v2Index !== -1) {
        // For V2, we need the path including query params if it's a GET request
        // The implementation below was stripping query params, which causes auth failure for GET
        uriPath = uri.substring(v2Index);
    }

    let payload = randomString + uriPath;
    if (requestBody && requestBody !== '[]' && requestBody !== '{}') {
        payload += requestBody;
    }

    const signature = crypto
        .createHmac('sha256', secretKey)
        .update(payload)
        .digest('hex');

    const authString = `apiKey:${apiKey}&randomKey:${randomString}&signature:${signature}`;

    // Debug Logging
    console.log('[IYZICO Auth Debug] URI:', uri);
    console.log('[IYZICO Auth Debug] Payload:', payload);
    console.log('[IYZICO Auth Debug] Signature:', signature);

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
}): Promise<{ token?: string; checkoutFormContent?: string; status: string; errorMessage?: string; errorDetails?: any }> {
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
                errorMessage: result.errorMessage || 'Unknown error',
                errorDetails: result
            };
        }
    } catch (error: any) {
        console.error('[IYZICO] Exception:', error);
        return {
            status: 'failure',
            errorMessage: error.message,
            errorDetails: error
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
}): Promise<{ token?: string; checkoutFormContent?: string; status: string; errorMessage?: string; errorDetails?: any }> {
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
            errorMessage: result.errorMessage,
            errorDetails: result
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
}): Promise<{ status: string; errorMessage?: string; referenceCode?: string; errorDetails?: any; rawResult?: any }> {
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

    try {
        const response = await fetch(uri, {
            method: 'POST',
            headers: getIyzicoHeaders(authString, randomString),
            body: requestBody
        });

        const result = await response.json();
        console.log('[IYZICO] Product Creation Response:', JSON.stringify(result));

        if (result.status === 'success') {
            // Aggressive reference code extraction
            const refCode = result.referenceCode ||
                result.data?.referenceCode ||
                result.productReferenceCode ||
                result.data?.productReferenceCode;

            return {
                status: 'success',
                referenceCode: refCode,
                rawResult: result
            };
        } else {
            return {
                status: 'failure',
                errorMessage: result.errorMessage,
                errorDetails: result
            };
        }
    } catch (error: any) {
        return {
            status: 'failure',
            errorMessage: error.message,
            errorDetails: error
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
}): Promise<{ status: string; errorMessage?: string; referenceCode?: string; errorDetails?: any; rawResult?: any }> {
    const requestBody = JSON.stringify({
        locale: IyzicoConfig.locale,
        conversationId: IyzicoConfig.conversationId,
        productReferenceCode: data.productReferenceCode,
        name: data.name,
        price: data.price.toFixed(2),
        currencyCode: data.currencyCode,
        paymentInterval: data.paymentInterval,
        paymentIntervalCount: data.paymentIntervalCount,
        trialPeriodDays: data.trialPeriodDays,
        planPaymentType: data.planPaymentType || 'RECURRING'
    });

    const randomString = generateRandomString();
    const uri = `${IyzicoConfig.baseUrl}/v2/subscription/products/${data.productReferenceCode}/pricing-plans`;

    const authString = generateIyzicoV2Header(
        uri,
        IyzicoConfig.apiKey,
        IyzicoConfig.secretKey,
        randomString,
        requestBody
    );

    console.log('[IYZICO] Creating pricing plan:', data.name);

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
                referenceCode: result.referenceCode || result.data?.referenceCode,
                rawResult: result
            };
        } else {
            return {
                status: 'failure',
                errorMessage: result.errorMessage,
                errorDetails: result
            };
        }
    } catch (error: any) {
        return {
            status: 'failure',
            errorMessage: error.message,
            errorDetails: error
        };
    }
}

export async function getAllProducts(): Promise<{ status: string; errorMessage?: string; items?: any[]; errorDetails?: any }> {
    const randomString = generateRandomString();

    // Construct Query Params Deterministically
    const params = new URLSearchParams({
        locale: IyzicoConfig.locale,
        conversationId: IyzicoConfig.conversationId,
        page: '1',
        count: '100' // Fetch more items to ensure we find ours
    });

    // Ensure baseUrl has no trailing slash
    const baseUrl = IyzicoConfig.baseUrl.replace(/\/+$/, '');
    const path = '/v2/subscription/products';
    const queryString = params.toString(); // e.g. "locale=tr&conversationId=..."

    // Full URI
    const uri = `${baseUrl}${path}?${queryString}`;

    console.log('[IYZICO] Signing Payload for GET:', {
        path: path,
        query: queryString,
        fullUri: uri
    });

    const authString = generateIyzicoV2Header(
        uri,
        IyzicoConfig.apiKey,
        IyzicoConfig.secretKey,
        randomString,
        null
    );

    try {
        const response = await fetch(uri, {
            method: 'GET',
            headers: getIyzicoHeaders(authString, randomString)
        });

        const result = await response.json();
        // Log result
        console.log('[IYZICO] Get All Products Response:', JSON.stringify(result).substring(0, 500) + '...');

        if (result.status === 'success') {
            return {
                status: 'success',
                items: result.data?.items || result.items || [],
            };
        } else {
            return {
                status: 'failure',
                errorMessage: result.errorMessage,
                errorDetails: result
            };
        }
    } catch (error: any) {
        return {
            status: 'failure',
            errorMessage: error.message,
            errorDetails: error
        };
    }
}
