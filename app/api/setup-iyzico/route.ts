
import { NextResponse } from 'next/server';
import { createProduct, createPricingPlan, getAllProducts, debugIyzicoAuth } from '@/lib/iyzico';
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

        // --- STEP 0: CHECK EXISTING PRODUCTS (Non-Blocking) ---
        console.log('Fetching existing products...');
        debugLog.push('Step 0: Fetching existing products (Best Effort)...');

        let existingInboxProduct = null;
        let existingAiProduct = null;

        const allProducts = await getAllProducts();

        if (allProducts.status === 'success' && allProducts.items) {
            debugLog.push({ msg: 'Found Products', names: allProducts.items.map((p: any) => p.name) });
            existingInboxProduct = allProducts.items.find((p: any) => p.name?.includes('Inbox'));
            existingAiProduct = allProducts.items.find((p: any) => p.name?.includes('AI'));
        } else {
            // Just log warning, don't fail, and proceed to create new V2 products
            console.warn('Authentication failed for GET. Proceeding with V2 creation.', allProducts.errorMessage);
            debugLog.push('GET Query Failed - Proceeding with "Create New (v2)" Strategy');
        }

        // --- STEP 1: INBOX PRODUCT (v2) ---
        let inboxReferenceCode = existingInboxProduct?.referenceCode;

        if (existingInboxProduct) {
            console.log('Inbox Product already exists:', existingInboxProduct.referenceCode);
            results.push({ step: 'Inbox Product (Found Existing)', code: inboxReferenceCode });
        } else {
            console.log('Creating Inbox Product (v2)...');
            // Using "v2" name to ensure uniqueness and bypass "Already Exists" error from v1
            const inboxProduct = await createProduct({
                name: 'UppyPro Inbox v2',
                description: 'Instagram inbox automation (v2)'
            });

            if (inboxProduct.status !== 'success' || !inboxProduct.referenceCode) {
                throw {
                    message: `Failed to create Inbox product: ${inboxProduct.errorMessage || 'Missing Reference Code'}`,
                    details: inboxProduct.errorDetails || inboxProduct.rawResult || inboxProduct,
                    debug: debugLog
                };
            }
            inboxReferenceCode = inboxProduct.referenceCode;
            results.push({ step: 'Create Inbox Product v2', code: inboxReferenceCode });
        }

        // Update Product in DB
        await supabase
            .from('products')
            .update({ iyzico_product_reference_code: inboxReferenceCode })
            .eq('product_key', 'uppypro_inbox');


        // --- STEP 1.1: INBOX PLAN (v2) ---
        console.log('Creating Inbox Monthly Plan (v2)...');
        const inboxPlan = await createPricingPlan({
            productReferenceCode: inboxReferenceCode!,
            name: 'UppyPro Inbox Monthly v2',
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
        results.push({ step: 'Create Inbox Plan v2', code: inboxPlan.referenceCode });

        // Update Pricing in DB
        await supabase
            .from('pricing')
            .update({ iyzico_pricing_plan_reference_code: inboxPlan.referenceCode })
            .eq('product_key', 'uppypro_inbox')
            .eq('billing_cycle', 'monthly');


        // --- STEP 2: AI PRODUCT (v2) ---
        let aiReferenceCode = existingAiProduct?.referenceCode;

        if (existingAiProduct) {
            console.log('AI Product already exists:', existingAiProduct.referenceCode);
            results.push({ step: 'AI Product (Found Existing)', code: aiReferenceCode });
        } else {
            console.log('Creating AI Product (v2)...');
            const aiProduct = await createProduct({
                name: 'UppyPro AI v2',
                description: 'AI Customer Engagement (v2)'
            });

            if (aiProduct.status !== 'success' || !aiProduct.referenceCode) {
                throw {
                    message: `Failed to create AI product: ${aiProduct.errorMessage || 'Missing Reference Code'}`,
                    details: aiProduct.errorDetails || aiProduct.rawResult || aiProduct,
                    debug: debugLog
                };
            }
            aiReferenceCode = aiProduct.referenceCode;
            results.push({ step: 'Create AI Product v2', code: aiReferenceCode });
        }

        // Update Product in DB
        await supabase
            .from('products')
            .update({ iyzico_product_reference_code: aiReferenceCode })
            .eq('product_key', 'uppypro_ai');


        // --- STEP 2.1: AI PLAN (v2) ---
        console.log('Creating AI Monthly Plan (v2)...');
        const aiPlan = await createPricingPlan({
            productReferenceCode: aiReferenceCode!,
            name: 'UppyPro AI Monthly v2',
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
        results.push({ step: 'Create AI Plan v2', code: aiPlan.referenceCode });

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
