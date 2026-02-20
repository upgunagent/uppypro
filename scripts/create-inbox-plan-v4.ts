
import { getAllProducts, createPricingPlan } from '@/lib/iyzico';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
    console.log("Searching for UppyPro Inbox...");
    const productsRes = await getAllProducts();

    if (productsRes.status !== 'success') {
        console.error("Products Fetch Error:", productsRes.errorMessage);
        if (productsRes.errorDetails) console.error("Details:", JSON.stringify(productsRes.errorDetails));
        return;
    }

    const items = productsRes.items || [];
    const inbox = items.find((p: any) => p.name === 'UppyPro Inbox');

    if (!inbox) {
        console.error("UppyPro Inbox not found. Available:", items.map((p: any) => p.name));
        return;
    }

    console.log(`Found Inbox Ref: ${inbox.referenceCode}`);

    // Create Plan
    const price = 895 * 1.20; // 1074.00 TL
    const planRes = await createPricingPlan({
        productReferenceCode: inbox.referenceCode,
        name: 'UppyPro Inbox Aylık Plan (TL)',
        price: price,
        currencyCode: 'TRY',
        paymentInterval: 'MONTHLY',
        paymentIntervalCount: 1,
        planPaymentType: 'RECURRING'
    });

    if (planRes.status === 'success') {
        const planRef = planRes.referenceCode!;
        console.log(`>>> RESULT: UppyPro Inbox -> ProductRef: ${inbox.referenceCode} | PlanRef: ${planRef}`);
    } else {
        console.error("Plan Creation Failed:", planRes.errorMessage);
    }
}

main();
