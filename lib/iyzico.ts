import crypto from 'crypto';

// Iyzico Authentication Helper
function generateIyzicoAuthString(
    apiKey: string,
    secretKey: string,
    randomString: string,
    requestBody: string
): string {
    const dataToSign = randomString + requestBody;
    const hash = crypto
        .createHmac('sha256', secretKey)
        .update(dataToSign)
        .digest('base64');

    return `IYZWSv2 ${apiKey}:${hash}:${randomString}`;
}

function generateRandomString(): string {
    return crypto.randomBytes(16).toString('hex');
}

export const IyzicoConfig = {
    apiKey: process.env.IYZICO_API_KEY || '',
    secretKey: process.env.IYZICO_SECRET_KEY || '',
    baseUrl: process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com',
    locale: 'tr',
    conversationId: Date.now().toString()
};

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
    const authString = generateIyzicoAuthString(
        IyzicoConfig.apiKey,
        IyzicoConfig.secretKey,
        randomString,
        requestBody
    );

    console.log('[IYZICO] Initializing subscription checkout...');
    console.log('[IYZICO] API URL:', `${IyzicoConfig.baseUrl}/v2/subscription/checkoutform/initialize`);

    try {
        const response = await fetch(`${IyzicoConfig.baseUrl}/v2/subscription/checkoutform/initialize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authString,
                'x-iyzi-rnd': randomString
            },
            body: requestBody
        });

        const result = await response.json();
        console.log('[IYZICO] Response status:', result.status);

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
    const authString = generateIyzicoAuthString(
        IyzicoConfig.apiKey,
        IyzicoConfig.secretKey,
        randomString,
        requestBody
    );

    const response = await fetch(`${IyzicoConfig.baseUrl}/v2/subscription/checkoutform/auth/result`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': authString,
            'x-iyzi-rnd': randomString
        },
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
    const authString = generateIyzicoAuthString(
        IyzicoConfig.apiKey,
        IyzicoConfig.secretKey,
        randomString,
        requestBody
    );

    const response = await fetch(`${IyzicoConfig.baseUrl}/v2/subscription/cancel`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': authString,
            'x-iyzi-rnd': randomString
        },
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
    const authString = generateIyzicoAuthString(
        IyzicoConfig.apiKey,
        IyzicoConfig.secretKey,
        randomString,
        requestBody
    );

    const response = await fetch(`${IyzicoConfig.baseUrl}/v2/subscription/card-update/initialize`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': authString,
            'x-iyzi-rnd': randomString
        },
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
    const authString = generateIyzicoAuthString(
        IyzicoConfig.apiKey,
        IyzicoConfig.secretKey,
        randomString,
        requestBody
    );

    const response = await fetch(`${IyzicoConfig.baseUrl}/v2/subscription/card-update/auth/result`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': authString,
            'x-iyzi-rnd': randomString
        },
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
    const authString = generateIyzicoAuthString(
        IyzicoConfig.apiKey,
        IyzicoConfig.secretKey,
        randomString,
        requestBody
    );

    try {
        const response = await fetch(`${IyzicoConfig.baseUrl}/v2/subscription/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authString,
                'x-iyzi-rnd': randomString
            },
            body: requestBody
        });

        const result = await response.json();

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
        price: data.price.toString(),
        currencyCode: data.currencyCode,
        paymentInterval: data.paymentInterval,
        paymentIntervalCount: data.paymentIntervalCount,
        trialPeriodDays: data.trialPeriodDays,
        planPaymentType: data.planPaymentType || 'RECURRING'
    });

    const randomString = generateRandomString();
    const authString = generateIyzicoAuthString(
        IyzicoConfig.apiKey,
        IyzicoConfig.secretKey,
        randomString,
        requestBody
    );

    try {
        // Note: productReferenceCode is in the URL!
        const response = await fetch(`${IyzicoConfig.baseUrl}/v2/subscription/products/${data.productReferenceCode}/pricing-plans`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authString,
                'x-iyzi-rnd': randomString
            },
            body: requestBody
        });

        const result = await response.json();

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
