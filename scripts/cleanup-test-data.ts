
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

async function cleanupTestData() {
    console.log("Cleaning up test data...\n");

    // 1. Get all tenants except the main one (UPGUN AI)
    const { data: tenants, error: tenantsError } = await admin
        .from('tenants')
        .select('id, name, created_at')
        .neq('name', 'UPGUN AI')
        .order('created_at', { ascending: false });

    if (tenantsError) {
        console.error("Error fetching tenants:", tenantsError);
        return;
    }

    if (!tenants || tenants.length === 0) {
        console.log("No test tenants found.");
        return;
    }

    console.log(`Found ${tenants.length} test tenant(s):\n`);
    tenants.forEach((t, i) => {
        console.log(`${i + 1}. ${t.name} (${t.id}) - Created: ${new Date(t.created_at).toLocaleString()}`);
    });

    console.log("\nDeleting test tenants...");

    // 2. Delete tenants (cascades to subscriptions, billing_info, etc.)
    const tenantIds = tenants.map(t => t.id);
    const { error: deleteError } = await admin
        .from('tenants')
        .delete()
        .in('id', tenantIds);

    if (deleteError) {
        console.error("Error deleting tenants:", deleteError);
        return;
    }

    console.log(`✅ Successfully deleted ${tenants.length} tenant(s)`);

    // 3. Find and delete orphaned users (users without tenant_members)
    console.log("\nChecking for orphaned users...");

    const { data: { users }, error: usersError } = await admin.auth.admin.listUsers();

    if (usersError) {
        console.error("Error listing users:", usersError);
        return;
    }

    let deletedUsers = 0;
    for (const user of users) {
        // Skip if email contains 'admin' or specific production emails
        if (user.email?.includes('admin') || user.email?.includes('production')) {
            continue;
        }

        // Check if user has any tenant membership
        const { data: membership } = await admin
            .from('tenant_members')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

        if (!membership) {
            console.log(`Deleting orphaned user: ${user.email} (${user.id})`);
            await admin.auth.admin.deleteUser(user.id);
            deletedUsers++;
        }
    }

    console.log(`\n✅ Deleted ${deletedUsers} orphaned user(s)`);
    console.log("\n✨ Cleanup complete!");
}

cleanupTestData();
