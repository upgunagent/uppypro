
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkConstraints() {
    // Query to get existing constraints on the pricing table
    const { data, error } = await supabase
        .rpc('get_table_info', { table_name: 'pricing' })
        // If RPC doesn't exist, we can try direct query if RLS allows, or just try to insert and catch error
        // For now, let's just inspect one row to see structure if constraints query is hard
        .select('*')
        .limit(1);

    // Actually, listing constraints usually requires admin access to pg_catalog which client might not have easily via standard SDK unless we use SQL editor.
    // Let's try to just select all rows and see if there are duplicates for product_key + billing_cycle manually?
    // No, better to just try adding the unique constraint if it's missing, OR adjust the INSERT to check manually.

    console.log("Checking for duplicates...");
    const { data: duplicates } = await supabase
        .from('pricing')
        .select('product_key, billing_cycle');

    console.log("Existing combinations:", duplicates);
}

checkConstraints();
