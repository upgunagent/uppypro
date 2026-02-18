
import { NextResponse } from 'next/server';
import { createProduct, createPricingPlan, getAllProducts } from '@/lib/iyzico';
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
        let inboxProduct = await createProduct({
            name: 'UppyPro Inbox',
            description: 'Instagram inbox automation'
        });

        // Handle "Product Already Exists" (201001)
        if (inboxProduct.status !== 'success' && inboxProduct.errorDetails?.errorCode === '201001') {
            console.log('Inbox product already exists. Fetching existing products to find reference code...');
            const allProducts = await getAllProducts();
            console.log(`[DEBUG] Found ${allProducts.items?.length || 0} existing products.`);

            if (allProducts.status === 'success' && allProducts.items) {
                // Loose matching
                const existing = allProducts.items.find((p: any) => p.name?.includes('Inbox') || p.name === 'UppyPro Inbox');
                console.log(`[DEBUG] Matched Inbox Product:`, existing?.name);

                if (existing) {
                    inboxProduct = { status: 'success', referenceCode: existing.referenceCode };
                    results.push({ step: 'Create Inbox Product (Found Existing)', code: existing.referenceCode });
                }
            }
        }

        if (inboxProduct.status !== 'success' || !inboxProduct.referenceCode) {
            throw {
                message: `Failed to create Inbox product: ${inboxProduct.errorMessage || 'Missing Reference Code'}`,
                details: inboxProduct.errorDetails || inboxProduct.rawResult || inboxProduct
            };
        }

        if (!results.some((r: any) => r.step.includes('Found Existing') && r.step.includes('Inbox'))) {
            results.push({ step: 'Create Inbox Product', code: inboxProduct.referenceCode });
        }

        // Update Product in DB
        await supabase
            .from('products')
            .update({ iyzico_product_reference_code: inboxProduct.referenceCode })
            .eq('product_key', 'uppypro_inbox');

        // 1.1 Create Inbox Monthly Plan
        console.log('Creating Inbox Monthly Plan...');
        const inboxPlan = await createPricingPlan({
            productReferenceCode: inboxProduct.referenceCode!,
            name: 'UppyPro Inbox Monthly',
            price: 700.00, // Approx 20 USD
            currencyCode: 'TRY',
            paymentInterval: 'MONTHLY',
            paymentIntervalCount: 1,
            planPaymentType: 'RECURRING'
        });

        if (inboxPlan.status !== 'success' || !inboxPlan.referenceCode) {
            // If plan exists errors come up, we might need similar logic, but let's assume PLANS can be re-created
            throw {
                message: `Failed to create Inbox Plan: ${inboxPlan.errorMessage || 'Missing Reference Code'}`,
                details: inboxPlan.errorDetails || inboxPlan.rawResult || inboxPlan
            };
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
        let aiProduct = await createProduct({
            name: 'UppyPro AI',
            description: 'AI Customer Engagement'
        });

        // Handle "Product Already Exists" (201001)
        if (aiProduct.status !== 'success' && aiProduct.errorDetails?.errorCode === '201001') {
            console.log('AI product already exists. Fetching existing products to find reference code...');
            const allProducts = await getAllProducts();
            console.log(`[DEBUG] Found ${allProducts.items?.length || 0} existing products.`);

            if (allProducts.status === 'success' && allProducts.items) {
                // Loose matching
                const existing = allProducts.items.find((p: any) => p.name?.includes('AI') || p.name === 'UppyPro AI');
                console.log(`[DEBUG] Matched AI Product:`, existing?.name);

                if (existing) {
                    aiProduct = { status: 'success', referenceCode: existing.referenceCode };
                    results.push({ step: 'Create AI Product (Found Existing)', code: existing.referenceCode });
                }
            }
        }

        if (aiProduct.status !== 'success' || !aiProduct.referenceCode) {
            throw {
                message: `Failed to create AI product: ${aiProduct.errorMessage || 'Missing Reference Code'}`,
                details: aiProduct.errorDetails || aiProduct.rawResult || aiProduct
            };
        }

        if (!results.some((r: any) => r.step.includes('Found Existing') && r.step.includes('AI'))) {
            results.push({ step: 'Create AI Product', code: aiProduct.referenceCode });
        }

        // Update Product in DB
        await supabase
            .from('products')
            .update({ iyzico_product_reference_code: aiProduct.referenceCode })
            .eq('product_key', 'uppypro_ai');

        // 2.1 Create AI Monthly Plan
        console.log('Creating AI Monthly Plan...');
        const aiPlan = await createPricingPlan({
            productReferenceCode: aiProduct.referenceCode!,
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
                details: aiPlan.errorDetails || aiPlan.rawResult || aiPlan
            };
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
