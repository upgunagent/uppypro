const Iyzipay = require('iyzipay');

const iyzipay = new Iyzipay({
    apiKey: 'sandbox-xxx',
    secretKey: 'sandbox-xxx',
    uri: 'https://sandbox-api.iyzipay.com'
});

// Hack: Hook into the request maker to see the exact endpoint and payload iyzipay node SDK uses
iyzipay.subscriptionCard._request = function (path, data, cb) {
    console.log("IYZICO NODE SDK REQUEST:");
    console.log("Path:", path);
    console.log("Data:", JSON.stringify(data, null, 2));
}

var updateReq = {
    locale: Iyzipay.LOCALE.EN,
    conversationId: '123456789',
    subscriptionReferenceCode: 'test-ref-code',
    callbackUrl: 'callbackUrl'
};

iyzipay.subscriptionCard.updateWithSubscriptionReferenceCode(updateReq, function (err, res) {
    console.log(err, res);
});
