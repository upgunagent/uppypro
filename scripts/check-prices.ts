
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

async function checkPrices() {
    const { data, error } = await supabase
        .from('pricing')
        .select('*')
        .in('product_key', ['uppypro_inbox', 'uppypro_ai'])
        .eq('billing_cycle', 'monthly');

    if (error) {
        console.error(error);
    } else {
        console.log("Current Prices:", data);
    }
}

checkPrices();
