
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

async function fixPrice() {
    const { error } = await supabase
        .from('pricing')
        .update({ monthly_price_try: 895 }) // Fixing to 895 TL
        .eq('product_key', 'uppypro_inbox');

    if (error) {
        console.error("Error updating price:", error);
    } else {
        console.log("Updated uppypro_inbox price to 895 TL");
    }
}

fixPrice();
