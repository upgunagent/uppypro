"use server";

import { createClient } from "@/lib/supabase/server";

export type CustomerListRow = {
    full_name?: string;
    phone: string;
    [key: string]: any;
};

export type CustomerList = {
    id: string;
    tenant_id: string;
    name: string;
    description?: string;
    rows: CustomerListRow[];
    row_count: number;
    created_at: string;
    updated_at: string;
};

// Tüm kayıtlı listeleri getir
export async function getCustomerLists(tenantId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized", data: [] };

    const { data, error } = await supabase
        .from("customer_lists")
        .select("id, name, description, row_count, created_at, updated_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

    if (error) return { success: false, error: error.message, data: [] };
    return { success: true, data: data || [] };
}

// Tek liste detayını (rows dahil) getir
export async function getCustomerListById(tenantId: string, listId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized", data: null };

    const { data, error } = await supabase
        .from("customer_lists")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("id", listId)
        .single();

    if (error) return { success: false, error: error.message, data: null };
    return { success: true, data };
}

// Yeni liste kaydet (Excel verisinden)
export async function saveCustomerList(payload: {
    tenantId: string;
    name: string;
    description?: string;
    rows: CustomerListRow[];
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data, error } = await supabase
        .from("customer_lists")
        .insert({
            tenant_id: payload.tenantId,
            name: payload.name,
            description: payload.description || "",
            rows: payload.rows,
            row_count: payload.rows.length,
        })
        .select("id")
        .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
}

// Var olan listeyi güncelle
export async function updateCustomerList(payload: {
    tenantId: string;
    listId: string;
    name?: string;
    description?: string;
    rows?: CustomerListRow[];
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const updates: any = { updated_at: new Date().toISOString() };
    if (payload.name !== undefined) updates.name = payload.name;
    if (payload.description !== undefined) updates.description = payload.description;
    if (payload.rows !== undefined) {
        updates.rows = payload.rows;
        updates.row_count = payload.rows.length;
    }

    const { error } = await supabase
        .from("customer_lists")
        .update(updates)
        .eq("tenant_id", payload.tenantId)
        .eq("id", payload.listId);

    if (error) return { success: false, error: error.message };
    return { success: true };
}

// Listeyi sil
export async function deleteCustomerList(tenantId: string, listId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { error } = await supabase
        .from("customer_lists")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("id", listId);

    if (error) return { success: false, error: error.message };
    return { success: true };
}
