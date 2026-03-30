"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getTenantEmployees(tenantId: string) {
    const supabase = await createClient();
    const { data: employees, error } = await supabase
        .from("tenant_employees")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("name", { ascending: true });

    if (error) {
        console.error("Error fetching employees:", error);
        return [];
    }

    return employees || [];
}

export async function addTenantEmployee(
    tenantId: string,
    name: string,
    title?: string,
    resourceType: string = "employee",
    attributes: Record<string, any> = {},
    extraInfo?: string
) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("tenant_employees")
        .insert({
            tenant_id: tenantId,
            name,
            title,
            resource_type: resourceType,
            attributes,
            extra_info: extraInfo || null,
        })
        .select()
        .single();

    if (error) {
        console.error("Error adding employee:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/panel/settings");
    revalidatePath("/panel/calendar");
    return { success: true, employee: data };
}

/** Toplu ekleme: aynı özelliklerle birden fazla kaynak ekler */
export async function addTenantEmployeesBatch(
    tenantId: string,
    names: string[],
    title: string | undefined,
    resourceType: string,
    attributes: Record<string, any>,
    extraInfo?: string
) {
    if (!names.length) return { success: false, error: "İsim listesi boş." };

    const supabase = await createClient();
    const rows = names.map((n) => ({
        tenant_id: tenantId,
        name: n.trim(),
        title,
        resource_type: resourceType,
        attributes,
        extra_info: extraInfo || null,
    }));

    const { data, error } = await supabase
        .from("tenant_employees")
        .insert(rows)
        .select();

    if (error) {
        console.error("Error batch adding:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/panel/settings");
    revalidatePath("/panel/calendar");
    return { success: true, employees: data };
}

export async function updateTenantEmployee(
    employeeId: string,
    name: string,
    title?: string,
    resourceType?: string,
    attributes?: Record<string, any>,
    extraInfo?: string
) {
    const supabase = await createClient();
    const payload: any = {
        name,
        title,
        updated_at: new Date().toISOString(),
    };
    if (resourceType !== undefined) payload.resource_type = resourceType;
    if (attributes !== undefined) payload.attributes = attributes;
    if (extraInfo !== undefined) payload.extra_info = extraInfo || null;

    const { data, error } = await supabase
        .from("tenant_employees")
        .update(payload)
        .eq("id", employeeId)
        .select()
        .single();

    if (error) {
        console.error("Error updating employee:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/panel/settings");
    revalidatePath("/panel/calendar");
    return { success: true, employee: data };
}

export async function deleteTenantEmployee(employeeId: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("tenant_employees")
        .delete()
        .eq("id", employeeId);

    if (error) {
        console.error("Error deleting employee:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/panel/settings");
    revalidatePath("/panel/calendar");
    return { success: true };
}

/** İşletmenin kaynak tipi tercihini günceller */
export async function updateResourceTypePreference(tenantId: string, resourceType: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("tenants")
        .update({ resource_type_preference: resourceType })
        .eq("id", tenantId);

    if (error) {
        console.error("Error updating preference:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/panel/settings");
    revalidatePath("/panel/calendar");
    return { success: true };
}
