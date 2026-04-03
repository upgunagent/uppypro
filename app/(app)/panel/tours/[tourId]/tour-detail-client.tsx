"use client";

import { useState, useTransition, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, Plus, Users, X, Check, Loader2,
  Calendar as CalendarIcon, MapPin, Clock, DollarSign, Ship,
  Compass, AlertTriangle, Bot, Eye, EyeOff, Trash2, Edit2, CheckCircle2, ClockIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  createManualBooking, updateBookingStatus, reviewTourBooking,
  setTourDateOverride, removeTourDateOverride, updateTourBooking
} from "../actions";
import Link from "next/link";

const DAY_MAP: Record<number, string> = {
  0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat",
};
const DAY_LABELS_TR: Record<string, string> = {
  sun: "Pazar", mon: "Pazartesi", tue: "Salı", wed: "Çarşamba",
  thu: "Perşembe", fri: "Cuma", sat: "Cumartesi",
};
const MONTH_LABELS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

interface Booking {
  id: string;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  booking_date: string;
  adult_count: number;
  child_count: number;
  total_guests: number;
  total_price: number | null;
  selected_services: any[];
  status: string;
  created_by_ai: boolean;
  is_reviewed: boolean;
  description: string | null;
  created_at: string;
  payment_status?: string;
  payment_method?: string;
  deposit_paid?: boolean;
  deposit_amount_paid?: number | null;
}

interface DateOverride {
  id: string;
  date: string;
  is_active: boolean;
  capacity_override: number | null;
  price_override: number | null;
  note: string | null;
}

interface TourService {
  id: string;
  name: string;
  price: number;
  is_included: boolean;
  is_per_person: boolean;
  is_active: boolean;
}

interface Tour {
  id: string;
  name: string;
  tour_type: string;
  capacity: number;
  price_per_person: number | null;
  child_price: number | null;
  child_age_limit: number;
  departure_time: string | null;
  return_time: string | null;
  route: string | null;
  departure_point: string | null;
  available_days: string[];
  currency: string;
  tour_service_options: TourService[];
}

interface Props {
  tour: Tour;
  tenantId: string;
  initialBookings: Booking[];
  initialOverrides: DateOverride[];
  monthStart: string;
  monthEnd: string;
}

export function TourDetailClient({ tour, tenantId, initialBookings, initialOverrides }: Props) {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [overrides, setOverrides] = useState<DateOverride[]>(initialOverrides);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showBookingDialog, setShowBookingDialog] = useState<string | null>(null); // booking_date
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  // Booking form
  const [bookingForm, setBookingForm] = useState({
    guest_name: "", guest_email: "", guest_phone: "",
    adult_count: "1", child_count: "0", description: "",
  });

  // Düzenleme
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editForm, setEditForm] = useState({
    guest_name: "", guest_email: "", guest_phone: "",
    adult_count: "1", child_count: "0", total_price: "",
    description: "",
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Ay içindeki günleri hesapla
  const daysInMonth = useMemo(() => {
    const days: { date: string; dayKey: string; dayNum: number }[] = [];
    const lastDay = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= lastDay; d++) {
      const dt = new Date(year, month, d);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayKey = DAY_MAP[dt.getDay()];
      days.push({ date: dateStr, dayKey, dayNum: d });
    }
    return days;
  }, [year, month]);

  // Booking'leri tarih bazında grupla
  const bookingsByDate = useMemo(() => {
    const map: Record<string, Booking[]> = {};
    for (const b of bookings) {
      if (b.status === "cancelled") continue;
      if (!map[b.booking_date]) map[b.booking_date] = [];
      map[b.booking_date].push(b);
    }
    return map;
  }, [bookings]);

  // Override'ları tarih bazında
  const overrideByDate = useMemo(() => {
    const map: Record<string, DateOverride> = {};
    for (const o of overrides) map[o.date] = o;
    return map;
  }, [overrides]);

  // Tarihin aktif olup olmadığını kontrol et
  function isDateActive(date: string, dayKey: string): boolean {
    const ov = overrideByDate[date];
    if (ov) return ov.is_active;
    return tour.available_days?.includes(dayKey) ?? false;
  }

  function getDateCapacity(date: string): number {
    const ov = overrideByDate[date];
    return ov?.capacity_override || tour.capacity;
  }

  function getDateBooked(date: string): number {
    const dateBookings = bookingsByDate[date] || [];
    return dateBookings.reduce((sum, b) => sum + (b.adult_count || 0) + (b.child_count || 0), 0);
  }

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  }

  async function handleToggleDateActive(date: string, dayKey: string) {
    const currentlyActive = isDateActive(date, dayKey);
    startTransition(async () => {
      const result = await setTourDateOverride(tour.id, tenantId, date, !currentlyActive);
      if (result.success && result.override) {
        setOverrides((prev) => {
          const filtered = prev.filter((o) => o.date !== date);
          return [...filtered, result.override];
        });
        toast({
          title: currentlyActive ? "Tur kapatıldı" : "Tur açıldı",
          description: `${date} tarihi için tur ${currentlyActive ? "pasif" : "aktif"} yapıldı.`,
        });
      }
    });
  }

  async function handleResetDateOverride(date: string) {
    startTransition(async () => {
      const result = await removeTourDateOverride(tour.id, date);
      if (result.success) {
        setOverrides((prev) => prev.filter((o) => o.date !== date));
        toast({ title: "Override kaldırıldı", description: `${date} tarihi varsayılan takvime döndürüldü.` });
      }
    });
  }

  function openBookingDialog(date: string) {
    setBookingForm({ guest_name: "", guest_email: "", guest_phone: "", adult_count: "1", child_count: "0", description: "" });
    setShowBookingDialog(date);
  }

  async function handleCreateBooking() {
    if (!showBookingDialog || !bookingForm.guest_name.trim()) {
      toast({ variant: "destructive", title: "Hata", description: "Müşteri adı zorunludur." });
      return;
    }

    startTransition(async () => {
      const result = await createManualBooking(tour.id, tenantId, {
        guest_name: bookingForm.guest_name,
        guest_email: bookingForm.guest_email,
        guest_phone: bookingForm.guest_phone,
        booking_date: showBookingDialog,
        adult_count: Number(bookingForm.adult_count) || 1,
        child_count: Number(bookingForm.child_count) || 0,
        description: bookingForm.description,
      });

      if (result.success && result.booking) {
        setBookings((prev) => [...prev, result.booking]);
        setShowBookingDialog(null);
        toast({ title: "Başarılı", description: "Rezervasyon oluşturuldu." });
      } else {
        toast({ variant: "destructive", title: "Hata", description: result.error });
      }
    });
  }

  async function handleCancelBooking(bookingId: string) {
    if (!confirm("Bu rezervasyonu iptal etmek istediğinize emin misiniz?")) return;
    startTransition(async () => {
      const result = await updateBookingStatus(bookingId, "cancelled");
      if (result.success) {
        setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: "cancelled" } : b)));
        toast({ title: "İptal Edildi", description: "Rezervasyon iptal edildi." });
      }
    });
  }

  async function handleReviewBooking(bookingId: string) {
    startTransition(async () => {
      const result = await reviewTourBooking(bookingId);
      if (result.success) {
        setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, is_reviewed: true } : b)));
      }
    });
  }

  async function handleApproveBooking(bookingId: string) {
    startTransition(async () => {
      const result = await updateBookingStatus(bookingId, "confirmed");
      if (result.success) {
        setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: "confirmed", is_reviewed: true } : b)));
        toast({ title: "Onaylandı", description: "Rezervasyon onaylandı." });
      }
    });
  }

  function openEditBooking(booking: Booking) {
    setEditForm({
      guest_name: booking.guest_name,
      guest_email: booking.guest_email || "",
      guest_phone: booking.guest_phone || "",
      adult_count: String(booking.adult_count),
      child_count: String(booking.child_count),
      total_price: booking.total_price ? String(booking.total_price) : "",
      description: booking.description || "",
    });
    setEditingBooking(booking);
  }

  async function handleEditSave() {
    if (!editingBooking) return;
    startTransition(async () => {
      const result = await updateTourBooking(editingBooking.id, {
        guest_name: editForm.guest_name,
        guest_email: editForm.guest_email,
        guest_phone: editForm.guest_phone,
        adult_count: Number(editForm.adult_count) || 1,
        child_count: Number(editForm.child_count) || 0,
        total_price: editForm.total_price ? Number(editForm.total_price) : null,
        description: editForm.description,
      });
      if (result.success && result.booking) {
        setBookings((prev) => prev.map((b) => (b.id === editingBooking.id ? { ...b, ...result.booking } : b)));
        setEditingBooking(null);
        toast({ title: "Güncellendi", description: "Rezervasyon bilgileri güncellendi." });
      } else {
        toast({ variant: "destructive", title: "Hata", description: result.error });
      }
    });
  }

  // Ay özeti
  const monthStats = useMemo(() => {
    let totalGuests = 0;
    let totalRevenue = 0;
    let activeDays = 0;

    for (const day of daysInMonth) {
      if (isDateActive(day.date, day.dayKey)) {
        activeDays++;
        const booked = getDateBooked(day.date);
        totalGuests += booked;
      }
    }

    const activeBookings = bookings.filter((b) => b.status !== "cancelled");
    totalRevenue = activeBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);

    return { totalGuests, totalRevenue, activeDays, bookingCount: activeBookings.length };
  }, [daysInMonth, bookings, overrides]);

  const _todayDate = new Date();
  const today = `${_todayDate.getFullYear()}-${String(_todayDate.getMonth() + 1).padStart(2, '0')}-${String(_todayDate.getDate()).padStart(2, '0')}`;

  return (
    <div className="p-6 bg-slate-50 min-h-[calc(100vh-60px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/panel/tours" className="p-2 rounded-lg hover:bg-slate-200 transition-colors">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Compass className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{tour.name}</h1>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              {tour.route && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {tour.route}</span>}
              {tour.departure_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {tour.departure_time}</span>}
              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {tour.capacity} kişi</span>
            </div>
          </div>
        </div>
      </div>

      {/* Ay İstatistikleri */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Toplam Misafir", value: monthStats.totalGuests, icon: Users, color: "text-emerald-600" },
          { label: "Rezervasyon", value: monthStats.bookingCount, icon: CalendarIcon, color: "text-blue-600" },
          { label: "Aktif Gün", value: monthStats.activeDays, icon: Check, color: "text-orange-600" },
          { label: "Gelir", value: `${monthStats.totalRevenue.toLocaleString("tr-TR")} ₺`, icon: DollarSign, color: "text-purple-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs text-slate-500">{stat.label}</span>
            </div>
            <p className={`text-xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Ay Navigasyonu */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={prevMonth}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Önceki Ay
        </Button>
        <h2 className="text-lg font-bold text-slate-800">
          {MONTH_LABELS[month]} {year}
        </h2>
        <Button variant="ghost" size="sm" onClick={nextMonth}>
          Sonraki Ay <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch flex-1 min-h-[600px]">
        {/* Sol Kolon: Günler Listesi */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-xl shrink-0">
            <h3 className="font-semibold text-slate-800 text-sm">Takvim Günleri</h3>
            <span className="text-xs text-slate-500 font-medium">{daysInMonth.length} gün</span>
          </div>
          <div className="overflow-y-auto p-2 space-y-2 grow custom-scrollbar">
            {daysInMonth.map((day) => {
              const active = isDateActive(day.date, day.dayKey);
              const capacity = getDateCapacity(day.date);
              const booked = getDateBooked(day.date);
              const remaining = capacity - booked;
              const fillPercent = capacity > 0 ? Math.min((booked / capacity) * 100, 100) : 0;
              const isFull = remaining <= 0;
              const isPast = day.date < today;
              const dateBookings = (bookingsByDate[day.date] || []).filter((b) => b.status !== "cancelled");
              const dayLabel = DAY_LABELS_TR[day.dayKey] || day.dayKey;
              const isSelected = selectedDate === day.date;

              return (
                <div
                  key={day.date}
                  onClick={() => setSelectedDate(day.date)}
                  className={`rounded-xl border transition-all cursor-pointer overflow-hidden ${
                    isSelected ? "ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/50 shadow-sm" : 
                    !active ? "opacity-60 border-slate-200 bg-slate-50" : 
                    isPast ? "border-slate-200 bg-slate-50/70 opacity-80" : 
                    "border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between px-3 py-3">
                    <div className="flex items-center gap-3 w-full">
                      <div className={`w-11 h-11 rounded-lg flex flex-col items-center justify-center shrink-0 shadow-sm ${
                        day.date === today ? "bg-emerald-500 text-white" : isSelected ? "bg-emerald-200 text-emerald-800" : "bg-slate-100 text-slate-700"
                      }`}>
                        <span className="text-[10px] font-bold uppercase tracking-wider leading-tight opacity-90 mb-0.5">{dayLabel.substring(0, 3)}</span>
                        <span className="text-base font-black leading-tight">{day.dayNum}</span>
                      </div>

                      {active ? (
                        <div className="flex-1 min-w-0 pr-1">
                          <div className="flex items-center justify-between mb-1">
                             <div className="flex items-center gap-1.5">
                               {isPast ? <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 rounded">Geçmiş</span> : null}
                               <span className={`text-xs font-bold ${isFull ? "text-red-600" : "text-emerald-700"}`}>
                                 {booked}/{capacity} dolu
                               </span>
                             </div>
                             {dateBookings.length > 0 && (
                               <span className="text-[10px] font-medium text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded-full shadow-sm">
                                  {dateBookings.length} rez.
                               </span>
                             )}
                          </div>
                          
                          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1.5">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isFull ? "bg-red-500" : fillPercent > 75 ? "bg-orange-500" : "bg-emerald-500"
                              }`}
                              style={{ width: `${fillPercent}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 text-sm font-medium text-slate-400 opacity-80 pl-1">Kapalı</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sağ Kolon: Rezervasyon Detayları */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
          {selectedDate ? (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/30 rounded-t-xl shrink-0">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-emerald-100 shadow-sm">
                      <CalendarIcon className="w-5 h-5 text-emerald-600" />
                   </div>
                   <div>
                     <h3 className="font-bold text-lg text-slate-900 leading-tight">
                        {selectedDate.split('-').reverse().join('.')}
                     </h3>
                     <p className="text-xs font-medium text-slate-500 mt-0.5">
                       {isDateActive(selectedDate, DAY_MAP[new Date(selectedDate).getDay()]) ? (
                          <span className={`${getDateBooked(selectedDate) >= getDateCapacity(selectedDate) ? "text-red-500" : "text-emerald-600"}`}>
                             Kapasite: {getDateBooked(selectedDate)}/{getDateCapacity(selectedDate)} dolu
                          </span>
                       ) : (
                          <span className="text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Bu tarih tura kapalı</span>
                       )}
                     </p>
                   </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {!!overrideByDate[selectedDate] && (
                    <Button variant="outline" size="sm" onClick={() => handleResetDateOverride(selectedDate)} className="text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100 font-medium text-xs h-8">
                       ✏️ Özel Ayarı Kaldır
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => handleToggleDateActive(selectedDate, DAY_MAP[new Date(selectedDate).getDay()])} className="h-8 text-xs font-medium bg-white">
                    {isDateActive(selectedDate, DAY_MAP[new Date(selectedDate).getDay()]) ? <><EyeOff className="w-3.5 h-3.5 mr-1.5 opacity-70" /> Turu Kapat</> : <><Eye className="w-3.5 h-3.5 mr-1.5 opacity-70" /> Turu Aç</>}
                  </Button>
                  {isDateActive(selectedDate, DAY_MAP[new Date(selectedDate).getDay()]) && selectedDate >= today && getDateBooked(selectedDate) < getDateCapacity(selectedDate) && (
                    <Button size="sm" onClick={() => openBookingDialog(selectedDate)} className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs font-semibold shadow-sm">
                      <Plus className="w-3.5 h-3.5 mr-1.5" /> Manuel Ekle
                    </Button>
                  )}
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto">
                {(() => {
                   const dateBookings = (bookingsByDate[selectedDate] || []).filter((b) => b.status !== "cancelled");
                   if (dateBookings.length === 0) {
                      return (
                         <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[400px]">
                            <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-5 border-2 border-dashed border-slate-200">
                               <Users className="w-8 h-8 text-slate-400" />
                            </div>
                            <h4 className="text-lg font-bold text-slate-800">Rezervasyon Bulunamadı</h4>
                            <p className="text-sm text-slate-500 mb-6 max-w-[280px] mt-2 leading-relaxed">
                               Bu tarihte henüz herhangi bir rezervasyon oluşturulmamış. Yeni rezervasyonlar otomatik olarak buraya düşecektir.
                            </p>
                            {isDateActive(selectedDate, DAY_MAP[new Date(selectedDate).getDay()]) && selectedDate >= today && (
                              <Button onClick={() => openBookingDialog(selectedDate)} className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm font-semibold rounded-xl">
                                 <Plus className="w-4 h-4 mr-2" />
                                 İlk Rezervasyonu Ekle
                              </Button>
                            )}
                         </div>
                      );
                   }
                   return (
                      <div className="divide-y divide-slate-100">
                        {dateBookings.map((b, idx) => (
                           <div key={b.id} className={`p-4 sm:px-6 hover:bg-slate-50/50 transition-colors flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4 ${
                             b.status === "pending_approval" ? "bg-amber-50/30 border-l-4 border-amber-400" : ""
                           }`}>
                              <div className="flex items-start gap-4 w-full sm:w-auto">
                                <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold flex items-center justify-center shrink-0 mt-1 sm:mt-0 shadow-sm">
                                  {idx + 1}
                                </span>
                                <div>
                                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                    <span className="font-bold text-slate-800 tracking-tight">{b.guest_name}</span>
                                    {/* Durum Badge */}
                                    {b.status === "pending_approval" && (
                                      <span className="flex items-center gap-1 text-[10px] bg-amber-100 border border-amber-200 text-amber-800 px-2 py-0.5 rounded-md font-bold shadow-sm animate-pulse">
                                        ⏳ Onay Bekliyor
                                      </span>
                                    )}
                                    {b.status === "confirmed" && (
                                      <span className="flex items-center gap-1 text-[10px] bg-emerald-100 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded-md font-bold shadow-sm">
                                        <CheckCircle2 className="w-3 h-3" /> Onaylandı
                                      </span>
                                    )}
                                    <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm">
                                      {b.adult_count}Y{b.child_count > 0 ? ` +${b.child_count}Ç` : ""} = {b.adult_count + b.child_count} kişi
                                    </span>
                                    {b.total_price && (
                                      <span className="text-[10px] font-bold bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md shadow-sm">
                                        {b.total_price}₺
                                      </span>
                                    )}
                                    {b.created_by_ai && (
                                       <span className="flex items-center gap-1 text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-600 px-2 py-0.5 rounded-md font-bold shadow-sm">
                                          <Bot className="w-3 h-3"/> AI
                                       </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                                    {b.guest_email && <span className="flex items-center gap-1.5">📧 {b.guest_email}</span>}
                                    {b.guest_phone && <span className="flex items-center gap-1.5">📱 {b.guest_phone}</span>}
                                  </div>
                                  {b.selected_services?.length > 0 && (
                                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                      {b.selected_services.map((s: any, i: number) => (
                                        <span key={i} className="text-[10px] bg-orange-50 text-orange-700 px-2 py-0.5 rounded-md border border-orange-100 font-semibold shadow-sm">
                                          🏷️ {s.name}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {b.description && (
                                    <div className="text-xs text-slate-600 mt-2 bg-yellow-50 p-2 rounded-lg border border-yellow-100/50">
                                       <span className="font-semibold text-yellow-800 block mb-0.5">Müşteri Notu:</span>
                                       {b.description}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0 justify-end flex-wrap">
                                {/* Onay Bekliyor → Onayla butonu */}
                                {b.status === "pending_approval" && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleApproveBooking(b.id)}
                                    className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Onayla
                                  </Button>
                                )}
                                {/* Düzenle butonu */}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditBooking(b)}
                                  className="h-8 text-xs font-semibold text-slate-600 hover:text-slate-800"
                                >
                                  <Edit2 className="w-3.5 h-3.5 mr-1 opacity-70" /> Düzenle
                                </Button>
                                {/* İptal butonu */}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleCancelBooking(b.id)}
                                  className="h-8 text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5 mr-1 opacity-70" /> İptal et
                                </Button>
                              </div>
                           </div>
                        ))}
                      </div>
                   );
                })()}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full text-slate-400 bg-slate-50/50 rounded-xl min-h-[500px]">
              <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center mb-6 border-2 border-slate-100 shadow-sm">
                <CalendarIcon className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">Tarih Seçin</h3>
              <p className="max-w-[320px] mb-8 text-sm text-slate-500 leading-relaxed font-medium">
                Rezervasyonları görüntülemek, özel ayar yapmak veya manuel rezervasyon girmek için sol menüden bir tarih seçin.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-slate-500 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100" /> Aktif</span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-200 ring-2 ring-slate-50" /> Kapalı</span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-100" /> Dolu</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Manuel Rezervasyon Dialog */}
      {showBookingDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowBookingDialog(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Manuel Rezervasyon</h3>
                <p className="text-xs text-slate-500">{tour.name} — {showBookingDialog}</p>
              </div>
              <button onClick={() => setShowBookingDialog(null)} className="p-2 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <Label className="text-sm">Müşteri Adı <span className="text-red-500">*</span></Label>
                <Input
                  value={bookingForm.guest_name}
                  onChange={(e) => setBookingForm({ ...bookingForm, guest_name: e.target.value })}
                  placeholder="Ad Soyad"
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">E-posta</Label>
                  <Input
                    value={bookingForm.guest_email}
                    onChange={(e) => setBookingForm({ ...bookingForm, guest_email: e.target.value })}
                    placeholder="email@örnek.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">Telefon</Label>
                  <Input
                    value={bookingForm.guest_phone}
                    onChange={(e) => setBookingForm({ ...bookingForm, guest_phone: e.target.value })}
                    placeholder="+90 5XX..."
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Yetişkin Sayısı</Label>
                  <Input
                    type="number"
                    min="1"
                    value={bookingForm.adult_count}
                    onChange={(e) => setBookingForm({ ...bookingForm, adult_count: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">Çocuk Sayısı</Label>
                  <Input
                    type="number"
                    min="0"
                    value={bookingForm.child_count}
                    onChange={(e) => setBookingForm({ ...bookingForm, child_count: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm">Notlar</Label>
                <Textarea
                  value={bookingForm.description}
                  onChange={(e) => setBookingForm({ ...bookingForm, description: e.target.value })}
                  placeholder="Özel istekler, notlar..."
                  className="mt-1 min-h-[60px]"
                />
              </div>

              {/* Fiyat Önizleme */}
              {tour.price_per_person && (
                <div className="bg-emerald-50 rounded-lg px-3 py-2 text-sm">
                  <p className="font-medium text-emerald-800">
                    💰 Tahmini Fiyat: {(
                      (Number(bookingForm.adult_count) || 1) * (tour.price_per_person || 0) +
                      (Number(bookingForm.child_count) || 0) * (tour.child_price || 0)
                    ).toLocaleString("tr-TR")} {tour.currency || "₺"}
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowBookingDialog(null)}>İptal</Button>
              <Button onClick={handleCreateBooking} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Rezervasyon Oluştur
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Booking Dialog */}
      {editingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setEditingBooking(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Rezervasyon Düzenle</h3>
                <p className="text-xs text-slate-500">Müşteri bilgilerini ve detayları güncelleyin.</p>
              </div>
              <button onClick={() => setEditingBooking(null)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 overflow-y-auto max-h-[70vh]">
              <div>
                <Label className="text-sm">Müşteri Adı <span className="text-red-500">*</span></Label>
                <Input
                  value={editForm.guest_name}
                  onChange={(e) => setEditForm({ ...editForm, guest_name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">E-posta</Label>
                  <Input
                    value={editForm.guest_email}
                    onChange={(e) => setEditForm({ ...editForm, guest_email: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">Telefon</Label>
                  <Input
                    value={editForm.guest_phone}
                    onChange={(e) => setEditForm({ ...editForm, guest_phone: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm">Yetişkin</Label>
                  <Input
                    type="number"
                    min="1"
                    value={editForm.adult_count}
                    onChange={(e) => setEditForm({ ...editForm, adult_count: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">Çocuk</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editForm.child_count}
                    onChange={(e) => setEditForm({ ...editForm, child_count: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">Toplam Fiyat (₺)</Label>
                  <Input
                    type="number"
                    value={editForm.total_price}
                    onChange={(e) => setEditForm({ ...editForm, total_price: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm">Müşteri Notu</Label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Notlar..."
                  className="mt-1 min-h-[60px]"
                />
              </div>

              {/* Mevcut durum bilgisi */}
              <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2.5 text-xs">
                <span className="font-semibold text-slate-600">Durum:</span>
                {editingBooking.status === "pending_approval" && <span className="text-amber-700 font-bold">⏳ Onay Bekliyor</span>}
                {editingBooking.status === "confirmed" && <span className="text-emerald-700 font-bold">✅ Onaylandı</span>}
                {editingBooking.status === "cancelled" && <span className="text-red-700 font-bold">❌ İptal Edildi</span>}
                {editingBooking.created_by_ai && <span className="ml-auto text-indigo-600 font-bold">🤖 AI Tarafından Oluşturuldu</span>}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 shrink-0">
              <Button variant="outline" onClick={() => setEditingBooking(null)}>İptal</Button>
              <Button onClick={handleEditSave} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                Kaydet
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
