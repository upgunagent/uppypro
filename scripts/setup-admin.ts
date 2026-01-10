
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

async function setupAdminRole() {
    // Get user from email
    const adminEmail = "upgunagent@gmail.com"; // Replace with your admin email

    const { data: { users }, error: listError } = await admin.auth.admin.listUsers();

    if (listError) {
        console.error("Error listing users:", listError);
        return;
    }

    const user = users.find(u => u.email === adminEmail);

    if (!user) {
        console.log("Admin user not found. Please create one first.");
        return;
    }

    console.log(`Found user: ${user.email} (${user.id})`);

    // Get UPGUN AI tenant
    const { data: tenant, error: tenantError } = await admin
        .from('tenants')
        .select('id, name')
        .eq('name', 'UPGUN AI')
        .single();

    if (tenantError || !tenant) {
        console.error("UPGUN AI tenant not found. Creating...");

        const { data: newTenant, error: createError } = await admin
            .from('tenants')
            .insert({ name: 'UPGUN AI' })
            .select()
            .single();

        if (createError) {
            console.error("Error creating tenant:", createError);
            return;
        }

        console.log("Created UPGUN AI tenant:", newTenant.id);

        // Add admin role
        const { error: memberError } = await admin
            .from('tenant_members')
            .insert({
                tenant_id: newTenant.id,
                user_id: user.id,
                role: 'agency_admin'
            });

        if (memberError) {
            console.error("Error adding admin role:", memberError);
            return;
        }

        console.log("✅ Admin role added successfully!");
        return;
    }

    console.log(`Found UPGUN AI tenant: ${tenant.id}`);

    // Check if user already has admin role
    const { data: existingMember } = await admin
        .from('tenant_members')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('user_id', user.id)
        .maybeSingle();

    if (existingMember) {
        console.log(`User already has role: ${existingMember.role}`);

        if (existingMember.role !== 'agency_admin') {
            console.log("Updating role to agency_admin...");
            const { error: updateError } = await admin
                .from('tenant_members')
                .update({ role: 'agency_admin' })
                .eq('id', existingMember.id);

            if (updateError) {
                console.error("Error updating role:", updateError);
                return;
            }
            console.log("✅ Role updated to agency_admin!");
        } else {
            console.log("✅ User already has agency_admin role!");
        }
    } else {
        console.log("Adding agency_admin role...");
        const { error: memberError } = await admin
            .from('tenant_members')
            .insert({
                tenant_id: tenant.id,
                user_id: user.id,
                role: 'agency_admin'
            });

        if (memberError) {
            console.error("Error adding role:", memberError);
            return;
        }

        console.log("✅ agency_admin role added successfully!");
    }
}

setupAdminRole();
