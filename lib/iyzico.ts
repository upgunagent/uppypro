import Iyzipay from 'iyzipay';

const iyzico = new Iyzipay({
    apiKey: process.env.IYZICO_API_KEY || 'sandbox',
    secretKey: process.env.IYZICO_SECRET_KEY || 'sandbox',
    uri: process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com'
});

export const IyzicoConfig = {
    locale: Iyzipay.LOCALE.TR,
    conversationId: '123456789'
};

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
        },
        shippingAddress: {
            contactName: string;
            city: string;
            country: string;
            address: string;
            zipCode: string;
        }
    }
}): Promise<{ token?: string; checkoutFormContent?: string; status: string; errorMessage?: string }> {
    return new Promise((resolve, reject) => {
        const request = {
            locale: IyzicoConfig.locale,
            conversationId: IyzicoConfig.conversationId,
            pricingPlanReferenceCode: data.pricingPlanReferenceCode,
            subscriptionInitialStatus: data.subscriptionInitialStatus,
            callbackUrl: data.callbackUrl,
            customer: data.customer
        };

        iyzico.subscriptionCheckoutForm.initialize(request, (err: any, result: any) => {
            if (err) {
                reject(err);
            } else {
                if (result.status === 'success') {
                    resolve({
                        token: result.token,
                        checkoutFormContent: result.checkoutFormContent,
                        status: result.status
                    });
                } else {
                    resolve({
                        status: result.status,
                        errorMessage: result.errorMessage
                    });
                }
            }
        });
    });
}

export async function getSubscriptionCheckoutFormResult(token: string): Promise<any> {
    return new Promise((resolve, reject) => {
        iyzico.subscriptionCheckoutForm.retrieve({
            locale: IyzicoConfig.locale,
            conversationId: IyzicoConfig.conversationId,
            token: token
        }, (err: any, result: any) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

export async function cancelSubscription(subscriptionReferenceCode: string): Promise<any> {
    return new Promise((resolve, reject) => {
        iyzico.subscription.cancel({
            locale: IyzicoConfig.locale,
            conversationId: IyzicoConfig.conversationId,
            subscriptionReferenceCode: subscriptionReferenceCode
        }, (err: any, result: any) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

export async function updateSubscriptionCard(data: {
    subscriptionReferenceCode?: string;
    customerReferenceCode: string;
    callbackUrl: string;
}): Promise<{ token?: string; checkoutFormContent?: string; status: string; errorMessage?: string }> {
    return new Promise((resolve, reject) => {
        // @ts-ignore - check type definition for card update
        iyzico.subscriptionCardUpdate.initialize({
            locale: IyzicoConfig.locale,
            conversationId: IyzicoConfig.conversationId,
            subscriptionReferenceCode: data.subscriptionReferenceCode,
            customerReferenceCode: data.customerReferenceCode,
            callbackUrl: data.callbackUrl
        }, (err: any, result: any) => {
            if (err) {
                reject(err);
            } else {
                if (result.status === 'success') {
                    resolve({
                        token: result.token,
                        checkoutFormContent: result.checkoutFormContent,
                        status: result.status
                    });
                } else {
                    resolve({
                        status: result.status,
                        errorMessage: result.errorMessage
                    });
                }
            }
        });
    });
}

export async function getSubscriptionCardUpdateResult(token: string): Promise<any> {
    return new Promise((resolve, reject) => {
        // @ts-ignore
        iyzico.subscriptionCardUpdate.retrieve({
            locale: IyzicoConfig.locale,
            conversationId: IyzicoConfig.conversationId,
            token: token
        }, (err: any, result: any) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}
