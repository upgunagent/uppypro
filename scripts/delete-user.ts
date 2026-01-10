
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase URL or Service Key");
    process.exit(1);
}

const admin = createClient(supabaseUrl, supabaseServiceKey);

async function deleteUser(email: string) {
    console.log(`Deleting user: ${email}`);

    // 1. Find User ID
    const { data: { users }, error: listError } = await admin.auth.admin.listUsers();

    if (listError) {
        console.error("List Error:", listError);
        return;
    }

    const user = users.find(u => u.email === email);

    if (!user) {
        console.log("User not found.");
        return;
    }

    const userId = user.id;

    // 1.5 Find and Delete Owned Tenants (Cascades to Subscriptions)
    console.log("Checking for owned tenants...");
    const { data: ownedTenants, error: memberError } = await admin
        .from('tenant_members')
        .select('tenant_id')
        .eq('user_id', userId)
        .eq('role', 'tenant_owner');

    if (memberError) {
        console.error("Error fetching members:", memberError);
    } else if (ownedTenants && ownedTenants.length > 0) {
        const tenantIds = ownedTenants.map(t => t.tenant_id);
        console.log(`Found ${tenantIds.length} owned tenant(s). Deleting...`);

        const { error: tenantDeleteError } = await admin
            .from('tenants')
            .delete()
            .in('id', tenantIds);

        if (tenantDeleteError) {
            console.error("Error deleting tenants:", tenantDeleteError);
        } else {
            console.log("Successfully deleted owned tenants.");
        }
    } else {
        console.log("No owned tenants found.");
    }

    // 2. Delete User
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

    if (deleteError) {
        console.error("Delete Error:", deleteError);
    } else {
        console.log("Successfully deleted user:", user.id);
    }
}

deleteUser("ottomanebay@gmail.com");
