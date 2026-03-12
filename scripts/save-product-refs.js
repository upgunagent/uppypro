require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const PRODUCT_REFS = [
    { key: 'uppypro_inbox', ref: '25abfcd4-77dd-4eae-8d91-677e289e35f1' },
    { key: 'uppypro_ai', ref: '9e770206-ce9d-4548-b354-ab6a42516e77' },
    { key: 'uppypro_corporate_small', ref: '8035b4ef-7c26-4487-8e95-9d0e4936f27b' },
    { key: 'uppypro_corporate_medium', ref: 'd127e03d-28f9-4f76-87ef-e63cec2cbc15' },
    { key: 'uppypro_corporate_large', ref: '3a1123b0-ce1b-446c-b582-f3ef3c773afc' },
    { key: 'uppypro_corporate_xl', ref: '37dfac29-3b86-4cc6-b83b-ba6b1ad29717' }
];

async function main() {
    console.log("=== Saving Product Ref Codes to 'products' table ===");
    
    // First check what exists
    const { data: existing, error: fetchErr } = await supabase
        .from('products')
        .select('key, iyzico_product_reference_code');
    
    if (fetchErr) {
        console.error("Error fetching products:", fetchErr.message);
    } else {
        console.log("Existing products:", existing?.length || 0);
        existing?.forEach(p => console.log(`  ${p.key}: ${p.iyzico_product_reference_code || 'EMPTY'}`));
    }
    
    for (const item of PRODUCT_REFS) {
        const { error } = await supabase
            .from('products')
            .update({ iyzico_product_reference_code: item.ref })
            .eq('key', item.key);
        
        if (error) {
            console.log(`${item.key}: UPDATE FAILED (${error.message}), trying upsert...`);
        } else {
            console.log(`${item.key}: OK`);
        }
    }
    
    // Verify
    const { data: final } = await supabase
        .from('products')
        .select('key, iyzico_product_reference_code')
        .in('key', PRODUCT_REFS.map(p => p.key));
    
    console.log("\n=== Final State ===");
    final?.forEach(p => console.log(`  ${p.key}: ${p.iyzico_product_reference_code || 'STILL EMPTY!'}`));
    
    console.log("\nDone!");
    process.exit(0);
}

main();
