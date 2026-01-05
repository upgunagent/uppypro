
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Diagnosing...");
    // 1. Get User
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
        console.error("List users error:", userError.message);
        return;
    }

    const targetEmail = "otopkan@gmail.com";
    const user = users.find(u => u.email === targetEmail);

    if (!user) {
        console.log(`User ${targetEmail} NOT FOUND in Auth.`);
        return;
    }

    console.log(`User Found: ${user.id} (${user.email})`);

    // 2. Check Tenant Members
    const { data: members, error: memberError } = await supabase
        .from('tenant_members')
        .select('*')
        .eq('user_id', user.id);

    if (memberError) console.error("Member error:", memberError.message);
    console.log("Tenant Members:", members);

    // 3. Check Tenants
    if (members && members.length > 0) {
        for (const m of members) {
            const { data: tenant } = await supabase.from('tenants').select('*').eq('id', m.tenant_id).single();
            console.log(`Tenant for member ${m.id}:`, tenant);
        }
    } else {
        console.log("No tenant memberships found.");
    }
}

main();
