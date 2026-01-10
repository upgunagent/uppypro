"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function updateSubscription(formData: FormData) {
    const supabase = await createClient();

    // Check Super Admin Role (simplistic check for MVP)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: membership } = await supabase
        .from("tenant_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "agency_admin")
        .maybeSingle();

    if (!membership) {
        return { error: "Unauthorized: Super Admin access required." };
    }

    const tenantId = formData.get("tenantId") as string;
    const planType = formData.get("planType") as string; // 'inbox', 'ai', 'enterprise'
    const customPriceRaw = formData.get("customPrice") as string; // '2499' (TL) -> need to convert to Kurus

    if (!tenantId || !planType) {
        return { error: "Missing required fields." };
    }

    // Determine Product Keys based on selection
    let aiProductKey = null;
    let baseProductKey = 'uppypro_inbox'; // Always base
    let customPrice = null;

    if (planType === 'ai') {
        aiProductKey = 'uppypro_ai';
    } else if (planType === 'enterprise') {
        aiProductKey = 'uppypro_enterprise';
        if (customPriceRaw) {
            // Convert TL to Kurus
            customPrice = Math.round(parseFloat(customPriceRaw) * 100);
        }
    }

    // Update Subscription
    // We assume an active subscription exists or needs to be created. 
    // Ideally we blindly upsert/update the active one.

    const adminDb = createAdminClient();

    // First, find existing subscription
    const { data: sub } = await adminDb
        .from("subscriptions")
        .select("id")
        .eq("tenant_id", tenantId)
        .maybeSingle();

    if (sub) {
        const { error } = await adminDb
            .from("subscriptions")
            .update({
                base_product_key: baseProductKey,
                ai_product_key: aiProductKey,
                custom_price_try: customPrice,
                updated_at: new Date().toISOString()
            })
            .eq("id", sub.id);

        if (error) return { error: error.message };
    } else {
        // Create new active subscription if missing
        const { error } = await adminDb
            .from("subscriptions")
            .insert({
                tenant_id: tenantId,
                status: 'active',
                base_product_key: baseProductKey,
                ai_product_key: aiProductKey,
                custom_price_try: customPrice,
                billing_cycle: 'monthly',
                started_at: new Date().toISOString(),
                current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // +30 days
            });

        if (error) return { error: error.message };
    }

    revalidatePath(`/admin/tenants/${tenantId}`);
    revalidatePath(`/panel/settings`); // Update user view too

    return { success: true };
}

export async function updateTenantAiSettings(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: membership } = await supabase
        .from("tenant_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "agency_admin")
        .maybeSingle();

    if (!membership) return { error: "Unauthorized" };

    const tenantId = formData.get("tenantId") as string;
    const systemMessage = formData.get("systemMessage") as string;
    const n8nWebhookUrl = formData.get("n8nWebhookUrl") as string;
    const aiEnabled = formData.get("aiEnabled") === "on";

    const adminDb = createAdminClient();

    const { error } = await adminDb.from("agent_settings").upsert({
        tenant_id: tenantId,
        system_message: systemMessage,
        n8n_webhook_url: n8nWebhookUrl,
        ai_operational_enabled: aiEnabled
    }, { onConflict: 'tenant_id' });

    if (error) {
        console.error("Error updating admin agent settings:", error);
        return { error: "Failed to update AI settings" };
    }

    revalidatePath(`/admin/tenants/${tenantId}`);
    return { success: true };
}

export async function updateTenantBillingInfo(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: membership } = await supabase
        .from("tenant_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "agency_admin")
        .maybeSingle();

    if (!membership) return { error: "Unauthorized" };

    const tenantId = formData.get("tenantId") as string;
    const billingType = formData.get("billingType") as "company" | "individual";

    const data: any = {
        tenant_id: tenantId,
        billing_type: billingType,
        contact_email: formData.get("contactEmail"),
        contact_phone: formData.get("contactPhone"),
        address_city: formData.get("city"),
        address_district: formData.get("district"),
        address_full: formData.get("addressFull"),
    };

    if (billingType === 'company') {
        data.company_name = formData.get("companyName");
        data.tax_office = formData.get("taxOffice");
        data.tax_number = formData.get("taxNumber");
        data.full_name = formData.get("authorizedPerson");
    } else {
        data.full_name = formData.get("fullName");
        data.tckn = formData.get("tckn");
    }

    const adminDb = createAdminClient();

    const { error } = await adminDb.from("billing_info").upsert(data, { onConflict: 'tenant_id' });

    if (error) {
        console.error("Error updating admin billing info:", error);
        return { error: "Failed to update billing info" };
    }

    revalidatePath(`/admin/tenants/${tenantId}`);
    return { success: true };
}
