import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ToursPageClient } from "./tours-page-client";

export default async function ToursPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: member } = await supabase
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", user.id)
    .single();

  if (!member) redirect("/login");

  // Turları çek
  const { data: tours } = await supabase
    .from("tours")
    .select(`
      *,
      tour_service_options(id, name, price, is_included, is_per_person, is_active, sort_order)
    `)
    .eq("tenant_id", member.tenant_id)
    .order("sort_order")
    .order("name");

  // Banka hesaplarını çek
  const { data: bankAccounts } = await supabase
    .from("tenant_bank_accounts")
    .select("*")
    .eq("tenant_id", member.tenant_id)
    .eq("is_active", true)
    .order("created_at");

  // Yakın tarihlerdeki (30 gün) booking özetlerini çek
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
  const next30 = new Date(Date.now() + 30 * 86400000).toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });

  const { data: bookingSummary } = await supabase
    .from("tour_bookings")
    .select("tour_id, adult_count, child_count, booking_date")
    .eq("tenant_id", member.tenant_id)
    .neq("status", "cancelled")
    .gte("booking_date", today)
    .lte("booking_date", next30);

  // Tour bazında özet hesapla
  const summaryMap: Record<string, { totalGuests: number; bookingCount: number }> = {};
  for (const b of bookingSummary || []) {
    if (!summaryMap[b.tour_id]) summaryMap[b.tour_id] = { totalGuests: 0, bookingCount: 0 };
    summaryMap[b.tour_id].totalGuests += (b.adult_count || 0) + (b.child_count || 0);
    summaryMap[b.tour_id].bookingCount += 1;
  }

  return (
    <ToursPageClient
      tenantId={member.tenant_id}
      initialTours={tours || []}
      bookingSummary={summaryMap}
      initialBankAccounts={bankAccounts || []}
    />
  );
}

