require('ts-node/register');
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function main() {
    console.log("Checking tenants...");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const adminDb = createClient(supabaseUrl, supabaseKey);

    const { data: tenants } = await adminDb
        .from("tenants")
        .select(`id, name, owner_email`)
        .eq('id', 'd2e4fc40-15ca-480d-9b22-7709655d4860');

    console.log(JSON.stringify(tenants, null, 2));
}

main().catch(console.error);
