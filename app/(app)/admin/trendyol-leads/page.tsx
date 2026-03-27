"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { saveDiscoveredLeads } from "@/app/(app)/admin/leads/actions";
import {
    Search, ShoppingBag, Phone, Globe, ExternalLink,
    CheckCircle2, Loader2, AlertCircle, Star, MapPin,
    Package, Tag, Shirt, Sparkles, Home, Dumbbell,
    Baby, ShoppingCart, BookOpen, Mail, X
} from "lucide-react";

interface TrendyolSeller {
    sellerId: string;
    sellerName: string;
    storeUrl: string;
    phone?: string | null;
    website?: string | null;
    address?: string | null;
    google_place_id?: string | null;
    google_maps_url?: string | null;
    google_rating?: number | null;
    google_review_count?: number | null;
    email_missing?: boolean;
    selected?: boolean;
}

const CATEGORIES = [
    { key: "elektronik", label: "Elektronik", icon: Package, color: "from-blue-500 to-indigo-600" },
    { key: "giyim", label: "Giyim", icon: Shirt, color: "from-pink-500 to-rose-600" },
    { key: "kozmetik", label: "Kozmetik & Kişisel Bakım", icon: Sparkles, color: "from-purple-500 to-violet-600" },
    { key: "ev-yasam", label: "Ev & Yaşam", icon: Home, color: "from-amber-500 to-orange-600" },
    { key: "spor", label: "Spor & Outdoor", icon: Dumbbell, color: "from-green-500 to-emerald-600" },
    { key: "anne-bebek", label: "Anne & Bebek", icon: Baby, color: "from-cyan-500 to-teal-600" },
    { key: "gida", label: "Süpermarket & Gıda", icon: ShoppingCart, color: "from-red-500 to-rose-600" },
    { key: "kitap", label: "Kitap & Kırtasiye", icon: BookOpen, color: "from-slate-500 to-slate-700" },
];

export default function TrendyolLeadsPage() {
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [customQuery, setCustomQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<TrendyolSeller[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveResult, setSaveResult] = useState<any>(null);
    const [listName, setListName] = useState("");
    const [enriching, setEnriching] = useState(false);
    const [enrichResult, setEnrichResult] = useState<any>(null);
    const [enrichProgress, setEnrichProgress] = useState("");
    const [searchMode, setSearchMode] = useState<"category" | "custom">("category");
    const [categoryLabel, setCategoryLabel] = useState("");

    const handleSearch = async () => {
        const category = searchMode === "custom" ? "custom" : selectedCategory;
        if (searchMode === "category" && !selectedCategory) return;
        if (searchMode === "custom" && !customQuery.trim()) return;

        setLoading(true);
        setError(null);
        setResults([]);
        setSaveResult(null);
        setEnrichResult(null);

        try {
            const res = await fetch("/api/leads/trendyol-discover", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    category,
                    customQuery: searchMode === "custom" ? customQuery.trim() : undefined,
                    enrich: true
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setResults(data.sellers.map((s: any) => ({ ...s, selected: true })));
            setCategoryLabel(data.category || "");
            setListName(`Trendyol - ${data.category || customQuery}`);
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
        if (selected.length === 0 || !listName.trim()) return;

        setSaving(true);
        setSaveResult(null);

        try {
            const leadsToSave = selected.map(s => ({
                google_place_id: s.google_place_id || `trendyol-${s.sellerId}`,
                business_name: s.sellerName,
                address: s.address || "Trendyol Mağaza",
                phone: s.phone || null,
                website: s.website || s.storeUrl,
                google_maps_url: s.google_maps_url || null,
                google_rating: s.google_rating || null,
                google_review_count: s.google_review_count || null,
                google_business_status: "OPERATIONAL",
                working_hours: null,
                lat: null,
                lng: null,
                city: "Trendyol",
                district: categoryLabel || null,
                sector_id: null,
                sector_name: "Trendyol E-Ticaret",
                email_missing: true
            }));

            const result = await saveDiscoveredLeads(
                leadsToSave,
                listName.trim(),
                {
                    sectorId: undefined,
                    sectorName: "Trendyol E-Ticaret",
                    city: "Trendyol",
                    district: categoryLabel || undefined
                }
            );
            setSaveResult(result);
        } catch (err: any) {
            setSaveResult({ error: err.message });
        } finally {
            setSaving(false);
        }
    };

    const handleEnrich = async () => {
        setEnriching(true);
        setEnrichProgress("Website'ler taranıyor, e-postalar aranıyor...");
        try {
            const supabase = createClient();
            const selected = results.filter(r => r.selected && (r.website || r.storeUrl));
            const placeIds = selected.map(s => s.google_place_id || `trendyol-${s.sellerId}`).filter(Boolean);

            if (placeIds.length === 0) {
                setEnrichResult({ summary: { found: 0, not_found: 0, no_website: results.filter(r => r.selected).length } });
                setEnriching(false);
                return;
            }

            const { data: savedLeads } = await supabase
                .from("leads")
                .select("id, google_place_id")
                .in("google_place_id", placeIds);

            if (!savedLeads || savedLeads.length === 0) {
                setEnrichResult({ summary: { found: 0, not_found: 0, no_website: 0 } });
                setEnriching(false);
                return;
            }

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
    };

    const selectedCount = results.filter(r => r.selected).length;
    const hasResults = results.length > 0;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                        <ShoppingBag className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Trendyol Lead Keşfi</h1>
                        <p className="text-slate-500 text-sm">Trendyol mağazalarını keşfedin, iletişim bilgilerini bulun</p>
                    </div>
                </div>
            </div>

            {/* Search Mode Toggle */}
            {!hasResults && (
                <div className="mb-6">
                    <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
                        <button
                            onClick={() => setSearchMode("category")}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                searchMode === "category"
                                    ? "bg-white text-orange-600 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                            }`}
                        >
                            <Tag size={14} className="inline mr-1.5" />
                            Kategori ile Ara
                        </button>
                        <button
                            onClick={() => setSearchMode("custom")}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                searchMode === "custom"
                                    ? "bg-white text-orange-600 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                            }`}
                        >
                            <Search size={14} className="inline mr-1.5" />
                            Özel Arama
                        </button>
                    </div>
                </div>
            )}

            {/* Category Selection */}
            {!hasResults && searchMode === "category" && (
                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-slate-700 mb-4">Kategori Seçin</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {CATEGORIES.map(cat => {
                            const Icon = cat.icon;
                            const isSelected = selectedCategory === cat.key;
                            return (
                                <button
                                    key={cat.key}
                                    onClick={() => setSelectedCategory(isSelected ? "" : cat.key)}
                                    className={`relative p-4 rounded-2xl border-2 transition-all hover:shadow-lg hover:scale-[1.02] text-left ${
                                        isSelected
                                            ? "border-orange-500 bg-orange-50 shadow-md"
                                            : "border-slate-200 bg-white hover:border-orange-300"
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center mb-3 shadow-md`}>
                                        <Icon size={20} className="text-white" />
                                    </div>
                                    <h3 className="font-semibold text-slate-800 text-sm">{cat.label}</h3>
                                    {isSelected && (
                                        <div className="absolute top-2 right-2">
                                            <CheckCircle2 size={18} className="text-orange-500" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Custom Search */}
            {!hasResults && searchMode === "custom" && (
                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-slate-700 mb-4">Trendyol'da Arama Yapın</h2>
                    <div className="max-w-xl">
                        <input
                            type="text"
                            value={customQuery}
                            onChange={(e) => setCustomQuery(e.target.value)}
                            placeholder="Örn: bluetooth kulaklık, organik gıda, spor ayakkabı..."
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        />
                        <p className="text-xs text-slate-400 mt-2">
                            Trendyol'da satılan ürün veya kategori adı girin. Sistem o ürünleri satan mağazaları bulacaktır.
                        </p>
                    </div>
                </div>
            )}

            {/* Search Button */}
            {!hasResults && (
                <button
                    onClick={handleSearch}
                    disabled={loading || (searchMode === "category" && !selectedCategory) || (searchMode === "custom" && !customQuery.trim())}
                    className="px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-orange-500/20"
                >
                    {loading ? (
                        <>
                            <Loader2 size={20} className="animate-spin" />
                            Trendyol Taranıyor...
                        </>
                    ) : (
                        <>
                            <Search size={20} />
                            Mağazaları Keşfet
                        </>
                    )}
                </button>
            )}

            {/* Loading State */}
            {loading && (
                <div className="mt-8 text-center py-16">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 mb-4">
                        <Loader2 size={32} className="animate-spin text-orange-500" />
                    </div>
                    <p className="text-lg font-medium text-slate-700">Trendyol mağazaları taranıyor...</p>
                    <p className="text-sm text-slate-400 mt-1">Bu işlem 15-30 saniye sürebilir</p>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            {/* Results */}
            {hasResults && !loading && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-700">
                                Keşfedilen Mağazalar
                                <span className="ml-2 text-sm font-normal text-slate-400">
                                    ({results.length} mağaza bulundu)
                                </span>
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">
                                <ShoppingBag size={14} className="inline mr-1" />
                                {categoryLabel}
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
                                onClick={() => { setResults([]); setSaveResult(null); setEnrichResult(null); }}
                                className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                Yeni Tarama
                            </button>
                        </div>
                    </div>

                    {/* Seller Cards */}
                    <div className="space-y-3 mb-6">
                        {results.map((seller, idx) => (
                            <div
                                key={seller.sellerId}
                                className={`p-4 rounded-xl border-2 transition-all ${
                                    seller.selected
                                        ? "border-orange-300 bg-orange-50/50"
                                        : "border-slate-100 bg-white opacity-60"
                                }`}
                            >
                                <div className="flex items-start gap-4">
                                    <button
                                        onClick={() => toggleSelect(idx)}
                                        className={`mt-1 flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                            seller.selected
                                                ? "bg-orange-500 border-orange-500"
                                                : "border-slate-300 hover:border-orange-400"
                                        }`}
                                    >
                                        {seller.selected && <CheckCircle2 size={16} className="text-white" />}
                                    </button>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-slate-800 truncate">{seller.sellerName}</h3>
                                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-medium flex-shrink-0">
                                                    Trendyol
                                                </span>
                                            </div>
                                            {seller.google_rating && (
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    <Star size={14} className="text-amber-400 fill-amber-400" />
                                                    <span className="text-sm font-medium text-slate-600">
                                                        {seller.google_rating}
                                                    </span>
                                                    {seller.google_review_count && (
                                                        <span className="text-xs text-slate-400">
                                                            ({seller.google_review_count})
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {seller.address && (
                                            <p className="text-sm text-slate-500 mt-1 truncate flex items-center gap-1">
                                                <MapPin size={12} /> {seller.address}
                                            </p>
                                        )}

                                        <div className="flex flex-wrap items-center gap-3 mt-2">
                                            {seller.phone && (
                                                <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full font-medium">
                                                    <Phone size={12} /> {seller.phone}
                                                </span>
                                            )}
                                            {seller.website && (
                                                <a
                                                    href={seller.website}
                                                    target="_blank"
                                                    rel="noopener"
                                                    className="flex items-center gap-1 text-xs text-blue-500 hover:underline"
                                                >
                                                    <Globe size={12} /> Website
                                                </a>
                                            )}
                                            <a
                                                href={seller.storeUrl}
                                                target="_blank"
                                                rel="noopener"
                                                className="flex items-center gap-1 text-xs text-orange-500 hover:underline"
                                            >
                                                <ExternalLink size={12} /> Trendyol Mağaza
                                            </a>
                                            {seller.google_maps_url && (
                                                <a
                                                    href={seller.google_maps_url}
                                                    target="_blank"
                                                    rel="noopener"
                                                    className="flex items-center gap-1 text-xs text-blue-500 hover:underline"
                                                >
                                                    <MapPin size={12} /> Harita
                                                </a>
                                            )}
                                            {!seller.phone && !seller.website && (
                                                <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                                    <AlertCircle size={12} /> İletişim bilgisi bulunamadı
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
                        {!saveResult && (
                            <div className="mb-3 flex items-center gap-3">
                                <label className="text-sm font-medium text-slate-600 whitespace-nowrap">Liste Adı:</label>
                                <input
                                    type="text"
                                    value={listName}
                                    onChange={(e) => setListName(e.target.value)}
                                    placeholder="Örn: Trendyol - Elektronik Mağazaları"
                                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                            </div>
                        )}
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-slate-600">
                                <span className="font-semibold text-orange-600">{selectedCount}</span> / {results.length} mağaza seçili
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

                                    {saveResult.success && !enriching && !enrichResult && (
                                        <button
                                            onClick={handleEnrich}
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
                </div>
            )}
        </div>
    );
}
