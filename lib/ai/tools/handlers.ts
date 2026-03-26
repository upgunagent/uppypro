/**
 * AI Tool Handler'ları
 * Her tool çağrıldığında çalıştırılacak fonksiyonlar
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { sendAppointmentEmail } from "@/lib/ai/email-sender";

interface ToolContext {
  tenantId: string;
  conversationId: string;
  senderPhone: string;
}

/**
 * Tool adına göre doğru handler'ı çalıştırır
 */
export async function executeToolCall(
  toolName: string,
  args: Record<string, any>,
  context: ToolContext
): Promise<string> {
  try {
    switch (toolName) {
      case "check_availability":
        return await handleCheckAvailability(args, context);
      case "create_appointment":
        return await handleCreateAppointment(args, context);
      case "get_my_appointments":
        return await handleGetMyAppointments(args, context);
      case "cancel_appointment":
        return await handleCancelAppointment(args, context);
      case "reschedule_appointment":
        return await handleRescheduleAppointment(args, context);
      case "notify_human_agent":
        return await handleNotifyHumanAgent(args, context);
      case "update_customer":
        return await handleUpdateCustomer(args, context);
      case "mail_gonder":
        return await handleMailGonder(args, context);
      default:
        return JSON.stringify({ error: `Bilinmeyen tool: ${toolName}` });
    }
  } catch (error: any) {
    console.error(`[AI Tool] Error executing ${toolName}:`, error);
    return JSON.stringify({ error: error.message || "Tool çalıştırılırken hata oluştu" });
  }
}

async function handleCheckAvailability(
  args: Record<string, any>,
  context: ToolContext
): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("check_availability", {
    p_tenant_id: context.tenantId,
    p_date: args.date,
    p_employee_name: args.employee_name,
  });

  if (error) {
    return JSON.stringify({ error: error.message });
  }

  if (!data || data.length === 0) {
    return JSON.stringify({
      message: "Bu tarihte müsait saat bulunamadı. Farklı bir tarih veya personel deneyin.",
      available_slots: [],
    });
  }

  return JSON.stringify({
    message: `${data.length} müsait saat bulundu`,
    available_slots: data,
  });
}

async function handleCreateAppointment(
  args: Record<string, any>,
  context: ToolContext
): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("create_appointment", {
    p_tenant_id: context.tenantId,
    p_customer_name: args.customer_name,
    p_customer_email: args.customer_email,
    p_customer_phone: args.customer_phone,
    p_start_time: args.start_time,
    p_end_time: args.end_time,
    p_title: args.title,
    p_description: args.description || "",
    p_employee_name: args.employee_name,
  });

  if (error) {
    return JSON.stringify({ error: error.message });
  }

  return JSON.stringify(data);
}

async function handleGetMyAppointments(
  args: Record<string, any>,
  context: ToolContext
): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("get_my_appointments", {
    p_identifier: args.customer_identifier,
    p_tenant_id: context.tenantId,
  });

  if (error) {
    return JSON.stringify({ error: error.message });
  }

  if (!data || data.length === 0) {
    return JSON.stringify({
      message: "Gelecekte planlanmış randevu bulunamadı.",
      appointments: [],
    });
  }

  return JSON.stringify({
    message: `${data.length} randevu bulundu`,
    appointments: data,
  });
}

async function handleCancelAppointment(
  args: Record<string, any>,
  _context: ToolContext
): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("cancel_appointment", {
    p_appointment_id: args.appointment_id,
  });

  if (error) {
    return JSON.stringify({ error: error.message });
  }

  return JSON.stringify(data);
}

async function handleRescheduleAppointment(
  args: Record<string, any>,
  _context: ToolContext
): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("reschedule_appointment", {
    p_appointment_id: args.appointment_id,
    p_new_start_time: args.new_start_time,
    p_new_end_time: args.new_end_time || null,
  });

  if (error) {
    return JSON.stringify({ error: error.message });
  }

  return JSON.stringify(data);
}

async function handleNotifyHumanAgent(
  args: Record<string, any>,
  context: ToolContext
): Promise<string> {
  const supabase = createAdminClient();

  // 1. Bildirim oluştur
  await supabase.from("notifications").insert({
    tenant_id: context.tenantId,
    type: "AI_ESCALATION",
    title: "🔔 Canlı Destek Talebi",
    message: args.summary,
    metadata: {
      conversation_id: context.conversationId,
      customer_number: context.senderPhone,
    },
  });

  // 2. Konuşma modunu HUMAN'a geçir
  await supabase
    .from("conversations")
    .update({ mode: "HUMAN" })
    .eq("id", context.conversationId);

  return JSON.stringify({
    success: true,
    message: "Canlı destek talebi iletildi. Bir temsilci en kısa sürede size dönüş yapacaktır.",
  });
}

async function handleUpdateCustomer(
  args: Record<string, any>,
  context: ToolContext
): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("update_customer", {
    p_tenant_id: context.tenantId,
    p_customer_phone: args.customer_phone,
    p_field: args.field,
    p_value: args.value,
  });

  if (error) {
    return JSON.stringify({ error: error.message });
  }

  return JSON.stringify(data);
}

async function handleMailGonder(
  args: Record<string, any>,
  context: ToolContext
): Promise<string> {
  try {
    await sendAppointmentEmail(context.tenantId, {
      type: args.type,
      customerName: args.customer_name,
      customerEmail: args.customer_email,
      appointmentTitle: args.appointment_title,
      appointmentDate: args.appointment_date,
      employeeName: args.employee_name || "",
    });

    return JSON.stringify({
      success: true,
      message: "E-posta başarıyla gönderildi.",
    });
  } catch (error: any) {
    console.error("[AI Tool] Mail gönderim hatası:", error);
    return JSON.stringify({
      success: false,
      message: "E-posta gönderilirken bir sorun oluştu: " + error.message,
    });
  }
}
