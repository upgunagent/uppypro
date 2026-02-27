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

        const batch_id = crypto.randomUUID();

        // Insert one notification per tenant
        const notifications = tenants.map((t: any) => ({
            tenant_id: t.id,
            type: "SYSTEM_BROADCAST" as const,
            title,
            message,
            metadata: { from_admin: true, batch_id }
        }));

        const { error } = await admin
            .from("notifications")
            .insert(notifications);

        return { success: !error, error: error?.message, count: tenants.length };
    } else if (tenantId) {
        const batch_id = crypto.randomUUID();
        const { error } = await admin
            .from("notifications")
            .insert({
                tenant_id: tenantId,
                type: "SYSTEM_BROADCAST",
                title,
                message,
                metadata: { from_admin: true, batch_id }
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

// Fetch grouped notification reports for admin
export async function getAdminNotificationReports() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { reports: [], error: "Unauthorized" };

    const { data: member } = await supabase
        .from("tenant_members")
        .select("role")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

    if (member?.role !== "agency_admin") return { reports: [], error: "Admin only" };

    const admin = createAdminClient();

    // Get all system broadcasts
    const { data, error } = await admin
        .from("notifications")
        .select(`
            id,
            title,
            message,
            metadata,
            is_read,
            created_at,
            tenant_id,
            tenants (name)
        `)
        .eq("type", "SYSTEM_BROADCAST")
        .order("created_at", { ascending: false });

    if (error) return { reports: [], error: error.message };

    // Group by batch_id
    const grouped = new Map<string, any>();

    data?.forEach((notif) => {
        const batchId = notif.metadata?.batch_id || `${notif.title}_${new Date(notif.created_at).getTime()}`;

        if (!grouped.has(batchId)) {
            grouped.set(batchId, {
                batchId,
                title: notif.title,
                message: notif.message,
                created_at: notif.created_at,
                isBulk: false,
                targetCount: 0,
                readCount: 0,
                unreadCount: 0,
                tenantName: (notif.tenants as any)?.name || "Bilinmeyen İşletme",
                ids: []
            });
        }

        const group = grouped.get(batchId);
        group.targetCount++;
        if (notif.is_read) {
            group.readCount++;
        } else {
            group.unreadCount++;
        }
        group.ids.push(notif.id);

        if (group.targetCount > 1) {
            group.isBulk = true;
            group.tenantName = "Toplu Gönderim";
        }
    });

    return { reports: Array.from(grouped.values()), error: null };
}

// Delete notification reports by their underlying notification IDs
export async function deleteAdminNotificationReport(ids: string[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: member } = await supabase
        .from("tenant_members")
        .select("role")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

    if (member?.role !== "agency_admin") return { success: false, error: "Admin only" };

    if (!ids || ids.length === 0) return { success: false, error: "No IDs provided" };

    const admin = createAdminClient();
    const { error } = await admin
        .from("notifications")
        .delete()
        .in("id", ids);

    return { success: !error, error: error?.message };
}
