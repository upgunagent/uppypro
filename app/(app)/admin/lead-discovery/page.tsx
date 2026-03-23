"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { TURKEY_LOCATIONS } from "@/lib/locations";
import { saveDiscoveredLeads } from "@/app/(app)/admin/leads/actions";
import {
    Search, MapPin, Building2, Star, Phone, Globe, ExternalLink,
    CheckCircle2, Loader2, AlertCircle, ChevronRight, X, Mail
} from "lucide-react";

interface Sector {
    id: string;
    name: string;
    slug: string;
    description: string;
    keywords: string[];
    uppypro_fit_score: number;
    uppypro_features: string[];
    icon: string;
}

interface DiscoveredLead {
    google_place_id: string;
    business_name: string;
    address: string;
    phone: string | null;
    website: string | null;
    google_maps_url: string | null;
    google_rating: number | null;
    google_review_count: number | null;
    google_business_status: string | null;
    working_hours: any;
    lat: number | null;
    lng: number | null;
    city: string;
    district: string | null;
    sector_id: string | null;
    sector_name: string | null;
    email_missing: boolean;
    selected?: boolean;
}

const FEATURE_LABELS: Record<string, string> = {
    whatsapp_randevu: "WhatsApp Randevu",
    whatsapp_siparis: "WhatsApp Sipariş",
    whatsapp_rezervasyon: "WhatsApp Rezervasyon",
    whatsapp_iletisim: "WhatsApp İletişim",
    whatsapp_uyelik: "WhatsApp Üyelik",
    whatsapp_kayit: "WhatsApp Kayıt",
    ai_asistan: "AI Asistan",
    cok_dilli_ai: "Çok Dilli AI",
    instagram_dm: "Instagram DM",
    takvim: "Takvim/Randevu",
    hazir_cevap: "Hazır Cevaplar",
    crm: "Müşteri Takibi (CRM)",
    ekip_yonetimi: "Ekip Yönetimi",
    hasta_takip: "Hasta Takibi",
    musteri_takip: "Müşteri Takibi",
    kurumsal_dil: "Kurumsal Dil",
};

export default function LeadDiscoveryPage() {
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
    const [selectedCity, setSelectedCity] = useState("");
    const [selectedDistrict, setSelectedDistrict] = useState("");
    const [step, setStep] = useState<"sector" | "location" | "results">("sector");
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<DiscoveredLead[]>([]);
    const [saving, setSaving] = useState(false);
    const [saveResult, setSaveResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [enriching, setEnriching] = useState(false);
    const [enrichResult, setEnrichResult] = useState<any>(null);
    const [enrichProgress, setEnrichProgress] = useState("");
    const [listName, setListName] = useState("");

    useEffect(() => {
        const fetchSectors = async () => {
            const supabase = createClient();
            const { data } = await supabase
                .from("lead_sectors")
                .select("*")
                .eq("is_active", true)
                .order("uppypro_fit_score", { ascending: false });
            if (data) setSectors(data);
        };
        fetchSectors();
    }, []);

    const districts = selectedCity
        ? TURKEY_LOCATIONS.find(l => l.city === selectedCity)?.districts || []
        : [];

    const handleSearch = async () => {
        if (!selectedSector || !selectedCity) return;
        setLoading(true);
        setError(null);
        setResults([]);

        try {
            const res = await fetch("/api/leads/discover", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sectorKeywords: selectedSector.keywords,
                    city: selectedCity,
                    district: selectedDistrict || undefined,
                    sectorId: selectedSector.id,
                    sectorName: selectedSector.name
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setResults(data.leads.map((l: any) => ({ ...l, selected: true })));
            setStep("results");
            // Auto-generate list name
            const autoName = `${selectedSector.name} - ${selectedCity}${selectedDistrict ? ` / ${selectedDistrict}` : ""}`;
            setListName(autoName);
        } catch (err: any) {
            setError(err.message || "Tarama sırasında bir hata oluştu");
        } finally {
            setLoading(false);
        }
    };

    const toggleSelect = (idx: number) => {
        setResults(prev => prev.map((r, i) => i === idx ? { ...r, selected: !r.selected } : r));
    };

    const toggleAll = () => {
        const allSelected = results.every(r => r.selected);
        setResults(prev => prev.map(r => ({ ...r, selected: !allSelected })));
    };

    const handleSave = async () => {
        const selected = results.filter(r => r.selected);
        if (selected.length === 0) return;
        if (!listName.trim()) return;

        setSaving(true);
        setSaveResult(null);

        try {
            const result = await saveDiscoveredLeads(
                selected,
                listName.trim(),
                {
                    sectorId: selectedSector?.id,
                    sectorName: selectedSector?.name,
                    city: selectedCity,
                    district: selectedDistrict || undefined
                }
            );
            setSaveResult(result);
        } catch (err: any) {
            setSaveResult({ error: err.message });
        } finally {
            setSaving(false);
        }
    };

    const selectedCount = results.filter(r => r.selected).length;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800">Lead Keşfi</h1>
                <p className="text-slate-500 mt-1">Sektör ve bölge seçerek potansiyel müşterileri keşfedin</p>
            </div>

            {/* Steps indicator */}
            <div className="flex items-center gap-2 mb-8">
                {[
                    { key: "sector", label: "Sektör Seçimi" },
                    { key: "location", label: "Bölge Seçimi" },
                    { key: "results", label: "Sonuçlar" }
                ].map((s, i) => (
                    <div key={s.key} className="flex items-center gap-2">
                        {i > 0 && <ChevronRight size={16} className="text-slate-300" />}
                        <button
                            onClick={() => {
                                if (s.key === "sector") setStep("sector");
                                if (s.key === "location" && selectedSector) setStep("location");
                                if (s.key === "results" && results.length > 0) setStep("results");
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                step === s.key
                                    ? "bg-orange-500 text-white shadow-md"
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            }`}
                        >
                            {s.label}
                        </button>
                    </div>
                ))}
            </div>

            {/* Step 1: Sector Selection */}
            {step === "sector" && (
                <div>
                    <h2 className="text-lg font-semibold text-slate-700 mb-4">Sektör Seçin</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sectors.map(sector => (
                            <button
                                key={sector.id}
                                onClick={() => {
                                    setSelectedSector(sector);
                                    setStep("location");
                                }}
                                className={`text-left p-5 rounded-2xl border-2 transition-all hover:shadow-lg hover:scale-[1.02] ${
                                    selectedSector?.id === sector.id
                                        ? "border-orange-500 bg-orange-50 shadow-md"
                                        : "border-slate-200 bg-white hover:border-orange-300"
                                }`}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="font-semibold text-slate-800">{sector.name}</h3>
                                    <div className="flex gap-0.5">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <Star
                                                key={i}
                                                size={14}
                                                className={i < sector.uppypro_fit_score ? "text-orange-400 fill-orange-400" : "text-slate-200"}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <p className="text-sm text-slate-500 mb-3">{sector.description}</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {sector.uppypro_features?.slice(0, 4).map(f => (
                                        <span key={f} className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">
                                            {FEATURE_LABELS[f] || f}
                                        </span>
                                    ))}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 2: Location Selection */}
            {step === "location" && selectedSector && (
                <div>
                    <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
                        <Building2 className="text-orange-500" size={24} />
                        <div>
                            <span className="font-semibold text-orange-800">{selectedSector.name}</span>
                            <span className="text-orange-600 text-sm ml-2">sektöründe arama yapılacak</span>
                        </div>
                        <button onClick={() => setStep("sector")} className="ml-auto text-orange-400 hover:text-orange-600">
                            <X size={18} />
                        </button>
                    </div>

                    <h2 className="text-lg font-semibold text-slate-700 mb-4">Bölge Seçin</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">
                                <MapPin size={14} className="inline mr-1" /> İl *
                            </label>
                            <select
                                value={selectedCity}
                                onChange={(e) => {
                                    setSelectedCity(e.target.value);
                                    setSelectedDistrict("");
                                }}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                            >
                                <option value="">İl seçin...</option>
                                {TURKEY_LOCATIONS.map(loc => (
                                    <option key={loc.city} value={loc.city}>{loc.city}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">
                                <MapPin size={14} className="inline mr-1" /> İlçe (Opsiyonel)
                            </label>
                            <select
                                value={selectedDistrict}
                                onChange={(e) => setSelectedDistrict(e.target.value)}
                                disabled={!selectedCity}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none disabled:opacity-50"
                            >
                                <option value="">Tümü</option>
                                {districts.map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <button
                        onClick={handleSearch}
                        disabled={!selectedCity || loading}
                        className="mt-6 px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-orange-500/20"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                Taranıyor...
                            </>
                        ) : (
                            <>
                                <Search size={20} />
                                İşletmeleri Tara
                            </>
                        )}
                    </button>

                    {error && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}
                </div>
            )}

            {/* Step 3: Results */}
            {step === "results" && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-700">
                                Tarama Sonuçları
                                <span className="ml-2 text-sm font-normal text-slate-400">
                                    ({results.length} işletme bulundu)
                                </span>
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">
                                {selectedSector?.name} • {selectedCity}{selectedDistrict ? ` / ${selectedDistrict}` : ""}
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={toggleAll}
                                className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                {results.every(r => r.selected) ? "Seçimi Kaldır" : "Tümünü Seç"}
                            </button>
                            <button
                                onClick={() => { setStep("location"); setResults([]); }}
                                className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                Yeni Tarama
                            </button>
                        </div>
                    </div>

                    {results.length === 0 ? (
                        <div className="text-center py-16 text-slate-400">
                            <Search size={48} className="mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">Sonuç bulunamadı</p>
                            <p className="text-sm">Farklı bir bölge veya sektör deneyin</p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-3 mb-6">
                                {results.map((lead, idx) => (
                                    <div
                                        key={lead.google_place_id || idx}
                                        className={`p-4 rounded-xl border-2 transition-all ${
                                            lead.selected
                                                ? "border-orange-300 bg-orange-50/50"
                                                : "border-slate-100 bg-white opacity-60"
                                        }`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <button
                                                onClick={() => toggleSelect(idx)}
                                                className={`mt-1 flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                                    lead.selected
                                                        ? "bg-orange-500 border-orange-500"
                                                        : "border-slate-300 hover:border-orange-400"
                                                }`}
                                            >
                                                {lead.selected && <CheckCircle2 size={16} className="text-white" />}
                                            </button>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h3 className="font-semibold text-slate-800 truncate">{lead.business_name}</h3>
                                                    {lead.google_rating && (
                                                        <div className="flex items-center gap-1 flex-shrink-0">
                                                            <Star size={14} className="text-amber-400 fill-amber-400" />
                                                            <span className="text-sm font-medium text-slate-600">
                                                                {lead.google_rating}
                                                            </span>
                                                            {lead.google_review_count && (
                                                                <span className="text-xs text-slate-400">
                                                                    ({lead.google_review_count})
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                <p className="text-sm text-slate-500 mt-1 truncate">{lead.address}</p>

                                                <div className="flex flex-wrap items-center gap-3 mt-2">
                                                    {lead.phone && (
                                                        <span className="flex items-center gap-1 text-xs text-slate-500">
                                                            <Phone size={12} /> {lead.phone}
                                                        </span>
                                                    )}
                                                    {lead.website && (
                                                        <a
                                                            href={lead.website}
                                                            target="_blank"
                                                            rel="noopener"
                                                            className="flex items-center gap-1 text-xs text-blue-500 hover:underline"
                                                        >
                                                            <Globe size={12} /> Website
                                                        </a>
                                                    )}
                                                    {lead.google_maps_url && (
                                                        <a
                                                            href={lead.google_maps_url}
                                                            target="_blank"
                                                            rel="noopener"
                                                            className="flex items-center gap-1 text-xs text-blue-500 hover:underline"
                                                        >
                                                            <ExternalLink size={12} /> Harita
                                                        </a>
                                                    )}
                                                    {lead.email_missing && (
                                                        <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                                            <Mail size={12} /> E-posta eksik
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Save bar */}
                            <div className="sticky bottom-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-xl">
                                {/* List name input */}
                                {!saveResult && (
                                    <div className="mb-3 flex items-center gap-3">
                                        <label className="text-sm font-medium text-slate-600 whitespace-nowrap">Liste Adı:</label>
                                        <input
                                            type="text"
                                            value={listName}
                                            onChange={(e) => setListName(e.target.value)}
                                            placeholder="Örn: Güzellik Salonları - İstanbul Beşiktaş"
                                            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                                        />
                                    </div>
                                )}
                                <div className="flex items-center justify-between">
                                <div className="text-sm text-slate-600">
                                    <span className="font-semibold text-orange-600">{selectedCount}</span> / {results.length} işletme seçili
                                </div>

                                {saveResult ? (
                                    <div className="flex items-center gap-3">
                                        {saveResult.error ? (
                                            <span className="text-red-600 text-sm">{saveResult.error}</span>
                                        ) : enrichResult ? (
                                            <span className="text-green-600 text-sm">
                                                ✅ {saveResult.savedCount} kaydedildi •
                                                📧 {enrichResult.summary?.found || 0} e-posta bulundu,
                                                {" "}{enrichResult.summary?.not_found || 0} bulunamadı
                                                {enrichResult.summary?.no_website > 0 && `, ${enrichResult.summary.no_website} website'siz`}
                                            </span>
                                        ) : enriching ? (
                                            <span className="text-blue-600 text-sm flex items-center gap-2">
                                                <Loader2 size={14} className="animate-spin" />
                                                {enrichProgress || "E-postalar taranıyor..."}
                                            </span>
                                        ) : (
                                            <span className="text-green-600 text-sm">
                                                ✅ {saveResult.savedCount} kaydedildi
                                                {saveResult.skippedCount > 0 && `, ${saveResult.skippedCount} zaten mevcut`}
                                            </span>
                                        )}

                                        {/* Email Enrichment Button - show after save, before enrich */}
                                        {saveResult.success && !enriching && !enrichResult && (
                                            <button
                                                onClick={async () => {
                                                    setEnriching(true);
                                                    setEnrichProgress("Website'ler taranıyor, e-postalar aranıyor...");
                                                    try {
                                                        // Get lead IDs that were just saved (have website)
                                                        const supabase = (await import("@/lib/supabase/client")).createClient();
                                                        const selected = results.filter(r => r.selected && r.website);
                                                        const placeIds = selected.map(s => s.google_place_id).filter(Boolean);

                                                        if (placeIds.length === 0) {
                                                            setEnrichResult({ summary: { found: 0, not_found: 0, no_website: results.filter(r => r.selected).length } });
                                                            setEnriching(false);
                                                            return;
                                                        }

                                                        // Get saved lead IDs by google_place_id
                                                        const { data: savedLeads } = await supabase
                                                            .from("leads")
                                                            .select("id, google_place_id")
                                                            .in("google_place_id", placeIds);

                                                        if (!savedLeads || savedLeads.length === 0) {
                                                            setEnrichResult({ summary: { found: 0, not_found: 0, no_website: 0 } });
                                                            setEnriching(false);
                                                            return;
                                                        }

                                                        // Enrich in batches of 10
                                                        const leadIds = savedLeads.map((l: any) => l.id);
                                                        let totalResult: any = { summary: { found: 0, not_found: 0, no_website: 0, already_has: 0 } };

                                                        for (let i = 0; i < leadIds.length; i += 10) {
                                                            const batch = leadIds.slice(i, i + 10);
                                                            setEnrichProgress(`E-postalar taranıyor... (${i + 1}-${Math.min(i + 10, leadIds.length)} / ${leadIds.length})`);

                                                            const res = await fetch("/api/leads/enrich", {
                                                                method: "POST",
                                                                headers: { "Content-Type": "application/json" },
                                                                body: JSON.stringify({ leadIds: batch })
                                                            });
                                                            const data = await res.json();
                                                            if (data.summary) {
                                                                totalResult.summary.found += data.summary.found || 0;
                                                                totalResult.summary.not_found += data.summary.not_found || 0;
                                                                totalResult.summary.no_website += data.summary.no_website || 0;
                                                                totalResult.summary.already_has += data.summary.already_has || 0;
                                                            }
                                                        }

                                                        setEnrichResult(totalResult);
                                                    } catch (err: any) {
                                                        setEnrichResult({ error: err.message });
                                                    } finally {
                                                        setEnriching(false);
                                                    }
                                                }}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                                            >
                                                <Mail size={16} />
                                                📧 E-posta Tara
                                            </button>
                                        )}

                                        <a
                                            href="/admin/leads"
                                            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
                                        >
                                            Lead Listesine Git →
                                        </a>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleSave}
                                        disabled={selectedCount === 0 || saving || !listName.trim()}
                                        className="px-6 py-2.5 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-orange-500/20"
                                    >
                                        {saving ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" />
                                                Kaydediliyor...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 size={18} />
                                                {selectedCount} Lead Kaydet
                                            </>
                                        )}
                                    </button>
                                )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
