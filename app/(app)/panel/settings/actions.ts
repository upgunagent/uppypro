'use server';

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function updateAiSettings(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "User not found" };

    const { data: member } = await supabase
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", user.id)
        .single();

    if (!member) return { error: "Tenant not found" };

    // Check permissions
    const { data: memberData } = await supabase
        .from("tenant_members")
        .select("role")
        .eq("tenant_id", member.tenant_id)
        .eq("user_id", user.id)
        .single();

    if (!memberData || !['tenant_owner', 'agency_admin', 'tenant_agent'].includes(memberData.role)) {
        // Agents might need to update this too? usually owners. Let's start with owners/admins.
        if (memberData?.role !== 'tenant_owner' && memberData?.role !== 'agency_admin') {
            return { error: "Bu işlemi yapmaya yetkiniz yok." };
        }
    }

    const systemMessage = formData.get("systemMessage") as string;

    const adminDb = createAdminClient();

    // Update agent settings - ONLY system message
    const { error } = await adminDb.from("agent_settings").upsert({
        tenant_id: member.tenant_id,
        system_message: systemMessage,
    }, { onConflict: 'tenant_id' });

    if (error) {
        console.error("Error updating agent settings:", error);
        return { error: "Failed to update AI settings" };
    }

    // Mock Email Trigger to Super Admin
    console.log(`[EMAIL TRIGGER] To: superadmin@example.com, Subject: New AI System Message for Tenant ${member.tenant_id}`);
    console.log(`Body: ${systemMessage}`);

    revalidatePath("/panel/settings");
    return { success: true };
}

export async function updateBillingInfo(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.error("updateBillingInfo: User not found");
        return { error: "User not found" };
    }

    const { data: member, error: memberError } = await supabase
        .from("tenant_members")
        .select("tenant_id, role")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

    if (memberError || !member) {
        console.error("updateBillingInfo: Tenant not found or error", memberError);
        return { error: "Tenant not found" };
    }

    console.log("updateBillingInfo: Found tenant", member.tenant_id, "Role:", member.role);

    // Check permissions
    if (!['tenant_owner', 'agency_admin'].includes(member.role)) {
        return { error: "Bu işlemi yapmaya yetkiniz yok." };
    }

    const billingType = formData.get("billingType") as "company" | "individual";

    const data: any = {
        tenant_id: member.tenant_id,
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
        // Clear individual fields if switching types
        data.tckn = null;
    } else {
        data.full_name = formData.get("fullName");
        data.tckn = formData.get("tckn");
        // Clear company fields
        data.company_name = null;
        data.tax_office = null;
        data.tax_number = null;
    }

    console.log("updateBillingInfo: Upserting data", data);

    // Use Admin Client to bypass RLS issues
    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin.from("billing_info").upsert(data, { onConflict: 'tenant_id' });

    if (error) {
        console.error("Error updating billing info:", error);
        return { error: "Failed to update billing info: " + error.message };
    }

    console.log("updateBillingInfo: Success");

    revalidatePath("/panel/settings");
    revalidatePath(`/admin/tenants/${member.tenant_id}`); // Revalidate admin path too

    return { success: true };
}

export async function addPaymentMethod(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "User not found" };

    const { data: member } = await supabase
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", user.id)
        .single();

    if (!member) return { error: "Tenant not found" };

    const cardHolder = formData.get("cardHolder");
    const cardNumber = formData.get("cardNumber") as string;

    // MOCK: Adding a card (In reality, this would go to Iyzico/Stripe and get a token)
    // We just simulate saving a masked card
    const lastFour = cardNumber.slice(-4);

    const { error } = await supabase.from("payment_methods").insert({
        tenant_id: member.tenant_id,
        provider: 'mock_provider',
        card_alias: 'card_mock_token_' + Math.random().toString(36).substring(7),
        last_four: lastFour,
        card_family: 'MasterCard',
        card_association: 'Bonus',
        is_default: true // Making it default for now
    });

    if (error) {
        console.error("Error adding payment method:", error);
        return { error: "Failed to add payment method" };
    }

    revalidatePath("/panel/settings");
    return { success: true };
}

export async function deletePaymentMethod(id: string) {
    const supabase = await createClient();
    // Auth check implied in RLS but good to have context
    const { error } = await supabase.from("payment_methods").delete().eq("id", id);
    if (error) return { error: "Failed" };
    revalidatePath("/panel/settings");
    return { success: true };
}
