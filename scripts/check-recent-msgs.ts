import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
    const { data, error } = await supabaseAdmin
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

    if (error) {
        console.error("DB Error:", error);
    } else {
        console.log("Recent Messages:", JSON.stringify(data, null, 2));
    }
}

check();
