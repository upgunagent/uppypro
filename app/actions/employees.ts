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

export async function addTenantEmployee(tenantId: string, name: string, title?: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("tenant_employees")
        .insert({ tenant_id: tenantId, name, title })
        .select()
        .single();

    if (error) {
        console.error("Error adding employee:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/panel/settings");
    return { success: true, employee: data };
}

export async function updateTenantEmployee(employeeId: string, name: string, title?: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("tenant_employees")
        .update({ name, title, updated_at: new Date().toISOString() })
        .eq("id", employeeId)
        .select()
        .single();

    if (error) {
        console.error("Error updating employee:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/panel/settings");
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
    return { success: true };
}
