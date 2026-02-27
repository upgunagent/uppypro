"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Admin: Get all tenants (bypasses RLS)
export async function getAllTenants() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { tenants: [], error: "Unauthorized" };

    const { data: member } = await supabase
        .from("tenant_members")
        .select("role")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

    if (member?.role !== "agency_admin") {
        return { tenants: [], error: "Admin only" };
    }

    const admin = createAdminClient();
    const { data, error } = await admin
        .from("tenants")
        .select("id, name")
        .neq("name", "UPGUN AI")
        .order("name", { ascending: true });

    return { tenants: data || [], error: error?.message };
}

// Fetch notifications for the current user's tenant
export async function getNotifications() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { notifications: [], error: "Unauthorized" };

    const { data: member } = await supabase
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

    if (!member) return { notifications: [], error: "No tenant" };

    const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .or(`tenant_id.eq.${member.tenant_id},tenant_id.is.null`)
        .order("created_at", { ascending: false })
        .limit(50);

    return { notifications: data || [], error: error?.message };
}

// Mark a notification as read
export async function markNotificationRead(notificationId: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

    return { success: !error, error: error?.message };
}

// Mark all notifications as read
export async function markAllNotificationsRead() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: member } = await supabase
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

    if (!member) return { success: false, error: "No tenant" };

    const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .or(`tenant_id.eq.${member.tenant_id},tenant_id.is.null`)
        .eq("is_read", false);

    return { success: !error, error: error?.message };
}

// Admin: Send notification to specific tenant or all tenants
export async function sendAdminNotification({
    tenantId,
    title,
    message,
    sendToAll
}: {
    tenantId?: string;
    title: string;
    message: string;
    sendToAll: boolean;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    // Verify admin role
    const { data: member } = await supabase
        .from("tenant_members")
        .select("role")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

    if (member?.role !== "agency_admin") {
        return { success: false, error: "Unauthorized - Admin only" };
    }

    const admin = createAdminClient();

    if (sendToAll) {
        // Get all tenants
        const { data: tenants } = await admin
            .from("tenants")
            .select("id");

        if (!tenants || tenants.length === 0) {
            return { success: false, error: "No tenants found" };
        }

        // Insert one notification per tenant
        const notifications = tenants.map((t: any) => ({
            tenant_id: t.id,
            type: "SYSTEM_BROADCAST" as const,
            title,
            message,
            metadata: { from_admin: true }
        }));

        const { error } = await admin
            .from("notifications")
            .insert(notifications);

        return { success: !error, error: error?.message, count: tenants.length };
    } else if (tenantId) {
        const { error } = await admin
            .from("notifications")
            .insert({
                tenant_id: tenantId,
                type: "SYSTEM_BROADCAST",
                title,
                message,
                metadata: { from_admin: true }
            });

        return { success: !error, error: error?.message };
    }

    return { success: false, error: "tenantId or sendToAll required" };
}

// Delete a specific notification
export async function deleteNotification(notificationId: string) {
    const supabase = await createClient();

    // Check ownership by tenant
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: member } = await supabase
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

    if (!member) return { success: false, error: "No tenant" };

    const admin = createAdminClient();
    const { error } = await admin
        .from("notifications")
        .delete()
        .eq("id", notificationId)
        .eq("tenant_id", member.tenant_id);

    return { success: !error, error: error?.message };
}

// Delete all notifications for the tenant
export async function deleteAllNotifications() {
    const supabase = await createClient();

    // Check ownership by tenant
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: member } = await supabase
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

    if (!member) return { success: false, error: "No tenant" };

    const admin = createAdminClient();
    const { error } = await admin
        .from("notifications")
        .delete()
        .eq("tenant_id", member.tenant_id);

    return { success: !error, error: error?.message };
}
