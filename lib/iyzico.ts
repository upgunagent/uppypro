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
    if (requestBody) {
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
    conversationId?: string;
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
        conversationId: data.conversationId || IyzicoConfig.conversationId,
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
    // Correct Endpoint for Subscription V2 is GET /v2/subscription/checkoutform/{token}
    // and expects NO body (or empty body) but signed payload.

    const randomString = generateRandomString();

    // The endpoint path has the token in it.
    const path = `/v2/subscription/checkoutform/${token}`;
    const uri = `${IyzicoConfig.baseUrl}${path}`;

    // For V2 GET, iyzipay-node appends "{}" (stringified empty object) to the payload
    // if there is no request model (which is the case for retrieve).
    // So we must pass "{}" as body for signature generation, even if we don't send it in fetch.

    const requestBody = "{}";

    const authString = generateIyzicoV2Header(
        uri,
        IyzicoConfig.apiKey,
        IyzicoConfig.secretKey,
        randomString,
        requestBody
    );

    console.log(`[IYZICO] Retrieving result for token: ${token} at ${uri}`);

    try {
        const response = await fetch(uri, {
            method: 'GET',
            headers: getIyzicoHeaders(authString, randomString)
        });

        const result = await response.json();
        console.log('[IYZICO] Retrieve Result:', JSON.stringify(result));

        // Normalize Result for caller
        // If success, result likely contains data directly or in .data
        // We will flatten/merge it so the caller can find .subscriptionReferenceCode

        if (result.status === 'success') {
            return {
                ...result,
                ...result.data, // Flatten data if present
                status: 'success'
            };
        }

        return result;
    } catch (error: any) {
        console.error('[IYZICO] Retrieve Exception:', error);
        throw error;
    }
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
    const payload: any = {
        locale: IyzicoConfig.locale,
        conversationId: IyzicoConfig.conversationId,
        callbackUrl: data.callbackUrl
    };

    if (data.subscriptionReferenceCode) {
        payload.subscriptionReferenceCode = data.subscriptionReferenceCode;
    }
    if (data.customerReferenceCode) {
        payload.customerReferenceCode = data.customerReferenceCode;
    }

    const requestBody = JSON.stringify(payload);

    const randomString = generateRandomString();
    const uri = `${IyzicoConfig.baseUrl}/v2/subscription/card-update/checkoutform/initialize`;

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

    const responseText = await response.text();
    let result;
    try {
        result = JSON.parse(responseText);
    } catch (e) {
        console.error("Iyzico Invalid JSON Response:", responseText);
        throw new Error(`Iyzico API Response Error (${uri}): ${responseText.slice(0, 100)}`);
    }

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

export async function upgradeSubscription(subscriptionReferenceCode: string, newPricingPlanReferenceCode: string): Promise<any> {
    const requestBody = JSON.stringify({
        locale: IyzicoConfig.locale,
        conversationId: IyzicoConfig.conversationId,
        newPricingPlanReferenceCode: newPricingPlanReferenceCode,
        subscriptionReferenceCode: subscriptionReferenceCode // Add ref code to body as per docs? Correct endpoint has it in URL but body usually mirrors it. No, docs say URL parameter. Body has newPricingPlanReferenceCode.
    });
    // Wait, let's check docs: https://docs.iyzico.com/urunler/abonelik/abonelik-entegrasyonu/abonelik-islemleri#post-v2-subscription-subscriptions-subscriptionreferencecode-upgrade
    // Endpoint: /v2/subscription/subscriptions/{subscriptionReferenceCode}/upgrade
    // Body: { locale, conversationId, newPricingPlanReferenceCode }
    // Correct.

    const randomString = generateRandomString();
    const uri = `${IyzicoConfig.baseUrl}/v2/subscription/subscriptions/${subscriptionReferenceCode}/upgrade`;

    const authString = generateIyzicoV2Header(
        uri,
        IyzicoConfig.apiKey,
        IyzicoConfig.secretKey,
        randomString,
        requestBody
    );

    console.log(`[IYZICO] Upgrading subscription ${subscriptionReferenceCode} to plan ${newPricingPlanReferenceCode}`);

    try {
        const response = await fetch(uri, {
            method: 'POST',
            headers: getIyzicoHeaders(authString, randomString),
            body: requestBody
        });

        const result = await response.json();
        return result;
    } catch (error: any) {
        console.error('[IYZICO] Upgrade Exception:', error);
        return {
            status: 'failure',
            errorMessage: error.message,
            errorDetails: error
        };
    }
}

export async function retrySubscription(referenceCode: string): Promise<any> {
    const requestBody = JSON.stringify({
        locale: IyzicoConfig.locale,
        conversationId: IyzicoConfig.conversationId,
        referenceCode: referenceCode
    });

    const randomString = generateRandomString();
    const uri = `${IyzicoConfig.baseUrl}/v2/subscription/operation/retry`;

    const authString = generateIyzicoV2Header(
        uri,
        IyzicoConfig.apiKey,
        IyzicoConfig.secretKey,
        randomString,
        requestBody
    );

    console.log(`[IYZICO] Retrying subscription payment for ${referenceCode}`);

    try {
        const response = await fetch(uri, {
            method: 'POST',
            headers: getIyzicoHeaders(authString, randomString),
            body: requestBody
        });

        const result = await response.json();
        return result;
    } catch (error: any) {
        console.error('[IYZICO] Retry Exception:', error);
        return {
            status: 'failure',
            errorMessage: error.message,
            errorDetails: error
        };
    }
}

export async function getSubscriptionCardUpdateResult(token: string): Promise<any> {
    // According to docs, Card Update via Checkout Form uses the same result retrieval as Subscription Checkout.
    // GET /v2/subscription/checkoutform/{token}

    // We can reuse the logic from getSubscriptionCheckoutFormResult
    return await getSubscriptionCheckoutFormResult(token);
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
    // Rely on Debug Function logic which seems robust, or simple retry.
    // For now, let's just make sure getAllProducts uses one of the strategies we are testing
    // Strat B (Sorted) seems most promising standard.

    // We will update getAllProducts to use the "proven" method once diagnostic confirms it.
    // For now, let's default it to what we *think* works: Sorted params.

    const randomString = generateRandomString();
    const baseUrl = IyzicoConfig.baseUrl.replace(/\/+$/, '');
    const path = '/v2/subscription/products';

    // Default to Sorted Alphabetically
    const params = new URLSearchParams();
    params.append('conversationId', IyzicoConfig.conversationId);
    params.append('count', '100');
    params.append('locale', IyzicoConfig.locale);
    params.append('page', '1');

    const qs = params.toString();
    const uri = `${baseUrl}${path}?${qs}`;

    // Signature includes params
    const payload = randomString + `${path}?${qs}`;
    const signature = crypto.createHmac('sha256', IyzicoConfig.secretKey).update(payload).digest('hex');
    const authString = `apiKey:${IyzicoConfig.apiKey}&randomKey:${randomString}&signature:${signature}`;
    const token = `IYZWSv2 ${Buffer.from(authString).toString('base64')}`;

    console.log('[IYZICO] Fetching all products (Speculative Sorted)...');

    try {
        const response = await fetch(uri, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': token,
                'x-iyzi-rnd': randomString,
                'x-iyzi-client-version': 'iyzipay-node-2.0.48'
            }
        });

        const result = await response.json();
        if (result.status === 'success') {
            return { status: 'success', items: result.data?.items || result.items || [] };
        } else {
            return { status: 'failure', errorMessage: result.errorMessage, errorDetails: result };
        }
    } catch (error: any) {
        return { status: 'failure', errorMessage: error.message, errorDetails: error };
    }
}

export async function debugIyzicoAuth(): Promise<any> {
    const strategies = [
        {
            name: 'Strat A: Unsorted (Original)', sort: false, params: {
                locale: IyzicoConfig.locale,
                conversationId: IyzicoConfig.conversationId,
                page: '1',
                count: '1'
            }
        },
        {
            name: 'Strat B: Sorted Alphabetically', sort: true, params: {
                conversationId: IyzicoConfig.conversationId, // c
                count: '1',                                  // co -> after conv? No. conversationId vs count. 'n' vs 'u'. conv < count.
                locale: IyzicoConfig.locale,
                page: '1'
            }
        },
        {
            name: 'Strat C: Minimal Params (Sorted)', sort: true, params: {
                conversationId: IyzicoConfig.conversationId,
                locale: IyzicoConfig.locale
            }
        },
        {
            name: 'Strat D: Only Page/Count', sort: true, params: {
                page: '1',
                count: '1'
            }
        },
        { name: 'Strat E: No Params (Clean)', sort: true, params: {} }
    ];

    const outcomes: any[] = [];

    const baseUrl = IyzicoConfig.baseUrl.replace(/\/+$/, '');
    const path = '/v2/subscription/products';
    const randomString = generateRandomString();

    for (const strat of strategies) {
        try {
            // Construct Query String
            const searchParams = new URLSearchParams();

            // Note: URLSearchParams doesn't guarantee sorting by append order implementation dependent? 
            // Better to just push keys safely.
            // Actually JS objects don't guarantee strict order, but we can try to force it by appending in order.

            // For Strat B (Sorted), we manually add them in alphabetical order of keys:
            // conversationId, count, locale, page

            if (strat.name.includes('Sorted')) {
                // Keys: conversationId, count, locale, page
                // 'conversationId' < 'count' ? 'v' vs 'u'. 'u' comes first! c-o-u-n-t vs c-o-n-v.
                // Wait. n vs u. n is before u.
                // con... vs cou...
                // n (110) vs u (117).
                // So conversationId < count.

                // Order:
                // conversationId
                // count
                // locale
                // page

                if (strat.params.conversationId) searchParams.append('conversationId', strat.params.conversationId);
                if (strat.params.count) searchParams.append('count', strat.params.count as string);
                if (strat.params.locale) searchParams.append('locale', strat.params.locale);
                if (strat.params.page) searchParams.append('page', strat.params.page as string);
            } else {
                // For unsorted or others, just append as iterate
                Object.keys(strat.params).forEach(key => searchParams.append(key, (strat.params as any)[key]));
            }

            const qs = searchParams.toString();
            const uri = qs ? `${baseUrl}${path}?${qs}` : `${baseUrl}${path}`;
            // Signature includes the full path + query
            const sigPayloadPath = qs ? `${path}?${qs}` : path;

            const payload = randomString + sigPayloadPath;
            const signature = crypto.createHmac('sha256', IyzicoConfig.secretKey).update(payload).digest('hex');
            const authStr = `apiKey:${IyzicoConfig.apiKey}&randomKey:${randomString}&signature:${signature}`;
            const token = `IYZWSv2 ${Buffer.from(authStr).toString('base64')}`;

            console.log(`[IyziDebug] ${strat.name}: Uri=${uri}, Payload=${payload}`);

            const response = await fetch(uri, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': token,
                    'x-iyzi-rnd': randomString,
                    'x-iyzi-client-version': 'iyzipay-node-2.0.48'
                }
            });

            const data = await response.json();
            outcomes.push({
                strategy: strat.name,
                success: data.status === 'success',
                error: data.errorMessage,
                signedPayload: payload
            });

            outcomes.push({ strategy: strat.name, error: e.message });
        }
    }
    return outcomes;
}

export async function getSubscriptionDetails(subscriptionReferenceCode: string): Promise<any> {
    const randomString = generateRandomString();
    const uri = `${IyzicoConfig.baseUrl}/v2/subscription/subscriptions/${subscriptionReferenceCode}`;

    // For GET /v2/subscription/subscriptions/{code}, we sign with empty body
    // iyzipay-node convention for GET V2 is often empty object stringified as body for signature
    const requestBody = "{}";

    const authString = generateIyzicoV2Header(
        uri,
        IyzicoConfig.apiKey,
        IyzicoConfig.secretKey,
        randomString,
        requestBody
    );

    try {
        const response = await fetch(uri, {
            method: 'GET',
            headers: getIyzicoHeaders(authString, randomString)
        });

        const result = await response.json();
        return result;
    } catch (error: any) {
        console.error('[IYZICO] Get Subscription Details Exception:', error);
        return { status: 'failure', errorMessage: error.message };
    }
}
