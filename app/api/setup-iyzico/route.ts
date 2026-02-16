
import { NextResponse } from 'next/server';
import { createProduct, createPricingPlan } from '@/lib/iyzico';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
    try {
        const results = [];

        // 1. Create INBOX Product
        console.log('Creating Inbox Product...');
        const inboxProduct = await createProduct({
            name: 'UppyPro Inbox',
            description: 'Instagram inbox automation'
        });

        if (inboxProduct.status !== 'success' || !inboxProduct.referenceCode) {
            throw new Error(`Failed to create Inbox product: ${inboxProduct.errorMessage}`);
        }
        results.push({ step: 'Create Inbox Product', code: inboxProduct.referenceCode });

        // Update Product in DB
        await supabase
            .from('products')
            .update({ iyzico_product_reference_code: inboxProduct.referenceCode })
            .eq('product_key', 'uppypro_inbox');

        // 1.1 Create Inbox Monthly Plan
        // Exchange Rate Strategy: We set a base USD price. 
        // BUT Iyzico requires TRY for Sandbox usually, or we can use USD if enabled.
        // Let's assume we use TRY and convert dynamically, OR simply set a fixed TRY price for testing.
        // The user said: "tüm ödemeler sitede gözüken dolar miktarı kur bazında tl ye çevrilerek müşteriye tl olarak ödeme çekiliyor"
        // This usually means the CHARGE is in TRY.
        // If we create a SUBSCRIPTION in Iyzico, the price is FIXED at creation time of the plan.
        // If we want dynamic conversion, we can't use fixed subscription plans easily unless we update them daily?
        // OR does Iyzico support USD?
        // For now, let's create a plan with a fixed TRY amount for testing (e.g. 19.99 * 35 = ~700 TL)
        // OR better: Create a plan with USD currency code if Iyzico Sandbox supports it.

        console.log('Creating Inbox Monthly Plan...');
        const inboxPlan = await createPricingPlan({
            productReferenceCode: inboxProduct.referenceCode,
            name: 'UppyPro Inbox Monthly',
            price: 700.00, // Approx 20 USD
            currencyCode: 'TRY',
            paymentInterval: 'MONTHLY',
            paymentIntervalCount: 1,
            planPaymentType: 'RECURRING'
        });

        if (inboxPlan.status !== 'success' || !inboxPlan.referenceCode) {
            throw new Error(`Failed to create Inbox Plan: ${inboxPlan.errorMessage}`);
        }
        results.push({ step: 'Create Inbox Plan', code: inboxPlan.referenceCode });

        // Update Pricing in DB
        await supabase
            .from('pricing')
            .update({ iyzico_pricing_plan_reference_code: inboxPlan.referenceCode })
            .eq('product_key', 'uppypro_inbox')
            .eq('billing_cycle', 'monthly');


        // 2. Create AI Product
        console.log('Creating AI Product...');
        const aiProduct = await createProduct({
            name: 'UppyPro AI',
            description: 'AI Customer Engagement'
        });

        if (aiProduct.status !== 'success' || !aiProduct.referenceCode) {
            throw new Error(`Failed to create AI product: ${aiProduct.errorMessage}`);
        }
        results.push({ step: 'Create AI Product', code: aiProduct.referenceCode });

        // Update Product in DB
        await supabase
            .from('products')
            .update({ iyzico_product_reference_code: aiProduct.referenceCode })
            .eq('product_key', 'uppypro_ai');

        // 2.1 Create AI Monthly Plan
        console.log('Creating AI Monthly Plan...');
        const aiPlan = await createPricingPlan({
            productReferenceCode: aiProduct.referenceCode,
            name: 'UppyPro AI Monthly',
            price: 2800.00, // Approx 80 USD
            currencyCode: 'TRY',
            paymentInterval: 'MONTHLY',
            paymentIntervalCount: 1,
            planPaymentType: 'RECURRING'
        });

        if (aiPlan.status !== 'success' || !aiPlan.referenceCode) {
            throw new Error(`Failed to create AI Plan: ${aiPlan.errorMessage}`);
        }
        results.push({ step: 'Create AI Plan', code: aiPlan.referenceCode });

        // Update Pricing in DB
        await supabase
            .from('pricing')
            .update({ iyzico_pricing_plan_reference_code: aiPlan.referenceCode })
            .eq('product_key', 'uppypro_ai')
            .eq('billing_cycle', 'monthly');

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
