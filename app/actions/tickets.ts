"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function createTicket(tenantId: string, subject: string, category: string, description: string, attachmentUrl: string | null) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Yetkisiz erişim" };
    }

    const { data: ticket, error: ticketError } = await supabase
        .from("support_tickets")
        .insert({
            tenant_id: tenantId,
            user_id: user.id,
            subject,
            category,
            status: "open",
            has_unread_user_message: true, // admin will see a notification
            has_unread_admin_message: false
        })
        .select()
        .single();

    if (ticketError) {
        return { success: false, error: ticketError.message };
    }

    const { error: msgError } = await supabase
        .from("ticket_messages")
        .insert({
            ticket_id: ticket.id,
            sender_id: user.id,
            sender_type: "user",
            message: description,
            attachment_url: attachmentUrl
        });

    if (msgError) {
        return { success: false, error: msgError.message };
    }

    return { success: true, ticket };
}

export async function getTickets(tenantId: string) {
    const supabase = await createClient();
    const { data: tickets, error } = await supabase
        .from("support_tickets")
        .select("*, ticket_messages(*)")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

    if (error || !tickets) {
        console.error("fetch tickets error:", error);
        return [];
    }

    const userIds = [...new Set(tickets.map(t => t.user_id))];
    const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', userIds);
    const { data: billing } = await supabase.from('billing_info').select('company_name').eq('tenant_id', tenantId).maybeSingle();
    const { data: tenantInfo } = await supabase.from('tenants').select('name').eq('id', tenantId).single();

    const profileMap = profiles?.reduce((acc: any, p: any) => { acc[p.user_id] = p; return acc; }, {}) || {};

    return tickets.map(t => ({
        ...t,
        profiles: profileMap[t.user_id] || null,
        tenants: {
            name: tenantInfo?.name || '',
            billing_info: billing?.company_name ? { company_name: billing.company_name } : null
        }
    }));
}

export async function getAllTickets() {
    const adminClient = createAdminClient();
    const { data: tickets, error } = await adminClient
        .from("support_tickets")
        .select("*, tenants(name), ticket_messages(*)")
        .order("created_at", { ascending: false });

    if (error || !tickets) {
        console.error("fetch all tickets error:", error);
        return [];
    }

    const userIds = [...new Set(tickets.map(t => t.user_id))];
    const tenantIds = [...new Set(tickets.map(t => t.tenant_id))];

    const { data: profiles } = await adminClient.from('profiles').select('user_id, full_name, avatar_url').in('user_id', userIds);
    const { data: billingInfo } = await adminClient.from('billing_info').select('tenant_id, company_name').in('tenant_id', tenantIds);

    const profileMap = profiles?.reduce((acc: any, p: any) => { acc[p.user_id] = p; return acc; }, {}) || {};
    const billingMap = billingInfo?.reduce((acc: any, b: any) => { acc[b.tenant_id] = b; return acc; }, {}) || {};

    return tickets.map(t => ({
        ...t,
        profiles: profileMap[t.user_id] || null,
        tenants: {
            ...t.tenants,
            billing_info: billingMap[t.tenant_id] ? { company_name: billingMap[t.tenant_id].company_name } : null
        }
    }));
}

export async function addTicketMessage(ticketId: string, message: string, senderType: "user" | "admin", attachmentUrl: string | null = null) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Yetkisiz erişim" };
    }

    const adminClient = createAdminClient();

    const { error: msgError } = await adminClient
        .from("ticket_messages")
        .insert({
            ticket_id: ticketId,
            sender_id: user.id,
            sender_type: senderType,
            message,
            attachment_url: attachmentUrl
        });

    if (msgError) {
        return { success: false, error: msgError.message };
    }

    // Update unread status
    if (senderType === "user") {
        await adminClient.from("support_tickets")
            .update({ has_unread_user_message: true, status: "open", updated_at: new Date().toISOString() })
            .eq("id", ticketId);
    } else {
        await adminClient.from("support_tickets")
            .update({ has_unread_admin_message: true, status: "waiting_on_user", updated_at: new Date().toISOString() })
            .eq("id", ticketId);
    }

    return { success: true };
}

export async function markTicketStatus(ticketId: string, status: "open" | "closed" | "waiting_on_user") {
    const adminClient = createAdminClient();
    const { error } = await adminClient
        .from("support_tickets")
        .update({ status: status, updated_at: new Date().toISOString() })
        .eq("id", ticketId);

    if (error) {
        return { success: false, error: error.message };
    }
    return { success: true };
}

export async function deleteTicket(ticketId: string, role: string, tenantId: string | null) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Yetkisiz erişim" };
    }

    const adminClient = createAdminClient();

    if (role === "admin") {
        const { error } = await adminClient.from("support_tickets").delete().eq("id", ticketId);
        if (error) return { success: false, error: error.message };
        return { success: true };
    }

    if (role === "tenant" && tenantId) {
        const { error } = await adminClient.from("support_tickets").delete().eq("id", ticketId).eq("tenant_id", tenantId);
        if (error) return { success: false, error: error.message };
        return { success: true };
    }

    return { success: false, error: "Bilinmeyen rol." };
}

export async function markAdminMessageAsRead(ticketId: string) {
    const adminClient = createAdminClient();
    await adminClient.from("support_tickets").update({ has_unread_admin_message: false }).eq("id", ticketId);
}

export async function markUserMessageAsRead(ticketId: string) {
    const adminClient = createAdminClient();
    await adminClient.from("support_tickets").update({ has_unread_user_message: false }).eq("id", ticketId);
}
