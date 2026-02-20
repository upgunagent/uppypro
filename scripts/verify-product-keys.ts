
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

async function checkKeys() {
    const { data, error } = await supabase
        .from('pricing')
        .select('product_key, monthly_price_try')
        .ilike('product_key', '%inbox%') // Search for any key related to 'inbox'
        .eq('billing_cycle', 'monthly');

    if (error) {
        console.error(error);
    } else {
        console.log("Found Inbox Keys:", data);
    }
}

checkKeys();
