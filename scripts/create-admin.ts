
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

async function createAdmin() {
    const adminEmail = "upgunagent@gmail.com";
    const adminPassword = "UpgunAdmin2026!"; // Change this to a secure password

    console.log("Creating admin user...");

    // 1. Create admin user
    const { data: userData, error: userError } = await admin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: { full_name: 'UPGUN Admin' }
    });

    if (userError) {
        console.error("Error creating user:", userError);
        return;
    }

    console.log(`✅ Admin user created: ${userData.user.id}`);

    // 2. Create profile
    await admin.from("profiles").upsert({
        user_id: userData.user.id,
        full_name: 'UPGUN Admin'
    });

    console.log("✅ Profile created");

    // 3. Get or create UPGUN AI tenant
    let { data: tenant, error: tenantError } = await admin
        .from('tenants')
        .select('id')
        .eq('name', 'UPGUN AI')
        .maybeSingle();

    if (!tenant) {
        console.log("Creating UPGUN AI tenant...");
        const { data: newTenant, error: createError } = await admin
            .from('tenants')
            .insert({ name: 'UPGUN AI' })
            .select()
            .single();

        if (createError) {
            console.error("Error creating tenant:", createError);
            return;
        }

        tenant = newTenant;
        console.log("✅ UPGUN AI tenant created");
    } else {
        console.log("✅ UPGUN AI tenant found");
    }

    if (!tenant) {
        throw new Error("Failed to get or create tenant");
    }

    // 4. Add agency_admin role
    const { error: memberError } = await admin
        .from('tenant_members')
        .insert({
            tenant_id: tenant.id,
            user_id: userData.user.id,
            role: 'agency_admin'
        });

    if (memberError) {
        console.error("Error adding role:", memberError);
        return;
    }

    console.log("✅ agency_admin role assigned");
    console.log("\n🎉 Setup complete!");
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
}

createAdmin();
