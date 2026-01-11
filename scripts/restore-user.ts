
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

async function restoreUser() {
    const email = "otopkan@gmail.com";
    const password = "UppyPro2026!"; // Temporary password
    const fullName = "Özgür Topkan";
    const tenantName = "Özgür Topkan (Individual)"; // Creating as individual business

    console.log(`Restoring user: ${email} with name: ${fullName}...`);

    // 1. Create User
    const { data: userData, error: userError } = await admin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
    });

    if (userError) {
        console.error("Error creating user:", userError);
        return;
    }

    const userId = userData.user.id;
    console.log(`✅ User created: ${userId}`);

    // 2. Create Profile (if trigger didn't catch it or just to be safe/update)
    const { error: profileError } = await admin
        .from("profiles")
        .upsert({
            user_id: userId,
            full_name: fullName,
            // phone: "0555..." // Optional: add if known
        });

    if (profileError) {
        console.error("Error creating profile:", profileError);
    } else {
        console.log("✅ Profile created/updated");
    }

    // 3. Create Tenant
    const { data: tenant, error: tenantError } = await admin
        .from('tenants')
        .insert({ name: tenantName })
        .select()
        .single();

    if (tenantError) {
        console.error("Error creating tenant:", tenantError);
        return;
    }

    console.log(`✅ Tenant created: ${tenant.name} (${tenant.id})`);

    // 4. Link User to Tenant (Owner)
    const { error: memberError } = await admin
        .from('tenant_members')
        .insert({
            tenant_id: tenant.id,
            user_id: userId,
            role: 'tenant_owner'
        });

    if (memberError) {
        console.error("Error linking member:", memberError);
        return;
    }

    console.log("✅ User linked as tenant_owner");

    // 5. Create Subscription (Free/Trial or Base)
    // Assuming 'uppypro_inbox' is the base plan
    const { error: subError } = await admin
        .from('subscriptions')
        .insert({
            tenant_id: tenant.id,
            status: 'active',
            base_product_key: 'uppypro_inbox'
        });

    if (subError) {
        console.error("Error creating subscription:", subError);
    } else {
        console.log("✅ Subscription created (uppypro_inbox)");
    }

    // 6. Create Billing Info (Individual)
    const { error: billingError } = await admin
        .from('billing_info')
        .upsert({
            tenant_id: tenant.id,
            billing_type: 'individual',
            full_name: fullName,
            contact_email: email
        });

    if (billingError) {
        console.error("Error creating billing info:", billingError);
    } else {
        console.log("✅ Billing info created");
    }

    console.log("\n🎉 Restoration complete!");
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log("User can now login.");
}

restoreUser();
