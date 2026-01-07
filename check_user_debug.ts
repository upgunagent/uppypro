
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUser() {
    const email = 'upgunagent@gmail.com';
    console.log(`Checking for user: ${email}`);

    // List users (filtering might not be directly available in listUsers depending on version, but we can try)
    // Actually listUsers returns pages. Safe way is to construct a query? 
    // Admin API limit is usually high enough or we can search.
    // In newer library versions `listUsers` doesn't filter by email directly nicely unless specific params.
    // Let's just try getting by email if possible? No `getUserByEmail` in admin api usually, it's `listUsers`.

    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error("Error listing users:", error);
        return;
    }

    const startEmail = 'ugunagent@gmail.com'; // The typo one
    const targetEmail = 'upgunagent@gmail.com'; // The new one

    const foundOld = data.users.find(u => u.email === startEmail);
    const foundNew = data.users.find(u => u.email === targetEmail);

    if (foundOld) console.log(`FOUND TYPO USER: ${startEmail} -> ID: ${foundOld.id}`);
    else console.log(`Did not find typo user: ${startEmail}`);

    if (foundNew) console.log(`FOUND TARGET USER: ${targetEmail} -> ID: ${foundNew.id}`);
    else console.log(`Did not find target user: ${targetEmail}`);
}

checkUser();
