import dotenv from 'dotenv';
const path = require('path');
const crypto = require('crypto');

console.log('CWD:', process.cwd());
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// FORCE SET KEYS TO ENSURE THEY ARE CORRECT regardless of hoisting
const IyzicoConfig = {
    apiKey: 'UklEOEwW0EVVeq1yJ9QfuunqTfRp1Au1',
    secretKey: 'TZjw9WCRPQVCMPetorQ2IvitZGq95Whs',
    baseUrl: 'https://sandbox-api.iyzipay.com',
    locale: 'tr'
};

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
        const questionMarkIndex = uri.indexOf('?');
        if (questionMarkIndex !== -1) {
            uriPath = uri.substring(v2Index, questionMarkIndex);
        } else {
            uriPath = uri.substring(v2Index);
        }
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

    console.log('[Debug] Sig Payload:', payload);
    console.log('[Debug] Signature:', signature);

    return `IYZWSv2 ${Buffer.from(authString).toString('base64')}`;
}

async function main() {
    console.log('--- Iyzico Debug Script (Refined) ---');

    // Simpler random string
    const randomString = Date.now().toString();
    const uri = `${IyzicoConfig.baseUrl}/v2/subscription/products`;

    // Ordered strictly
    const requestData = {
        locale: IyzicoConfig.locale,
        conversationId: '123456789',
        name: `Test Product ${Date.now()}`,
        description: 'Test Description'
    };
    const requestBody = JSON.stringify(requestData);

    const authString = generateIyzicoV2Header(
        uri,
        IyzicoConfig.apiKey,
        IyzicoConfig.secretKey,
        randomString,
        requestBody
    );

    console.log('Key:', IyzicoConfig.apiKey.slice(0, 5) + '...');
    console.log('Auth:', authString);
    console.log('Body:', requestBody);

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

        const result = await response.json();
        console.log('\n--- Response ---');
        console.log(JSON.stringify(result, null, 2));
    } catch (e) {
        console.error(e);
    }
}

main().catch(console.error);
