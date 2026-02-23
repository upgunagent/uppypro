"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getTenantLocations(tenantId: string) {
    const supabase = await createClient();
    const { data: locations, error } = await supabase
        .from("tenant_locations")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching locations:", error);
        return [];
    }
    return locations;
}

export async function addTenantLocation(tenantId: string, locationData: { title: string, address: string, latitude: string, longitude: string, url: string }) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("tenant_locations")
        .insert({
            tenant_id: tenantId,
            title: locationData.title,
            address: locationData.address,
            latitude: locationData.latitude ? parseFloat(locationData.latitude) : null,
            longitude: locationData.longitude ? parseFloat(locationData.longitude) : null,
            url: locationData.url || null
        })
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }

    revalidatePath("/panel/settings");
    return data;
}

export async function deleteTenantLocation(locationId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("tenant_locations")
        .delete()
        .eq("id", locationId);

    if (error) {
        throw new Error(error.message);
    }

    revalidatePath("/panel/settings");
    return true;
}
