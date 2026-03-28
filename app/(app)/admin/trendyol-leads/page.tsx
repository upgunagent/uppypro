"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { saveDiscoveredLeads } from "@/app/(app)/admin/leads/actions";
import {
    Search, ShoppingBag, Phone, Globe, ExternalLink,
    CheckCircle2, Loader2, AlertCircle, Star, MapPin,
    Mail, ArrowRight, Info, Zap, Monitor, Trash2,
    RefreshCw, Filter
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
    enriched?: boolean;
}

const CATEGORIES = [
    { key: "kadin-giyim", label: "Kadın Giyim", icon: "👗" },
    { key: "erkek-giyim", label: "Erkek Giyim", icon: "👔" },
    { key: "elektronik", label: "Elektronik", icon: "📱" },
    { key: "kozmetik", label: "Kozmetik", icon: "💄" },
    { key: "ev-yasam", label: "Ev & Yaşam", icon: "🏠" },
    { key: "ayakkabi-canta", label: "Ayakkabı & Çanta", icon: "👟" },
    { key: "spor-outdoor", label: "Spor & Outdoor", icon: "🏋️" },
    { key: "anne-bebek", label: "Anne & Bebek", icon: "👶" },
    { key: "saat-aksesuar", label: "Saat & Aksesuar", icon: "⌚" },
    { key: "supermarket", label: "Süpermarket", icon: "🛒" },
];

export default function TrendyolLeadsPage() {
    const [selectedCategory, setSelectedCategory] = useState("");
    const [customUrl, setCustomUrl] = useState("");
    const [maxPages, setMaxPages] = useState(5);
    const [results, setResults] = useState<TrendyolSeller[]>([]);
    const [loading, setLoading] = useState(false);
    const [crawlProgress, setCrawlProgress] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveResult, setSaveResult] = useState<any>(null);
    const [listName, setListName] = useState("");
    const [enriching, setEnriching] = useState(false);
    const [enrichProgress, setEnrichProgress] = useState("");
    const [categoryLabel, setCategoryLabel] = useState("");
    const [step, setStep] = useState<"crawl" | "results" | "enriched">("crawl");
    const [enrichedResults, setEnrichedResults] = useState<TrendyolSeller[]>([]);
    const [enrichResult, setEnrichResult] = useState<any>(null);

    // Start Puppeteer crawl
    const startCrawl = async () => {
        if (!selectedCategory && !customUrl.trim()) return;

        setLoading(true);
        setError(null);
        setResults([]);
        setSaveResult(null);
        setEnrichResult(null);
        setEnrichedResults([]);
        setCrawlProgress("Tarayıcı başlatılıyor...");

        try {
            const res = await fetch("/api/leads/trendyol-crawl", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    category: customUrl.trim() ? "custom" : selectedCategory,
                    customUrl: customUrl.trim() || undefined,
                    maxPages
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setResults(data.sellers.map((s: any) => ({ ...s, selected: true })));
            setCategoryLabel(data.category || "Trendyol");
            setListName(`Trendyol ${data.category || "Lead"} - ${new Date().toLocaleDateString('tr-TR')}`);
            setStep("results");
            setCrawlProgress("");
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

    const removeItem = (idx: number) => {
        setResults(prev => prev.filter((_, i) => i !== idx));
    };

    // Save selected sellers to leads DB
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
                website: s.website || s.storeUrl || null,
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

    // Google Places enrichment for selected sellers
    const handleGoogleEnrich = async () => {
        const selected = results.filter(r => r.selected);
        if (selected.length === 0) return;

        setEnriching(true);
        setEnrichProgress("");
        setEnrichedResults([]);

        try {
            // Send to enrichment endpoint
            const res = await fetch("/api/leads/trendyol-discover", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sellers: selected,
                    categoryLabel
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setEnrichedResults(data.sellers.map((s: any) => ({ ...s, selected: true })));
            setStep("enriched");
        } catch (err: any) {
            setError(err.message || "Zenginleştirme sırasında hata oluştu");
        } finally {
            setEnriching(false);
        }
    };

    // Email enrichment
    const handleEmailEnrich = async () => {
        setEnriching(true);
        setEnrichProgress("Website'ler taranıyor, e-postalar aranıyor...");
        try {
            const supabase = createClient();
            const selected = enrichedResults.filter(r => r.selected && (r.website || r.storeUrl));
            const placeIds = selected.map(s => s.google_place_id || `trendyol-${s.sellerId}`).filter(Boolean);

            if (placeIds.length === 0) {
                setEnrichResult({ summary: { found: 0, not_found: 0, no_website: enrichedResults.filter(r => r.selected).length } });
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

    const toggleEnrichedSelect = (idx: number) => {
        setEnrichedResults(prev => prev.map((r, i) => i === idx ? { ...r, selected: !r.selected } : r));
    };

    const removeEnrichedItem = (idx: number) => {
        setEnrichedResults(prev => prev.filter((_, i) => i !== idx));
    };

    const selectedCount = results.filter(r => r.selected).length;
    const enrichedSelectedCount = enrichedResults.filter(r => r.selected).length;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                        <ShoppingBag className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Trendyol Lead Keşfi</h1>
                        <p className="text-slate-500 text-sm">Trendyol mağazalarını otomatik tarayın, iletişim bilgilerini bulun</p>
                    </div>
                </div>
            </div>

            {/* Local-only warning */}
            <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                <Monitor size={18} className="text-amber-600 flex-shrink-0" />
                <p className="text-sm text-amber-700">
                    <strong>Sadece Lokal:</strong> Bu modül Puppeteer (headless browser) kullandığı için yalnızca lokal geliştirme ortamında (<code>npm run dev</code>) çalışır. Production ortamında kullanılamaz.
                </p>
            </div>

            {/* Step 1: Crawl */}
            {step === "crawl" && !loading && (
                <div>
                    {/* Category Selection */}
                    <h2 className="text-lg font-semibold text-slate-700 mb-3">Kategori Seçin</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.key}
                                onClick={() => { setSelectedCategory(cat.key); setCustomUrl(""); }}
                                className={`p-3 rounded-xl border-2 transition-all text-left ${
                                    selectedCategory === cat.key
                                        ? "border-orange-400 bg-orange-50 shadow-sm"
                                        : "border-slate-100 bg-white hover:border-slate-200"
                                }`}
                            >
                                <span className="text-xl block mb-1">{cat.icon}</span>
                                <span className="text-sm font-medium text-slate-700">{cat.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Custom URL */}
                    <div className="mb-6">
                        <h3 className="text-sm font-medium text-slate-600 mb-2">veya Özel Trendyol URL&apos;si girin:</h3>
                        <input
                            type="text"
                            value={customUrl}
                            onChange={(e) => { setCustomUrl(e.target.value); if (e.target.value) setSelectedCategory(""); }}
                            placeholder="https://www.trendyol.com/kadin-giyim-x-g1-c82"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                    </div>

                    {/* Pages setting */}
                    <div className="mb-6 flex items-center gap-4">
                        <label className="text-sm font-medium text-slate-600">Taranacak sayfa sayısı:</label>
                        <div className="flex items-center gap-2">
                            {[3, 5, 10, 15, 20].map(n => (
                                <button
                                    key={n}
                                    onClick={() => setMaxPages(n)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                        maxPages === n
                                            ? "bg-orange-500 text-white"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                        <span className="text-xs text-slate-400">(Her sayfa ~24 ürün)</span>
                    </div>

                    {/* Start button */}
                    <button
                        onClick={startCrawl}
                        disabled={!selectedCategory && !customUrl.trim()}
                        className="px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-orange-500/25"
                    >
                        <Zap size={20} />
                        Otomatik Taramayı Başlat
                    </button>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 mb-4">
                        <Loader2 size={32} className="animate-spin text-orange-500" />
                    </div>
                    <p className="text-lg font-medium text-slate-700">Trendyol taranıyor...</p>
                    <p className="text-sm text-slate-400 mt-1">{crawlProgress || `${maxPages} sayfa taranacak, lütfen bekleyin...`}</p>
                    <p className="text-xs text-slate-300 mt-3">Puppeteer arka planda Trendyol sayfalarını dolaşıyor</p>
                </div>
            )}

            {/* Enriching spinner */}
            {enriching && (
                <div className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
                        <Loader2 size={32} className="animate-spin text-blue-500" />
                    </div>
                    <p className="text-lg font-medium text-slate-700">Google ile zenginleştiriliyor...</p>
                    <p className="text-sm text-slate-400 mt-1">{enrichProgress || "Her mağaza için iletişim bilgileri aranıyor"}</p>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
                    <AlertCircle size={18} />
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
                </div>
            )}

            {/* Step 2: Raw Results (pre-enrichment) */}
            {step === "results" && !loading && !enriching && results.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-700">
                                Bulunan Mağazalar
                                <span className="ml-2 text-sm font-normal text-slate-400">({results.length} mağaza)</span>
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">
                                <ShoppingBag size={14} className="inline mr-1" />
                                {categoryLabel} • {maxPages} sayfa tarandı
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={toggleAll} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50">
                                {results.every(r => r.selected) ? "Seçimi Kaldır" : "Tümünü Seç"}
                            </button>
                            <button onClick={() => { setResults([]); setStep("crawl"); }} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50">
                                Yeni Tarama
                            </button>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-slate-800">{results.length}</p>
                            <p className="text-xs text-slate-500">Toplam Mağaza</p>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-orange-600">{selectedCount}</p>
                            <p className="text-xs text-slate-500">Seçili</p>
                        </div>
                    </div>

                    {/* Seller list - compact */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
                        <div className="max-h-[500px] overflow-y-auto">
                            {results.map((seller, idx) => (
                                <div
                                    key={`${seller.sellerId}-${idx}`}
                                    className={`flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 last:border-0 transition-all ${
                                        seller.selected ? "" : "opacity-40"
                                    }`}
                                >
                                    <button
                                        onClick={() => toggleSelect(idx)}
                                        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                            seller.selected
                                                ? "bg-orange-500 border-orange-500"
                                                : "border-slate-300 hover:border-orange-400"
                                        }`}
                                    >
                                        {seller.selected && <CheckCircle2 size={12} className="text-white" />}
                                    </button>

                                    <span className="font-medium text-slate-700 flex-1 text-sm truncate">{seller.sellerName}</span>

                                    <a href={seller.storeUrl || `https://www.trendyol.com/sr?q=${encodeURIComponent(seller.sellerName)}&qt=${encodeURIComponent(seller.sellerName)}&st=${encodeURIComponent(seller.sellerName)}&os=1`} target="_blank" rel="noopener"
                                        className="text-xs text-orange-500 hover:underline flex items-center gap-1 flex-shrink-0">
                                        <ExternalLink size={10} /> Mağaza
                                    </a>

                                    <button
                                        onClick={() => removeItem(idx)}
                                        className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
                                        title="Kaldır"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="sticky bottom-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-xl">
                        <div className="mb-3 flex items-center gap-3">
                            <label className="text-sm font-medium text-slate-600 whitespace-nowrap">Liste Adı:</label>
                            <input
                                type="text"
                                value={listName}
                                onChange={(e) => setListName(e.target.value)}
                                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">
                                <strong className="text-orange-600">{selectedCount}</strong> / {results.length} seçili
                            </span>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleSave}
                                    disabled={selectedCount === 0 || saving || !listName.trim()}
                                    className="px-5 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                    {saving ? "Kaydediliyor..." : `${selectedCount} Lead Kaydet`}
                                </button>
                                <button
                                    onClick={handleGoogleEnrich}
                                    disabled={selectedCount === 0}
                                    className="px-5 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg text-sm font-medium hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 flex items-center gap-2 shadow-md shadow-orange-500/20"
                                >
                                    <Search size={14} />
                                    Google ile İletişim Bilgisi Bul →
                                </button>
                            </div>
                        </div>
                        {saveResult && (
                            <div className="mt-3 text-sm">
                                {saveResult.error ? (
                                    <span className="text-red-600">{saveResult.error}</span>
                                ) : (
                                    <span className="text-green-600">
                                        ✅ {saveResult.savedCount} lead kaydedildi
                                        {saveResult.skippedCount > 0 && ` • ${saveResult.skippedCount} zaten mevcut`}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Step 3: Enriched Results */}
            {step === "enriched" && !loading && !enriching && enrichedResults.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-700">
                                Google İletişim Bilgileri
                                <span className="ml-2 text-sm font-normal text-slate-400">({enrichedResults.length} mağaza)</span>
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">
                                İşaretlediğiniz mağazaların Google ile eşleşen iletişim bilgileri aşağıda. 
                                Yanlış eşleşenleri <Trash2 size={12} className="inline" /> butonu ile kaldırın.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setStep("results")} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50">
                                ← Mağaza Listesine Dön
                            </button>
                            <button onClick={() => { setResults([]); setEnrichedResults([]); setStep("crawl"); setSaveResult(null); setEnrichResult(null); }} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50">
                                Yeni Tarama
                            </button>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-3 mb-4">
                        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-slate-800">{enrichedResults.length}</p>
                            <p className="text-xs text-slate-500">Toplam</p>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-green-600">{enrichedResults.filter(r => r.phone).length}</p>
                            <p className="text-xs text-slate-500">Telefon</p>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-blue-600">{enrichedResults.filter(r => r.website).length}</p>
                            <p className="text-xs text-slate-500">Website</p>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                            <p className="text-2xl font-bold text-amber-600">{enrichedResults.filter(r => r.google_rating).length}</p>
                            <p className="text-xs text-slate-500">Google Kaydı</p>
                        </div>
                    </div>

                    {/* Enriched Cards */}
                    <div className="space-y-2 mb-6">
                        {enrichedResults.map((seller, idx) => (
                            <div
                                key={`enriched-${idx}`}
                                className={`p-3 rounded-xl border transition-all ${
                                    seller.selected
                                        ? seller.phone || seller.website
                                            ? "border-green-200 bg-green-50/30"
                                            : "border-amber-200 bg-amber-50/30"
                                        : "border-slate-100 bg-white opacity-40"
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <button
                                        onClick={() => toggleEnrichedSelect(idx)}
                                        className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                                            seller.selected ? "bg-orange-500 border-orange-500" : "border-slate-300"
                                        }`}
                                    >
                                        {seller.selected && <CheckCircle2 size={12} className="text-white" />}
                                    </button>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-sm text-slate-800">{seller.sellerName}</h3>
                                            <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[10px] rounded-full font-medium">Trendyol</span>
                                            {seller.google_rating && (
                                                <span className="flex items-center gap-0.5 text-xs text-slate-500">
                                                    <Star size={10} className="text-amber-400 fill-amber-400" />
                                                    {seller.google_rating}
                                                </span>
                                            )}
                                        </div>

                                        {seller.address && (
                                            <p className="text-xs text-slate-500 truncate mb-1">
                                                <MapPin size={10} className="inline mr-1" />{seller.address}
                                            </p>
                                        )}

                                        <div className="flex flex-wrap gap-2">
                                            {seller.phone && (
                                                <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                                    <Phone size={10} className="inline mr-0.5" /> {seller.phone}
                                                </span>
                                            )}
                                            {seller.website && (
                                                <a href={seller.website} target="_blank" rel="noopener" className="text-xs text-blue-500 hover:underline">
                                                    <Globe size={10} className="inline mr-0.5" /> Website
                                                </a>
                                            )}
                                            <a href={seller.storeUrl || `https://www.trendyol.com/sr?q=${encodeURIComponent(seller.sellerName)}&qt=${encodeURIComponent(seller.sellerName)}&st=${encodeURIComponent(seller.sellerName)}&os=1`} target="_blank" rel="noopener" className="text-xs text-orange-500 hover:underline">
                                                <ExternalLink size={10} className="inline mr-0.5" /> Trendyol
                                            </a>
                                            {seller.google_maps_url && (
                                                <a href={seller.google_maps_url} target="_blank" rel="noopener" className="text-xs text-blue-500 hover:underline">
                                                    <MapPin size={10} className="inline mr-0.5" /> Harita
                                                </a>
                                            )}
                                            {!seller.phone && !seller.website && !seller.address && (
                                                <span className="text-xs text-amber-600">
                                                    <AlertCircle size={10} className="inline mr-0.5" /> Google&apos;da bulunamadı
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <button onClick={() => removeEnrichedItem(idx)} className="text-slate-300 hover:text-red-500" title="Kaldır">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Save bar */}
                    <div className="sticky bottom-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-xl">
                        {!saveResult && (
                            <div className="mb-3 flex items-center gap-3">
                                <label className="text-sm font-medium text-slate-600 whitespace-nowrap">Liste Adı:</label>
                                <input type="text" value={listName} onChange={(e) => setListName(e.target.value)}
                                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
                            </div>
                        )}
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">
                                <strong className="text-orange-600">{enrichedSelectedCount}</strong> / {enrichedResults.length} seçili
                            </span>
                            {saveResult ? (
                                <div className="flex items-center gap-3">
                                    {saveResult.error ? (
                                        <span className="text-red-600 text-sm">{saveResult.error}</span>
                                    ) : enrichResult ? (
                                        <span className="text-green-600 text-sm">
                                            ✅ {saveResult.savedCount} kaydedildi • 📧 {enrichResult.summary?.found || 0} e-posta
                                        </span>
                                    ) : (
                                        <span className="text-green-600 text-sm">
                                            ✅ {saveResult.savedCount} kaydedildi
                                        </span>
                                    )}
                                    {saveResult.success && !enrichResult && (
                                        <button onClick={handleEmailEnrich}
                                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 flex items-center gap-1">
                                            <Mail size={12} /> E-posta Tara
                                        </button>
                                    )}
                                    <a href="/admin/leads" className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-medium hover:bg-slate-700">
                                        Lead Listesi →
                                    </a>
                                </div>
                            ) : (
                                <button
                                    onClick={async () => {
                                        setSaving(true);
                                        try {
                                            const selected = enrichedResults.filter(r => r.selected);
                                            const leadsToSave = selected.map(s => ({
                                                google_place_id: s.google_place_id || `trendyol-${s.sellerId}`,
                                                business_name: s.sellerName,
                                                address: s.address || "Trendyol Mağaza",
                                                phone: s.phone || null,
                                                website: s.website || s.storeUrl || null,
                                                google_maps_url: s.google_maps_url || null,
                                                google_rating: s.google_rating || null,
                                                google_review_count: s.google_review_count || null,
                                                google_business_status: "OPERATIONAL",
                                                working_hours: null, lat: null, lng: null,
                                                city: "Trendyol", district: categoryLabel || null,
                                                sector_id: null, sector_name: "Trendyol E-Ticaret",
                                                email_missing: true
                                            }));
                                            const result = await saveDiscoveredLeads(leadsToSave, listName.trim(), {
                                                sectorId: undefined, sectorName: "Trendyol E-Ticaret",
                                                city: "Trendyol", district: categoryLabel || undefined
                                            });
                                            setSaveResult(result);
                                        } catch (err: any) {
                                            setSaveResult({ error: err.message });
                                        } finally { setSaving(false); }
                                    }}
                                    disabled={enrichedSelectedCount === 0 || saving || !listName.trim()}
                                    className="px-5 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                    {enrichedSelectedCount} Lead Kaydet
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
