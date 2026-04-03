import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TourDetailClient } from "./tour-detail-client";

export default async function TourDetailPage({ params }: { params: { tourId: string } }) {
  const { tourId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: member } = await supabase
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", user.id)
    .single();

  if (!member) redirect("/login");

  // Tur bilgisi
  const { data: tour } = await supabase
    .from("tours")
    .select(`
      *,
      tour_service_options(id, name, price, is_included, is_per_person, is_active)
    `)
    .eq("id", tourId)
    .eq("tenant_id", member.tenant_id)
    .single();

  if (!tour) redirect("/panel/tours");

  // Bu ayın bookingleri
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];

  const { data: bookings } = await supabase
    .from("tour_bookings")
    .select("*")
    .eq("tour_id", tourId)
    .gte("booking_date", monthStart)
    .lte("booking_date", monthEnd)
    .order("booking_date")
    .order("created_at");

  // Tarih override'ları
  const { data: overrides } = await supabase
    .from("tour_date_overrides")
    .select("*")
    .eq("tour_id", tourId)
    .gte("date", monthStart)
    .order("date");

  return (
    <TourDetailClient
      tour={tour}
      tenantId={member.tenant_id}
      initialBookings={bookings || []}
      initialOverrides={overrides || []}
      monthStart={monthStart}
      monthEnd={monthEnd}
    />
  );
}
