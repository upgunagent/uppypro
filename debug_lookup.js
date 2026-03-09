// Let's create another debug script to prove why "Lookup test for 1796189024433209: null" happened.

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function checkWhyLookupFailed() {
    console.log("Checking DB directly for any conversation where external_thread_id is 1796189024433209");
    const { data, error } = await supabaseAdmin.from('conversations')
        .select('*')
        .eq('external_thread_id', '1796189024433209');

    console.log(data);

    // Check if it's stored as an exact match or something else
    const { data: allConvs } = await supabaseAdmin.from('conversations')
        .select('external_thread_id, channel');

    console.log("\nSample threads:");
    console.log(allConvs.slice(0, 5));

    // Is RLS blocking me? Wait, I'm using supabaseAdmin.
}

checkWhyLookupFailed();
