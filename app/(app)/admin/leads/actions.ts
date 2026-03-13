"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

// Save discovered leads to database with list support
export async function saveDiscoveredLeads(leads: any[], listName?: string, listMeta?: { sectorId?: string; sectorName?: string; city?: string; district?: string }) {
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

    const adminDb = createAdminClient();
    let savedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];
    let listId: string | null = null;

    // Create a list if name is provided
    if (listName) {
        const { data: newList, error: listError } = await adminDb
            .from("lead_lists")
            .insert({
                name: listName,
                sector_id: listMeta?.sectorId || null,
                sector_name: listMeta?.sectorName || null,
                city: listMeta?.city || null,
                district: listMeta?.district || null,
                lead_count: 0,
                created_by: user.id
            })
            .select("id")
            .single();

        if (listError) return { error: `Liste oluşturulamadı: ${listError.message}` };
        listId = newList.id;
    }

    for (const lead of leads) {
        // Check if already exists
        if (lead.google_place_id) {
            const { data: existing } = await adminDb
                .from("leads")
                .select("id")
                .eq("google_place_id", lead.google_place_id)
                .maybeSingle();

            if (existing) {
                // If exists but we have a list, add to list
                if (listId) {
                    await adminDb.from("leads").update({ list_id: listId }).eq("id", existing.id);
                }
                skippedCount++;
                continue;
            }
        }

        const { error } = await adminDb.from("leads").insert({
            business_name: lead.business_name,
            sector_id: lead.sector_id || null,
            sector_name: lead.sector_name || null,
            city: lead.city || null,
            district: lead.district || null,
            address: lead.address || null,
            lat: lead.lat || null,
            lng: lead.lng || null,
            phone: lead.phone || null,
            email: lead.email || null,
            email_missing: !lead.email,
            website: lead.website || null,
            google_place_id: lead.google_place_id || null,
            google_rating: lead.google_rating || null,
            google_review_count: lead.google_review_count || null,
            google_business_status: lead.google_business_status || null,
            working_hours: lead.working_hours || null,
            list_id: listId,
            source: "google_places",
            status: "new",
            created_by: user.id
        });

        if (error) {
            errors.push(`${lead.business_name}: ${error.message}`);
        } else {
            savedCount++;

            await adminDb.from("lead_audit_logs").insert({
                action: "create",
                entity_type: "lead",
                details: { business_name: lead.business_name, source: "google_places", list_id: listId },
                performed_by: user.id
            });
        }
    }

    // Update list lead count
    if (listId) {
        await adminDb.from("lead_lists").update({ lead_count: savedCount + skippedCount }).eq("id", listId);
    }

    revalidatePath("/admin/leads");
    return { success: true, savedCount, skippedCount, errors, listId };
}

// Update lead email manually
export async function updateLeadEmail(leadId: string, email: string) {
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

    const adminDb = createAdminClient();
    const { error } = await adminDb
        .from("leads")
        .update({
            email,
            email_missing: !email,
            updated_at: new Date().toISOString()
        })
        .eq("id", leadId);

    if (error) return { error: error.message };

    revalidatePath("/admin/leads");
    revalidatePath(`/admin/leads/${leadId}`);
    return { success: true };
}

// Update lead status
export async function updateLeadStatus(leadId: string, newStatus: string, note?: string) {
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

    const adminDb = createAdminClient();

    // Get current status
    const { data: lead } = await adminDb
        .from("leads")
        .select("status")
        .eq("id", leadId)
        .single();

    if (!lead) return { error: "Lead bulunamadı" };

    // Update status
    const { error } = await adminDb
        .from("leads")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", leadId);

    if (error) return { error: error.message };

    // Log status change
    await adminDb.from("lead_status_history").insert({
        lead_id: leadId,
        old_status: lead.status,
        new_status: newStatus,
        changed_by: user.id,
        note: note || null
    });

    // Audit log
    await adminDb.from("lead_audit_logs").insert({
        action: "update",
        entity_type: "lead",
        entity_id: leadId,
        details: { old_status: lead.status, new_status: newStatus },
        performed_by: user.id
    });

    revalidatePath("/admin/leads");
    revalidatePath(`/admin/leads/${leadId}`);
    return { success: true };
}

// Delete lead
export async function deleteLead(leadId: string) {
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

    const adminDb = createAdminClient();
    const { error } = await adminDb.from("leads").delete().eq("id", leadId);

    if (error) return { error: error.message };

    revalidatePath("/admin/leads");
    return { success: true };
}

// Update lead notes/tags
export async function updateLeadDetails(leadId: string, data: { notes?: string; tags?: string[]; email?: string }) {
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

    const adminDb = createAdminClient();
    const updateData: any = { updated_at: new Date().toISOString() };

    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.email !== undefined) {
        updateData.email = data.email;
        updateData.email_missing = !data.email;
    }

    const { error } = await adminDb.from("leads").update(updateData).eq("id", leadId);

    if (error) return { error: error.message };

    revalidatePath("/admin/leads");
    revalidatePath(`/admin/leads/${leadId}`);
    return { success: true };
}

// ============ LIST MANAGEMENT ============

// Delete a lead list (optionally delete leads too)
export async function deleteLeadList(listId: string, deleteLeads: boolean = false) {
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

    const adminDb = createAdminClient();

    if (deleteLeads) {
        // Delete all leads in this list
        await adminDb.from("leads").delete().eq("list_id", listId);
    } else {
        // Remove list_id from leads (keep leads)
        await adminDb.from("leads").update({ list_id: null }).eq("list_id", listId);
    }

    // Delete the list
    const { error } = await adminDb.from("lead_lists").delete().eq("id", listId);
    if (error) return { error: error.message };

    revalidatePath("/admin/leads");
    return { success: true };
}

// Rename a lead list
export async function renameLeadList(listId: string, newName: string) {
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

    const adminDb = createAdminClient();
    const { error } = await adminDb
        .from("lead_lists")
        .update({ name: newName, updated_at: new Date().toISOString() })
        .eq("id", listId);

    if (error) return { error: error.message };

    revalidatePath("/admin/leads");
    return { success: true };
}
