
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
            throw { message: `Failed to create Inbox product: ${inboxProduct.errorMessage}`, details: inboxProduct.errorDetails };
        }
        results.push({ step: 'Create Inbox Product', code: inboxProduct.referenceCode });

        // Update Product in DB
        await supabase
            .from('products')
            .update({ iyzico_product_reference_code: inboxProduct.referenceCode })
            .eq('product_key', 'uppypro_inbox');

        // 1.1 Create Inbox Monthly Plan
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
            throw { message: `Failed to create Inbox Plan: ${inboxPlan.errorMessage}`, details: inboxPlan.errorDetails };
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
            throw { message: `Failed to create AI product: ${aiProduct.errorMessage}`, details: aiProduct.errorDetails };
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
            throw { message: `Failed to create AI Plan: ${aiPlan.errorMessage}`, details: aiPlan.errorDetails };
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
        return NextResponse.json({
            success: false,
            error: error.message || 'Unknown error',
            details: error.details || error
        }, { status: 500 });
    }
}
