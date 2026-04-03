"use client";

import { useState, useTransition, useRef } from "react";
import {
  Plus, Edit2, Trash2, Ship, Mountain, MapPin,
  Clock, Users, ChevronRight, Compass, X, Loader2, DollarSign,
  Calendar as CalendarIcon, Check, AlertTriangle, CreditCard, Banknote,
  Building2, Image, ExternalLink, Moon, Sparkles, Star, Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { createTour, updateTour, deleteTour, addTourService, deleteTourService, addBankAccount, uploadTourCoverPhoto, deleteTourCoverPhoto } from "./actions";
import Link from "next/link";

const TOUR_TYPE_OPTIONS = [
  { value: "day_trip", label: "Günlük Tur", icon: Ship },
  { value: "half_day", label: "Yarım Gün", icon: Clock },
  { value: "cultural", label: "Kültürel Tur / Günlük", icon: MapPin },
  { value: "adventure", label: "Macera Turu / Günlük", icon: Mountain },
  { value: "entertainment", label: "Eğlence Turu", icon: Sparkles },
  { value: "night_tour", label: "Gece Turu", icon: Moon },
];

const DAY_OPTIONS = [
  { key: "mon", label: "Pzt" },
  { key: "tue", label: "Sal" },
  { key: "wed", label: "Çar" },
  { key: "thu", label: "Per" },
  { key: "fri", label: "Cum" },
  { key: "sat", label: "Cmt" },
  { key: "sun", label: "Paz" },
];

const TOUR_TYPE_ICON: Record<string, any> = {
  day_trip: Ship,
  half_day: Clock,
  cultural: MapPin,
  adventure: Mountain,
  entertainment: Sparkles,
  night_tour: Moon,
};

interface TourServiceOption {
  id: string;
  name: string;
  price: number;
  is_included: boolean;
  is_per_person: boolean;
  is_active: boolean;
}

interface BankAccount {
  id: string;
  bank_name: string;
  iban: string;
  account_holder: string | null;
}

interface Tour {
  id: string;
  name: string;
  tour_type: string;
  description: string | null;
  capacity: number;
  price_per_person: number | null;
  child_price: number | null;
  child_age_limit: number;
  departure_time: string | null;
  return_time: string | null;
  route: string | null;
  departure_point: string | null;
  destination: string | null;
  vehicle_type: string | null;
  category: string | null;
  available_days: string[];
  season_start: string | null;
  season_end: string | null;
  cover_photo: string | null;
  gallery_url: string | null;
  extra_info: string | null;
  cancellation_policy: string | null;
  what_to_bring: string | null;
  is_active: boolean;
  currency: string;
  tour_service_options: TourServiceOption[];
  // Ödeme
  accepts_credit_card: boolean;
  accepts_cash: boolean;
  accepts_bank_transfer: boolean;
  requires_deposit: boolean;
  deposit_amount: number | null;
  payment_terms: string | null;
  selected_iban_ids: string[];
}

interface Props {
  tenantId: string;
  initialTours: Tour[];
  bookingSummary: Record<string, { totalGuests: number; bookingCount: number }>;
  initialBankAccounts: BankAccount[];
}

const emptyForm = (): Record<string, any> => ({
  name: "",
  tour_type: "day_trip",
  description: "",
  capacity: 20,
  min_participants: 1,
  price_per_person: "",
  child_price: "",
  child_age_limit: 12,
  currency: "TRY",
  departure_time: "",
  return_time: "",
  departure_point: "",
  route: "",
  destination: "",
  vehicle_type: "",
  available_days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
  season_start: "",
  season_end: "",
  extra_info: "",
  cancellation_policy: "",
  what_to_bring: "",
  is_active: true,
  cover_photo: "",
  gallery_url: "",
  // Ödeme
  accepts_credit_card: false,
  accepts_cash: false,
  accepts_bank_transfer: false,
  requires_deposit: false,
  deposit_amount: "",
  payment_terms: "",
  selected_iban_ids: [],
});

export function ToursPageClient({ tenantId, initialTours, bookingSummary, initialBankAccounts }: Props) {
  const [tours, setTours] = useState<Tour[]>(initialTours);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(initialBankAccounts);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTour, setEditingTour] = useState<Tour | null>(null);
  const [form, setForm] = useState<Record<string, any>>(emptyForm());
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  // Hizmet ekleme
  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("");
  const [newServiceIncluded, setNewServiceIncluded] = useState(false);

  // Yeni IBAN ekleme
  const [showAddIban, setShowAddIban] = useState(false);
  const [newIban, setNewIban] = useState({ bank_name: "", iban: "", account_holder: "" });

  // Kapak fotoğrafı yükleme
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  function openCreateDialog() {
    setEditingTour(null);
    setForm(emptyForm());
    setShowAddIban(false);
    setCoverFile(null);
    setCoverPreview(null);
    setShowDialog(true);
  }

  function openEditDialog(tour: Tour) {
    setEditingTour(tour);
    setForm({
      name: tour.name,
      tour_type: tour.tour_type,
      description: tour.description || "",
      capacity: tour.capacity,
      min_participants: 1,
      price_per_person: tour.price_per_person || "",
      child_price: tour.child_price ?? "",
      child_age_limit: tour.child_age_limit || 12,
      currency: tour.currency || "TRY",
      departure_time: tour.departure_time || "",
      return_time: tour.return_time || "",
      departure_point: tour.departure_point || "",
      route: tour.route || "",
      destination: tour.destination || "",
      vehicle_type: tour.vehicle_type || "",
      available_days: tour.available_days || ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
      season_start: tour.season_start || "",
      season_end: tour.season_end || "",
      extra_info: tour.extra_info || "",
      cancellation_policy: tour.cancellation_policy || "",
      what_to_bring: tour.what_to_bring || "",
      is_active: tour.is_active,
      cover_photo: tour.cover_photo || "",
      gallery_url: tour.gallery_url || "",
      accepts_credit_card: tour.accepts_credit_card || false,
      accepts_cash: tour.accepts_cash || false,
      accepts_bank_transfer: tour.accepts_bank_transfer || false,
      requires_deposit: tour.requires_deposit || false,
      deposit_amount: tour.deposit_amount || "",
      payment_terms: tour.payment_terms || "",
      selected_iban_ids: tour.selected_iban_ids || [],
    });
    setShowAddIban(false);
    setCoverFile(null);
    setCoverPreview(null);
    setShowDialog(true);
  }

  function setField(key: string, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleDay(day: string) {
    setForm((prev) => {
      const days = prev.available_days || [];
      if (days.includes(day)) {
        return { ...prev, available_days: days.filter((d: string) => d !== day) };
      }
      return { ...prev, available_days: [...days, day] };
    });
  }

  function toggleIbanSelection(ibanId: string) {
    setForm((prev) => {
      const ids = prev.selected_iban_ids || [];
      if (ids.includes(ibanId)) {
        return { ...prev, selected_iban_ids: ids.filter((id: string) => id !== ibanId) };
      }
      return { ...prev, selected_iban_ids: [...ids, ibanId] };
    });
  }

  async function handleSave() {
    if (!form.name?.trim()) {
      toast({ variant: "destructive", title: "Hata", description: "Tur adı zorunludur." });
      return;
    }

    const payload = {
      ...form,
      price_per_person: form.price_per_person ? Number(form.price_per_person) : null,
      child_price: form.child_price !== "" ? Number(form.child_price) : null,
      capacity: Number(form.capacity) || 20,
      child_age_limit: Number(form.child_age_limit) || 12,
      season_start: form.season_start || null,
      season_end: form.season_end || null,
      deposit_amount: form.deposit_amount ? Number(form.deposit_amount) : null,
      cover_photo: form.cover_photo || null,
      gallery_url: form.gallery_url || null,
    };

    startTransition(async () => {
      try {
        if (editingTour) {
          // Kapak fotoğrafı yükleme
          if (coverFile) {
            const fd = new FormData();
            fd.append("file", coverFile);
            try {
              const uploadResult = await uploadTourCoverPhoto(editingTour.id, tenantId, fd);
              if (uploadResult.success && uploadResult.url) {
                payload.cover_photo = uploadResult.url;
              } else if (!uploadResult.success) {
                toast({ variant: "destructive", title: "Fotoğraf Yüklenemedi", description: uploadResult.error });
                return;
              }
            } catch (err: any) {
              toast({ variant: "destructive", title: "Hata", description: "Fotoğraf yüklenemedi. Dosya çok büyük (maks 10MB) veya sunucu hatası olabilir." });
              return;
            }
          }
          const result = await updateTour(editingTour.id, payload);
          if (result.success) {
            setTours((prev) => prev.map((t) => (t.id === editingTour.id ? { ...t, ...payload } : t)));
            toast({ title: "Başarılı", description: "Tur güncellendi." });
            setShowDialog(false);
            setCoverFile(null);
            setCoverPreview(null);
          } else {
            toast({ variant: "destructive", title: "Hata", description: result.error });
          }
        } else {
          const result = await createTour(tenantId, payload);
          if (result.success && result.tour) {
            // Yeni tur oluşturuldu, kapak fotoğrafı varsa yükle
            if (coverFile) {
              const fd = new FormData();
              fd.append("file", coverFile);
              try {
                const uploadResult = await uploadTourCoverPhoto(result.tour.id, tenantId, fd);
                if (uploadResult.success && uploadResult.url) {
                  result.tour.cover_photo = uploadResult.url;
                } else if (!uploadResult.success) {
                  toast({ variant: "destructive", title: "Fotoğraf Yüklenemedi", description: uploadResult.error });
                }
              } catch (err: any) {
                toast({ variant: "destructive", title: "Hata", description: "Tur oluşturuldu ancak fotoğraf yüklenemedi. Dosya çok büyük olabilir." });
              }
            }
            setTours((prev) => [...prev, { ...result.tour, tour_service_options: [] }]);
            toast({ title: "Başarılı", description: "Tur oluşturuldu." });
            setShowDialog(false);
            setCoverFile(null);
            setCoverPreview(null);
          } else {
            toast({ variant: "destructive", title: "Hata", description: result.error });
          }
        }
      } catch (err: any) {
        toast({ variant: "destructive", title: "Beklenmeyen Hata", description: "İşlem sırasında bir hata oluştu. Lütfen dosya boyutunuzun 10MB'tan küçük olduğundan emin olun." });
      }
    });
  }

  async function handleDelete(tourId: string) {
    if (!confirm("Bu turu silmek istediğinize emin misiniz?")) return;
    startTransition(async () => {
      const result = await deleteTour(tourId);
      if (result.success) {
        setTours((prev) => prev.filter((t) => t.id !== tourId));
        toast({ title: "Silindi", description: "Tur başarıyla silindi." });
      }
    });
  }

  async function handleAddService(tourId: string) {
    if (!newServiceName.trim()) return;
    startTransition(async () => {
      const result = await addTourService(tourId, tenantId, {
        name: newServiceName,
        price: Number(newServicePrice) || 0,
        is_included: newServiceIncluded,
        is_per_person: true,
      });
      if (result.success && result.service) {
        setTours((prev) =>
          prev.map((t) =>
            t.id === tourId
              ? { ...t, tour_service_options: [...(t.tour_service_options || []), result.service] }
              : t
          )
        );
        setNewServiceName("");
        setNewServicePrice("");
        setNewServiceIncluded(false);
        toast({ title: "Eklendi", description: "Hizmet seçeneği eklendi." });
      }
    });
  }

  async function handleDeleteService(tourId: string, serviceId: string) {
    startTransition(async () => {
      const result = await deleteTourService(serviceId);
      if (result.success) {
        setTours((prev) =>
          prev.map((t) =>
            t.id === tourId
              ? { ...t, tour_service_options: t.tour_service_options.filter((s) => s.id !== serviceId) }
              : t
          )
        );
      }
    });
  }

  async function handleAddBankAccount() {
    if (!newIban.bank_name.trim() || !newIban.iban.trim()) {
      toast({ variant: "destructive", title: "Hata", description: "Banka adı ve IBAN zorunludur." });
      return;
    }
    startTransition(async () => {
      const result = await addBankAccount(tenantId, newIban);
      if (result.success && result.account) {
        setBankAccounts((prev) => [...prev, result.account]);
        // Otomatik seç
        setForm((prev) => ({
          ...prev,
          selected_iban_ids: [...(prev.selected_iban_ids || []), result.account.id],
        }));
        setNewIban({ bank_name: "", iban: "", account_holder: "" });
        setShowAddIban(false);
        toast({ title: "Eklendi", description: "Banka hesabı eklendi ve seçildi." });
      } else {
        toast({ variant: "destructive", title: "Hata", description: result.error });
      }
    });
  }

  return (
    <div className="p-6 bg-slate-50 min-h-[calc(100vh-64px)] w-full flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Compass className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Turlarım</h1>
            <p className="text-sm text-slate-500">Turlarınızı yönetin, kapasiteleri takip edin.</p>
          </div>
        </div>
        <Button onClick={openCreateDialog} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Yeni Tur Ekle
        </Button>
      </div>

      {/* Tour Cards */}
      {tours.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center flex-1 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <Compass className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="font-semibold text-lg text-slate-800 mb-2">Henüz tur eklenmedi</h3>
          <p className="text-sm text-slate-500 mb-4 max-w-md mx-auto">
            Tekne turu, otobüs gezisi, kültürel tur veya seyahat paketi gibi turlarınızı ekleyerek
            AI asistanınızın müşterilerinize otomatik kapasite kontrolü ile rezervasyon oluşturmasını sağlayın.
          </p>
          <Button onClick={openCreateDialog} variant="outline" className="text-emerald-600 border-emerald-300">
            <Plus className="w-4 h-4 mr-2" /> İlk Turunuzu Ekleyin
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {tours.map((tour) => {
            const TypeIcon = TOUR_TYPE_ICON[tour.tour_type] || Compass;
            const typeLabel = TOUR_TYPE_OPTIONS.find((t) => t.value === tour.tour_type)?.label || tour.tour_type;
            const summary = bookingSummary[tour.id];
            const services = (tour.tour_service_options || []).filter((s) => s.is_active);
            const included = services.filter((s) => s.is_included);
            const optional = services.filter((s) => !s.is_included);

            return (
              <div
                key={tour.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${
                  !tour.is_active ? "opacity-60 border-slate-200" : "border-slate-200"
                }`}
              >
                {/* Cover Photo or Card Header */}
                {tour.cover_photo ? (
                  <div className="relative h-36 overflow-hidden">
                    <img
                      src={tour.cover_photo}
                      alt={tour.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-white text-lg leading-tight">{tour.name}</h3>
                          <span className="text-white/80 text-xs">{typeLabel}</span>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => openEditDialog(tour)} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(tour.id)} className="p-1.5 rounded-lg bg-white/20 hover:bg-red-500/50 text-white transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                          <TypeIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-lg leading-tight">{tour.name}</h3>
                          <span className="text-emerald-100 text-xs">{typeLabel}</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openEditDialog(tour)} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(tour.id)} className="p-1.5 rounded-lg bg-white/20 hover:bg-red-500/50 text-white transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Card Body */}
                <div className="p-4 space-y-3">
                  {tour.route && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <span className="text-sm text-slate-600 line-clamp-2">{tour.route}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-700 font-medium">{tour.capacity} kişi</span>
                    </div>
                    {tour.departure_time && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-700">
                          {tour.departure_time}{tour.return_time ? ` - ${tour.return_time}` : ""}
                        </span>
                      </div>
                    )}
                    {tour.price_per_person && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-700 font-medium">
                          {tour.price_per_person} {tour.currency || "₺"}/kişi
                        </span>
                      </div>
                    )}
                    {tour.vehicle_type && (
                      <div className="flex items-center gap-2">
                        <Ship className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-700">{tour.vehicle_type}</span>
                      </div>
                    )}
                  </div>

                  {/* Aktif Günler */}
                  <div className="flex gap-1">
                    {DAY_OPTIONS.map((d) => (
                      <span
                        key={d.key}
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          tour.available_days?.includes(d.key)
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {d.label}
                      </span>
                    ))}
                  </div>

                  {/* Ödeme badge'leri */}
                  {(tour.accepts_credit_card || tour.accepts_cash || tour.accepts_bank_transfer) && (
                    <div className="flex flex-wrap gap-1.5">
                      {tour.accepts_credit_card && (
                        <span className="flex items-center gap-1 text-[10px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100">
                          <CreditCard className="w-3 h-3" /> Kredi Kartı
                        </span>
                      )}
                      {tour.accepts_cash && (
                        <span className="flex items-center gap-1 text-[10px] font-medium bg-green-50 text-green-700 px-2 py-0.5 rounded-md border border-green-100">
                          <Banknote className="w-3 h-3" /> Nakit
                        </span>
                      )}
                      {tour.accepts_bank_transfer && (
                        <span className="flex items-center gap-1 text-[10px] font-medium bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md border border-purple-100">
                          <Building2 className="w-3 h-3" /> Havale
                        </span>
                      )}
                      {tour.requires_deposit && (
                        <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md border border-amber-100">
                          💰 Kaparo: {tour.deposit_amount} {tour.currency || "₺"}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Galeri Linki */}
                  {tour.gallery_url && (
                    <a href={tour.gallery_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700">
                      <ExternalLink className="w-3.5 h-3.5" /> Fotoğraf Galerisi
                    </a>
                  )}

                  {/* Hizmetler */}
                  {(included.length > 0 || optional.length > 0) && (
                    <div className="text-xs space-y-0.5">
                      {included.length > 0 && (
                        <p className="text-emerald-600">✅ {included.map((s) => s.name).join(", ")}</p>
                      )}
                      {optional.length > 0 && (
                        <p className="text-slate-500">
                          💰 {optional.map((s) => `${s.name} (+${s.price}₺)`).join(", ")}
                        </p>
                      )}
                    </div>
                  )}

                  {/* 30 Günlük Özet */}
                  {summary && (
                    <div className="bg-emerald-50 rounded-lg px-3 py-2 text-xs text-emerald-800">
                      📊 Son 30 gün: {summary.bookingCount} rezervasyon, {summary.totalGuests} kişi
                    </div>
                  )}

                  {!tour.is_active && (
                    <div className="bg-red-50 rounded-lg px-3 py-1.5 text-xs text-red-600 font-medium">
                      ⛔ Pasif
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="px-4 pb-4">
                  <Link
                    href={`/panel/tours/${tour.id}`}
                    className="flex items-center justify-center w-full py-2 rounded-xl bg-slate-50 hover:bg-emerald-50 text-sm font-medium text-slate-700 hover:text-emerald-700 transition-colors gap-1"
                  >
                    <CalendarIcon className="w-4 h-4" />
                    Rezervasyonları Gör
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Tour Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowDialog(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dialog Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  {editingTour ? "Turu Düzenle" : "Yeni Tur Ekle"}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingTour ? "Tur bilgilerini güncelleyin." : "Yeni bir tur ekleyin. AI asistanınız otomatik olarak bu turu bilecektir."}
                </p>
              </div>
              <button onClick={() => setShowDialog(false)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Dialog Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Tur Tipi */}
              <div>
                <Label className="text-sm font-medium">Tur Tipi</Label>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {TOUR_TYPE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setField("tour_type", opt.value)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                          form.tour_type === opt.value
                            ? "border-emerald-400 bg-emerald-50 text-emerald-700 font-medium"
                            : "border-slate-200 hover:border-emerald-300 text-slate-600"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tur Adı ve Araç Tipi */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Tur Adı <span className="text-red-500">*</span></Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    placeholder="Örn: Göcek 6 Koy Turu"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">Araç Tipi</Label>
                  <Input
                    value={form.vehicle_type}
                    onChange={(e) => setField("vehicle_type", e.target.value)}
                    placeholder="Tekne, Otobüs, Minibüs, ATV, Motor, Bisiklet.."
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Açıklama */}
              <div>
                <Label className="text-sm">Açıklama</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder="Tur hakkında detaylı açıklama..."
                  className="mt-1 min-h-[60px]"
                />
              </div>

              {/* Kapak Fotoğrafı & Galeri URL */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm flex items-center gap-1.5"><Image className="w-3.5 h-3.5" /> Kapak Fotoğrafı</Label>
                  {/* Görüntü Önizleme */}
                  {(form.cover_photo || coverPreview) ? (
                    <div className="mt-1 relative group">
                      <img
                        src={coverPreview || form.cover_photo}
                        alt="Kapak"
                        className="w-full h-28 object-cover rounded-lg border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (editingTour && form.cover_photo) {
                            startTransition(async () => {
                              await deleteTourCoverPhoto(editingTour.id, tenantId);
                              setField("cover_photo", "");
                              setCoverPreview(null);
                              toast({ title: "Silindi", description: "Kapak fotoğrafı kaldırıldı." });
                            });
                          } else {
                            setField("cover_photo", "");
                            setCoverPreview(null);
                            setCoverFile(null);
                          }
                        }}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="mt-1 flex flex-col items-center justify-center h-28 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-all">
                      <Upload className="w-5 h-5 text-slate-400 mb-1" />
                      <span className="text-xs text-slate-500">Tıklayın veya sürükleyin</span>
                      <span className="text-[10px] text-slate-400">Max 5MB (JPG, PNG, WebP)</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setCoverFile(file);
                          setCoverPreview(URL.createObjectURL(file));
                        }}
                      />
                    </label>
                  )}
                </div>
                <div>
                  <Label className="text-sm flex items-center gap-1.5"><ExternalLink className="w-3.5 h-3.5" /> Galeri / Web Sayfası URL</Label>
                  <Input
                    value={form.gallery_url}
                    onChange={(e) => setField("gallery_url", e.target.value)}
                    placeholder="https://ornek.com/tur-galeri"
                    className="mt-1"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">AI asistan &ldquo;Tüm fotoğraflar için&rdquo; bu linki paylaşacaktır.</p>
                </div>
              </div>

              {/* Rota ve Konum */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Rota / Güzergah</Label>
                  <Input
                    value={form.route}
                    onChange={(e) => setField("route", e.target.value)}
                    placeholder="Örn: Tersane → Yassıca → Kızılada"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">Kalkış Noktası</Label>
                  <Input
                    value={form.departure_point}
                    onChange={(e) => setField("departure_point", e.target.value)}
                    placeholder="Örn: Fethiye Limanı"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Kapasite & Fiyat */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm">Kapasite (kişi) <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    value={form.capacity}
                    onChange={(e) => setField("capacity", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">Yetişkin Fiyatı (₺)</Label>
                  <Input
                    type="number"
                    value={form.price_per_person}
                    onChange={(e) => setField("price_per_person", e.target.value)}
                    placeholder="500"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">Çocuk Fiyatı (₺)</Label>
                  <Input
                    type="number"
                    value={form.child_price}
                    onChange={(e) => setField("child_price", e.target.value)}
                    placeholder="Boş = çocuk fiyatı yok"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* ─── ÖDEME BİLGİLERİ ─── */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-4 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <Label className="text-sm font-semibold text-slate-800">Ödeme Bilgileri</Label>
                </div>

                {/* Kabul edilen yöntemler */}
                <div>
                  <p className="text-xs text-slate-500 mb-2">Kabul edilen ödeme yöntemleri</p>
                  <div className="flex flex-wrap gap-2">
                    <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-all ${
                      form.accepts_credit_card ? "border-blue-400 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:border-blue-300"
                    }`}>
                      <input type="checkbox" checked={form.accepts_credit_card} onChange={(e) => setField("accepts_credit_card", e.target.checked)} className="sr-only" />
                      <CreditCard className="w-4 h-4" /> Kredi Kartı
                    </label>
                    <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-all ${
                      form.accepts_cash ? "border-green-400 bg-green-50 text-green-700" : "border-slate-200 text-slate-600 hover:border-green-300"
                    }`}>
                      <input type="checkbox" checked={form.accepts_cash} onChange={(e) => setField("accepts_cash", e.target.checked)} className="sr-only" />
                      <Banknote className="w-4 h-4" /> Nakit
                    </label>
                    <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-all ${
                      form.accepts_bank_transfer ? "border-purple-400 bg-purple-50 text-purple-700" : "border-slate-200 text-slate-600 hover:border-purple-300"
                    }`}>
                      <input type="checkbox" checked={form.accepts_bank_transfer} onChange={(e) => setField("accepts_bank_transfer", e.target.checked)} className="sr-only" />
                      <Building2 className="w-4 h-4" /> Banka Havalesi
                    </label>
                  </div>
                </div>

                {/* Ön Ödeme / Kaparo */}
                <div className="space-y-2">
                  <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-all ${
                    form.requires_deposit ? "border-amber-400 bg-amber-50 text-amber-700" : "border-slate-200 text-slate-600"
                  }`}>
                    <input type="checkbox" checked={form.requires_deposit} onChange={(e) => setField("requires_deposit", e.target.checked)} className="sr-only" />
                    <DollarSign className="w-4 h-4" /> Ön Ödeme / Kaparo Alınıyor
                  </label>
                  {form.requires_deposit && (
                    <div className="pl-6">
                      <Label className="text-xs">Kaparo Tutarı (₺)</Label>
                      <Input
                        type="number"
                        value={form.deposit_amount}
                        onChange={(e) => setField("deposit_amount", e.target.value)}
                        placeholder="Örn: 500"
                        className="mt-1 w-48"
                      />
                    </div>
                  )}
                </div>

                {/* IBAN Yönetimi (Banka havalesi seçiliyse) */}
                {form.accepts_bank_transfer && (
                  <div className="space-y-2 border-t border-slate-200 pt-3">
                    <p className="text-xs font-medium text-slate-700">IBAN / Banka Hesapları</p>
                    <p className="text-[10px] text-slate-500">AI asistan banka havalesi isteyen müşterilere seçili IBAN bilgilerini iletecektir.</p>

                    {bankAccounts.length > 0 && (
                      <div className="space-y-1.5">
                        {bankAccounts.map((acc) => (
                          <label
                            key={acc.id}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm cursor-pointer transition-all ${
                              form.selected_iban_ids?.includes(acc.id)
                                ? "border-purple-400 bg-purple-50 ring-1 ring-purple-200"
                                : "border-slate-200 hover:border-purple-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={form.selected_iban_ids?.includes(acc.id)}
                              onChange={() => toggleIbanSelection(acc.id)}
                              className="w-4 h-4 rounded border-slate-300 text-purple-600"
                            />
                            <div>
                              <span className="font-medium text-slate-800">{acc.bank_name}</span>
                              <span className="text-slate-500 ml-2 text-xs font-mono">{acc.iban}</span>
                              {acc.account_holder && <span className="text-slate-400 ml-2 text-xs">({acc.account_holder})</span>}
                            </div>
                          </label>
                        ))}
                      </div>
                    )}

                    {!showAddIban ? (
                      <button
                        type="button"
                        onClick={() => setShowAddIban(true)}
                        className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-700 font-medium mt-2"
                      >
                        <Plus className="w-3.5 h-3.5" /> Yeni IBAN Ekle
                      </button>
                    ) : (
                      <div className="bg-white border border-purple-200 rounded-lg p-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            value={newIban.bank_name}
                            onChange={(e) => setNewIban({ ...newIban, bank_name: e.target.value })}
                            placeholder="Banka Adı"
                            className="text-sm"
                          />
                          <Input
                            value={newIban.account_holder}
                            onChange={(e) => setNewIban({ ...newIban, account_holder: e.target.value })}
                            placeholder="Hesap Sahibi (opsiyonel)"
                            className="text-sm"
                          />
                        </div>
                        <Input
                          value={newIban.iban}
                          onChange={(e) => setNewIban({ ...newIban, iban: e.target.value })}
                          placeholder="TR00 0000 0000 0000 0000 0000 00"
                          className="text-sm font-mono"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleAddBankAccount} disabled={isPending} className="bg-purple-600 text-white hover:bg-purple-700 text-xs">
                            <Plus className="w-3 h-3 mr-1" /> Ekle & Seç
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setShowAddIban(false)} className="text-xs">İptal</Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Ödeme Şartları */}
                <div>
                  <Label className="text-xs">Ödeme Şartları / Bilgilendirme</Label>
                  <Textarea
                    value={form.payment_terms}
                    onChange={(e) => setField("payment_terms", e.target.value)}
                    placeholder="Örn: Ödeme tur günü nakit veya kredi kartı ile yapılabilir. Kaparo banka havalesi ile 24 saat içinde yatırılmalıdır."
                    className="mt-1 min-h-[50px] text-sm"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">AI asistan bu bilgiyi müşteriye iletecektir.</p>
                </div>
              </div>

              {/* Saatler */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Kalkış Saati</Label>
                  <Input
                    type="time"
                    value={form.departure_time}
                    onChange={(e) => setField("departure_time", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">Dönüş Saati</Label>
                  <Input
                    type="time"
                    value={form.return_time}
                    onChange={(e) => setField("return_time", e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Aktif Günler */}
              <div>
                <Label className="text-sm">Varsayılan Aktif Günler</Label>
                <p className="text-xs text-slate-500 mb-2">Tur hangi günler düzenli olarak aktif? Özel tarihler için tur detay sayfasından override ekleyebilirsiniz.</p>
                <div className="flex gap-2">
                  {DAY_OPTIONS.map((d) => (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => toggleDay(d.key)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        form.available_days?.includes(d.key)
                          ? "bg-emerald-500 text-white shadow-sm"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sezon */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Sezon Başlangıcı</Label>
                  <Input type="date" value={form.season_start} onChange={(e) => setField("season_start", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm">Sezon Bitişi</Label>
                  <Input type="date" value={form.season_end} onChange={(e) => setField("season_end", e.target.value)} className="mt-1" />
                </div>
              </div>

              {/* İptal & Ek Notlar */}
              <div>
                <Label className="text-sm">İptal Koşulları</Label>
                <Textarea value={form.cancellation_policy} onChange={(e) => setField("cancellation_policy", e.target.value)} placeholder="Örn: 24 saat öncesinden iptal ücretsiz..." className="mt-1 min-h-[50px]" />
              </div>
              <div>
                <Label className="text-sm">Ek Notlar</Label>
                <Textarea value={form.extra_info} onChange={(e) => setField("extra_info", e.target.value)} placeholder="AI asistanın bu tur hakkında bilmesi gereken ek bilgiler..." className="mt-1 min-h-[50px]" />
              </div>

              {/* Aktif/Pasif */}
              <div className="flex items-center gap-3 bg-slate-50 rounded-lg px-4 py-3">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setField("is_active", e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-slate-700">Tur Aktif</p>
                  <p className="text-xs text-slate-500">Pasif turlar müşterilere sunulmaz ve AI tarafından önerilmez.</p>
                </div>
              </div>

              {/* Hizmet Seçenekleri (sadece düzenlemede) */}
              {editingTour && (
                <div className="border-t pt-4">
                  <Label className="text-sm font-medium">Hizmet Seçenekleri</Label>
                  <p className="text-xs text-slate-500 mb-3">Dahil veya opsiyonel hizmetler ekleyin.</p>

                  {editingTour.tour_service_options?.length > 0 && (
                    <div className="space-y-1.5 mb-3">
                      {editingTour.tour_service_options.filter((s) => s.is_active).map((svc) => (
                        <div key={svc.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm">
                          <div className="flex items-center gap-2">
                            {svc.is_included ? (
                              <span className="text-emerald-600 text-xs font-semibold">✅ Dahil</span>
                            ) : (
                              <span className="text-orange-600 text-xs font-semibold">💰 +{svc.price}₺</span>
                            )}
                            <span className="text-slate-700">{svc.name}</span>
                          </div>
                          <button onClick={() => handleDeleteService(editingTour.id, svc.id)} className="text-red-400 hover:text-red-600 p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Input value={newServiceName} onChange={(e) => setNewServiceName(e.target.value)} placeholder="Hizmet adı (Öğle Yemeği, İçecek Paketi...)" className="text-sm" />
                    </div>
                    <Input type="number" value={newServicePrice} onChange={(e) => setNewServicePrice(e.target.value)} placeholder="Fiyat" className="w-24 text-sm" />
                    <label className="flex items-center gap-1 text-xs text-slate-600 whitespace-nowrap cursor-pointer">
                      <input type="checkbox" checked={newServiceIncluded} onChange={(e) => setNewServiceIncluded(e.target.checked)} className="w-3.5 h-3.5" />
                      Dahil
                    </label>
                    <Button size="sm" onClick={() => handleAddService(editingTour.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isPending}>
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div className="flex gap-2 items-start bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800">
                      Hizmet seçeneklerini ekledikten sonra dialog&apos;u kapatıp yeniden açtığınızda güncel listeyi göreceksiniz.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Dialog Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
              <Button variant="outline" onClick={() => setShowDialog(false)}>İptal</Button>
              <Button onClick={handleSave} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                {editingTour ? "Güncelle" : "Oluştur"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
