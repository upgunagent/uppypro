
import { NextResponse } from 'next/server';
import { createProduct, createPricingPlan, getAllProducts } from '@/lib/iyzico';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
    const debugLog: any[] = [];
    try {
        const results = [];

        // --- STEP 0: CHECK EXISTING PRODUCTS ---
        console.log('Fetching existing products...');
        debugLog.push('Step 0: Fetching existing products...');

        const allProducts = await getAllProducts();
        debugLog.push({ msg: 'Get All Products Result', status: allProducts.status, itemCount: allProducts.items?.length, error: allProducts.errorMessage });

        let existingInboxProduct = null;
        let existingAiProduct = null;

        if (allProducts.status === 'success' && allProducts.items) {
            // Log names for debugging
            debugLog.push({ msg: 'Found Products', names: allProducts.items.map((p: any) => p.name) });

            existingInboxProduct = allProducts.items.find((p: any) => p.name === 'UppyPro Inbox' || p.name?.includes('Inbox'));
            existingAiProduct = allProducts.items.find((p: any) => p.name === 'UppyPro AI' || p.name?.includes('AI'));
        } else {
            console.warn('Failed to list products:', allProducts.errorMessage);
            debugLog.push('Trying Debug Auth Strategies...');
            // Import dynamically to avoid top-level issues if not exported yet
            const { debugIyzicoAuth } = await import('@/lib/iyzico');
            const debugResults = await debugIyzicoAuth();
            debugLog.push({ msg: 'Auth Debug Results', results: debugResults });
        }

        // --- STEP 1: INBOX PRODUCT ---
        let inboxReferenceCode = existingInboxProduct?.referenceCode;

        if (existingInboxProduct) {
            console.log('Inbox Product already exists:', existingInboxProduct.referenceCode);
            results.push({ step: 'Inbox Product (Found Existing)', code: inboxReferenceCode });
            debugLog.push('Skipping Inbox Creation - Found Existing');
        } else {
            console.log('Creating Inbox Product...');
            const inboxProduct = await createProduct({
                name: 'UppyPro Inbox',
                description: 'Instagram inbox automation'
            });

            if (inboxProduct.status !== 'success' || !inboxProduct.referenceCode) {
                // Double check if error is "Already Exists" but we missed it in Step 0
                throw {
                    message: `Failed to create Inbox product: ${inboxProduct.errorMessage || 'Missing Reference Code'}`,
                    details: inboxProduct.errorDetails || inboxProduct.rawResult || inboxProduct,
                    debug: debugLog
                };
            }
            inboxReferenceCode = inboxProduct.referenceCode;
            results.push({ step: 'Create Inbox Product', code: inboxReferenceCode });
        }

        // Update Product in DB
        await supabase
            .from('products')
            .update({ iyzico_product_reference_code: inboxReferenceCode })
            .eq('product_key', 'uppypro_inbox');


        // --- STEP 1.1: INBOX PLAN ---
        console.log('Creating Inbox Monthly Plan...');
        const inboxPlan = await createPricingPlan({
            productReferenceCode: inboxReferenceCode!,
            name: 'UppyPro Inbox Monthly',
            price: 700.00, // Approx 20 USD
            currencyCode: 'TRY',
            paymentInterval: 'MONTHLY',
            paymentIntervalCount: 1,
            planPaymentType: 'RECURRING'
        });

        if (inboxPlan.status !== 'success' || !inboxPlan.referenceCode) {
            throw {
                message: `Failed to create Inbox Plan: ${inboxPlan.errorMessage || 'Missing Reference Code'}`,
                details: inboxPlan.errorDetails || inboxPlan.rawResult || inboxPlan,
                debug: debugLog
            };
        }
        results.push({ step: 'Create Inbox Plan', code: inboxPlan.referenceCode });

        // Update Pricing in DB
        await supabase
            .from('pricing')
            .update({ iyzico_pricing_plan_reference_code: inboxPlan.referenceCode })
            .eq('product_key', 'uppypro_inbox')
            .eq('billing_cycle', 'monthly');


        // --- STEP 2: AI PRODUCT ---
        let aiReferenceCode = existingAiProduct?.referenceCode;

        if (existingAiProduct) {
            console.log('AI Product already exists:', existingAiProduct.referenceCode);
            results.push({ step: 'AI Product (Found Existing)', code: aiReferenceCode });
        } else {
            console.log('Creating AI Product...');
            const aiProduct = await createProduct({
                name: 'UppyPro AI',
                description: 'AI Customer Engagement'
            });

            if (aiProduct.status !== 'success' || !aiProduct.referenceCode) {
                throw {
                    message: `Failed to create AI product: ${aiProduct.errorMessage || 'Missing Reference Code'}`,
                    details: aiProduct.errorDetails || aiProduct.rawResult || aiProduct,
                    debug: debugLog
                };
            }
            aiReferenceCode = aiProduct.referenceCode;
            results.push({ step: 'Create AI Product', code: aiReferenceCode });
        }

        // Update Product in DB
        await supabase
            .from('products')
            .update({ iyzico_product_reference_code: aiReferenceCode })
            .eq('product_key', 'uppypro_ai');


        // --- STEP 2.1: AI PLAN ---
        console.log('Creating AI Monthly Plan...');
        const aiPlan = await createPricingPlan({
            productReferenceCode: aiReferenceCode!,
            name: 'UppyPro AI Monthly',
            price: 2800.00, // Approx 80 USD
            currencyCode: 'TRY',
            paymentInterval: 'MONTHLY',
            paymentIntervalCount: 1,
            planPaymentType: 'RECURRING'
        });

        if (aiPlan.status !== 'success' || !aiPlan.referenceCode) {
            throw {
                message: `Failed to create AI Plan: ${aiPlan.errorMessage || 'Missing Reference Code'}`,
                details: aiPlan.errorDetails || aiPlan.rawResult || aiPlan,
                debug: debugLog
            };
        }
        results.push({ step: 'Create AI Plan', code: aiPlan.referenceCode });

        // Update Pricing in DB
        await supabase
            .from('pricing')
            .update({ iyzico_pricing_plan_reference_code: aiPlan.referenceCode })
            .eq('product_key', 'uppypro_ai')
            .eq('billing_cycle', 'monthly');

        return NextResponse.json({ success: true, results, debug: debugLog });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message || 'Unknown error',
            details: error.details || error,
            debug: debugLog || undefined
        }, { status: 500 });
    }
}
