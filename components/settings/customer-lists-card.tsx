"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    BookOpen, Plus, Trash2, Eye, RefreshCw, X, Users, Upload,
    CheckCircle2, AlertCircle, Globe
} from "lucide-react";
import { getCustomerLists, saveCustomerList, deleteCustomerList, getCustomerListById } from "@/app/actions/customer-lists";
import * as XLSX from "xlsx";

interface CustomerListsCardProps {
    tenantId: string;
}

/**
 * WhatsApp uluslararası telefon normalizatörü
 * 
 * WhatsApp API, E.164 formatının "+" işaretsiz halini bekler.
 * Örnek geçerli formatlar: 905332076252 (TR), 12125551234 (US), 447911123456 (UK)
 * 
 * Desteklenen giriş formatları:
 * - +905332076252  → 905332076252  (uluslararası, + ile)
 * - 00905332076252 → 905332076252  (uluslararası, 00 ile)
 * - 905332076252   → 905332076252  (zaten doğru)
 * - 05332076252    → 90 + 5332076252 (Türkiye yerel, varsayılan ülke kodu ile)
 * - 5332076252     → 90 + 5332076252 (yalnızca abone no, Türkiye varsayımı)
 * - 07911123456    → 44 + 7911123456 (İngiltere yerel)
 */
export function normalizePhoneWhatsApp(raw: string, defaultCountryCode = "90"): string {
    if (!raw) return "";
    // Sadece rakamları al (spaces, dashes, parentheses, + kaldır)
    let digits = String(raw).replace(/\D/g, "");
    if (!digits || digits.length < 6) return "";

    // 00 ile başlayan uluslararası format: 00905... → 905...
    if (digits.startsWith("00")) {
        digits = digits.slice(2);
    }

    // 11+ haneli ve 0 ile başlamıyorsa uluslararası formatta — olduğu gibi bırak
    // (ör: 905332076252=12, 12125551234=11, 447911123456=12)
    // 10 veya daha az haneli → yerel abone numarası, ülke kodu ekle
    if (!digits.startsWith("0") && digits.length >= 11) {
        return digits; // Geçerli uluslararası format, dokunma
    }

    // Yerel format: 0 ile başlıyorsa başındaki 0'ı at, ülke kodu ekle
    if (digits.startsWith("0")) {
        digits = defaultCountryCode + digits.slice(1);
    } else {
        // 10 veya daha az haneli yerel numara → ülke kodu ekle
        digits = defaultCountryCode + digits;
    }

    return digits;
}

// Popüler ülke kodları listesi
const COUNTRY_CODES = [
    { code: "90", label: "🇹🇷 Türkiye (+90)" },
    { code: "1", label: "🇺🇸 ABD/Kanada (+1)" },
    { code: "44", label: "🇬🇧 İngiltere (+44)" },
    { code: "49", label: "🇩🇪 Almanya (+49)" },
    { code: "33", label: "🇫🇷 Fransa (+33)" },
    { code: "31", label: "🇳🇱 Hollanda (+31)" },
    { code: "43", label: "🇦🇹 Avusturya (+43)" },
    { code: "41", label: "🇨🇭 İsviçre (+41)" },
    { code: "32", label: "🇧🇪 Belçika (+32)" },
    { code: "34", label: "🇪🇸 İspanya (+34)" },
    { code: "39", label: "🇮🇹 İtalya (+39)" },
    { code: "7", label: "🇷🇺 Rusya (+7)" },
    { code: "971", label: "🇦🇪 BAE (+971)" },
    { code: "966", label: "🇸🇦 Suudi Arabistan (+966)" },
    { code: "20", label: "🇪🇬 Mısır (+20)" },
    { code: "212", label: "🇲🇦 Fas (+212)" },
    { code: "213", label: "🇩🇿 Cezayir (+213)" },
    { code: "86", label: "🇨🇳 Çin (+86)" },
    { code: "81", label: "🇯🇵 Japonya (+81)" },
    { code: "82", label: "🇰🇷 Güney Kore (+82)" },
    { code: "91", label: "🇮🇳 Hindistan (+91)" },
    { code: "55", label: "🇧🇷 Brezilya (+55)" },
    { code: "52", label: "🇲🇽 Meksika (+52)" },
    { code: "61", label: "🇦🇺 Avustralya (+61)" },
];

type MappingStep = "idle" | "mapping" | "preview";

export function CustomerListsCard({ tenantId }: CustomerListsCardProps) {
    const [lists, setLists] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [viewingList, setViewingList] = useState<any | null>(null);
    const [loadingView, setLoadingView] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Excel state
    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [excelRows, setExcelRows] = useState<any[]>([]);
    const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
    const [mappingStep, setMappingStep] = useState<MappingStep>("idle");

    // Column mapping
    const [nameColumn, setNameColumn] = useState<string>("");
    const [phoneColumn, setPhoneColumn] = useState<string>("");
    const [defaultCountryCode, setDefaultCountryCode] = useState("90");
    const [listName, setListName] = useState("");
    const [processedRows, setProcessedRows] = useState<any[]>([]);
    const [phoneStats, setPhoneStats] = useState({ valid: 0, invalid: 0 });

    const fetchLists = async () => {
        setLoading(true);
        const res = await getCustomerLists(tenantId);
        if (res.success) setLists(res.data);
        setLoading(false);
    };

    useEffect(() => { fetchLists(); }, [tenantId]);

    // Excel parse
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setExcelFile(file);
        const reader = new FileReader();
        reader.onload = (ev) => {
            const data = ev.target?.result;
            const wb = XLSX.read(data, { type: "array" });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows: any[] = XLSX.utils.sheet_to_json(ws);
            setExcelRows(rows);
            if (rows.length > 0) {
                const headers = Object.keys(rows[0]);
                setExcelHeaders(headers);
                // Otomatik tahmin: telefon kolonunu bul
                const phoneGuess = headers.find(h =>
                    /tel|phone|gsm|mobil|cep/i.test(h)
                ) || "";
                const nameGuess = headers.find(h =>
                    /ad|isim|name|soyad/i.test(h)
                ) || "";
                setPhoneColumn(phoneGuess);
                setNameColumn(nameGuess);
            }
            setMappingStep("mapping");
        };
        reader.readAsArrayBuffer(file);
    };

    // Önizleme + normalize hesapla
    const handlePreview = () => {
        if (!phoneColumn) return;
        const rows = excelRows.map(r => {
            const rawPhone = String(r[phoneColumn] || "");
            const normalized = normalizePhoneWhatsApp(rawPhone, defaultCountryCode);
            const fullName = nameColumn ? String(r[nameColumn] || "") : "";
            return {
                ...r,
                _full_name: fullName,
                _raw_phone: rawPhone,
                _normalized_phone: normalized,
                _valid: normalized.length >= 7,
            };
        });
        const valid = rows.filter(r => r._valid).length;
        setProcessedRows(rows);
        setPhoneStats({ valid, invalid: rows.length - valid });
        setMappingStep("preview");
    };

    const handleSaveList = async () => {
        if (!listName.trim() || processedRows.length === 0) return;
        setIsSaving(true);
        const finalRows = processedRows
            .filter(r => r._valid)
            .map(r => ({
                full_name: r._full_name,
                phone: r._raw_phone,
                _normalized_phone: r._normalized_phone,
            }));

        const res = await saveCustomerList({
            tenantId,
            name: listName,
            rows: finalRows,
        });
        setIsSaving(false);
        if (res.success) {
            setMappingStep("idle");
            setExcelFile(null);
            setExcelRows([]);
            setExcelHeaders([]);
            setListName("");
            await fetchLists();
        }
    };

    const handleView = async (id: string) => {
        setLoadingView(true);
        const res = await getCustomerListById(tenantId, id);
        if (res.success && res.data) setViewingList(res.data);
        setLoadingView(false);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`"${name}" listesini silmek istediğinize emin misiniz?`)) return;
        setDeletingId(id);
        await deleteCustomerList(tenantId, id);
        await fetchLists();
        setDeletingId(null);
    };

    const closeMapping = () => {
        setMappingStep("idle");
        setExcelFile(null);
        setExcelRows([]);
        setExcelHeaders([]);
        setProcessedRows([]);
        setListName("");
    };

    const filteredLists = lists.filter(l =>
        l.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Card className="border-orange-500">
            <CardHeader className="flex flex-row items-start justify-between pb-4">
                <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-orange-600" />
                        Müşteri Listeleri
                    </CardTitle>
                    <CardDescription>
                        Kampanyalarda kullanabileceğiniz kayıtlı kişi listelerinizi yönetin.
                    </CardDescription>
                </div>
                <div className="flex gap-2 shrink-0">
                    <Button variant="outline" onClick={fetchLists} disabled={loading} size="icon">
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                    <Label htmlFor="list-excel-upload" className="cursor-pointer">
                        <div className="flex items-center gap-1.5 border border-orange-500 text-orange-600 hover:bg-orange-600/5 rounded-md px-3 py-2 text-sm font-medium transition-colors">
                            <Plus className="w-4 h-4" /> Yeni Liste Oluştur
                        </div>
                        <input
                            id="list-excel-upload"
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </Label>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Search */}
                {lists.length > 0 && (
                    <Input
                        placeholder="Liste ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-sm"
                    />
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin" /> Yükleniyor...
                    </div>
                ) : filteredLists.length === 0 ? (
                    <div className="text-center py-12 border border-dashed rounded-xl text-slate-500 bg-slate-50">
                        <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                        <p className="font-medium">Kayıtlı liste bulunamadı</p>
                        <p className="text-sm text-slate-400 mt-1 mb-4">
                            Excel yükleyerek yeni bir liste oluşturun.
                        </p>
                        <Label htmlFor="list-excel-upload-empty" className="cursor-pointer">
                            <div className="inline-flex items-center gap-2 bg-orange-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-orange-600/90 transition-colors">
                                <Upload className="w-4 h-4" /> Excel / CSV Yükle
                            </div>
                            <input
                                id="list-excel-upload-empty"
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </Label>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredLists.map((list) => (
                            <div key={list.id} className="border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:border-slate-300 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="bg-orange-600/10 p-2.5 rounded-lg">
                                        <Users className="w-5 h-5 text-orange-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-900">{list.name}</h4>
                                        <div className="flex items-center gap-3 mt-1">
                                            <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600">
                                                {list.row_count} kişi
                                            </Badge>
                                            <span className="text-xs text-slate-400">
                                                {new Date(list.created_at).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleView(list.id)} disabled={loadingView}>
                                        {loadingView ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5 mr-1" />}
                                        Görüntüle
                                    </Button>
                                    <Button
                                        variant="ghost" size="sm"
                                        className="h-8 text-xs text-red-500 hover:bg-red-50 hover:text-red-600"
                                        disabled={deletingId === list.id}
                                        onClick={() => handleDelete(list.id, list.name)}
                                    >
                                        {deletingId === list.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Info box */}
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-start gap-3">
                    <Globe className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-orange-700">
                        WhatsApp, telefon numaralarını <strong>uluslararası E.164 formatında</strong> (örn: 905332076252) bekler. Excel yükleme sırasında ülke kodunu belirtebilirsiniz. Yurt dışı numaralar otomatik tanınır.
                    </p>
                </div>
            </CardContent>

            {/* === COLUMN MAPPING DIALOG === */}
            {(mappingStep === "mapping" || mappingStep === "preview") && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10">
                            <div>
                                <h2 className="text-xl font-bold">
                                    {mappingStep === "mapping" ? "Kolon Eşleştirme" : "Önizleme & Kaydet"}
                                </h2>
                                <p className="text-sm text-slate-500 mt-0.5">
                                    {excelFile?.name} — {excelRows.length} satır
                                </p>
                            </div>
                            <button onClick={closeMapping}>
                                <X className="w-6 h-6 text-slate-400 hover:text-slate-600" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {mappingStep === "mapping" && (
                                <>
                                    {/* Column Mapping */}
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="font-semibold">Ad Soyad Kolonu</Label>
                                            <Select value={nameColumn || "__none__"} onValueChange={(v) => setNameColumn(v === "__none__" ? "" : v)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="(Opsiyonel) Kolon seçin..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="__none__">— Eşleştirme (opsiyonel)</SelectItem>
                                                    {excelHeaders.map(h => (
                                                        <SelectItem key={h} value={h}>{h}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="font-semibold">Telefon Kolonu <span className="text-red-500">*</span></Label>
                                            <Select value={phoneColumn} onValueChange={setPhoneColumn}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Telefon kolonunu seçin..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {excelHeaders.map(h => (
                                                        <SelectItem key={h} value={h}>{h}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="font-semibold flex items-center gap-2">
                                                <Globe className="w-4 h-4 text-slate-400" />
                                                Varsayılan Ülke Kodu
                                            </Label>
                                            <p className="text-xs text-slate-500">
                                                Numaranın başında ülke kodu yoksa bu kod eklenir. Uluslararası formatı olan numaralar (+xx veya 00xx) otomatik tanınır.
                                            </p>
                                            <Select value={defaultCountryCode} onValueChange={setDefaultCountryCode}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {COUNTRY_CODES.map(c => (
                                                        <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* Sample preview */}
                                    {phoneColumn && excelRows.length > 0 && (
                                        <div className="border rounded-xl overflow-hidden">
                                            <div className="bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500 border-b">
                                                Örnek Dönüşüm (İlk 5 Satır)
                                            </div>
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50 text-xs text-slate-400">
                                                    <tr>
                                                        <th className="text-left px-4 py-2">Ad Soyad</th>
                                                        <th className="text-left px-4 py-2">Excel'deki Telefon</th>
                                                        <th className="text-left px-4 py-2 text-green-600">WhatsApp Formatı</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {excelRows.slice(0, 5).map((r, i) => {
                                                        const raw = String(r[phoneColumn] || "");
                                                        const norm = normalizePhoneWhatsApp(raw, defaultCountryCode);
                                                        return (
                                                            <tr key={i} className="border-t">
                                                                <td className="px-4 py-2 text-slate-600">{nameColumn ? String(r[nameColumn] || "—") : "—"}</td>
                                                                <td className="px-4 py-2 font-mono text-xs text-slate-500">{raw}</td>
                                                                <td className={`px-4 py-2 font-mono text-xs font-semibold ${norm.length >= 7 ? "text-green-600" : "text-red-500"}`}>
                                                                    {norm || "⚠ Geçersiz"}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    <div className="flex justify-end gap-3">
                                        <Button variant="outline" onClick={closeMapping}>İptal</Button>
                                        <Button onClick={handlePreview} disabled={!phoneColumn}>
                                            Önizlemeye Geç →
                                        </Button>
                                    </div>
                                </>
                            )}

                            {mappingStep === "preview" && (
                                <>
                                    {/* Stats */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="border border-green-200 bg-green-50 rounded-xl p-4 flex items-center gap-3">
                                            <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
                                            <div>
                                                <p className="text-2xl font-bold text-green-700">{phoneStats.valid}</p>
                                                <p className="text-sm text-green-600">Geçerli Numara</p>
                                            </div>
                                        </div>
                                        <div className={`border rounded-xl p-4 flex items-center gap-3 ${phoneStats.invalid > 0 ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
                                            <AlertCircle className={`w-8 h-8 shrink-0 ${phoneStats.invalid > 0 ? "text-red-400" : "text-slate-300"}`} />
                                            <div>
                                                <p className={`text-2xl font-bold ${phoneStats.invalid > 0 ? "text-red-600" : "text-slate-400"}`}>{phoneStats.invalid}</p>
                                                <p className={`text-sm ${phoneStats.invalid > 0 ? "text-red-500" : "text-slate-400"}`}>Geçersiz / Atlanacak</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* List name */}
                                    <div className="space-y-2">
                                        <Label className="font-semibold">Liste Adı <span className="text-red-500">*</span></Label>
                                        <Input
                                            placeholder="Örn: Mart 2026 Kampanya Listesi"
                                            value={listName}
                                            onChange={(e) => setListName(e.target.value)}
                                        />
                                    </div>

                                    {/* Preview table */}
                                    <div className="border rounded-xl overflow-hidden">
                                        <div className="bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500 border-b">
                                            Veri Önizlemesi ({processedRows.length} satır)
                                        </div>
                                        <div className="overflow-auto max-h-56">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50 text-xs text-slate-400 sticky top-0">
                                                    <tr>
                                                        <th className="text-left px-4 py-2">Ad Soyad</th>
                                                        <th className="text-left px-4 py-2">Ham Telefon</th>
                                                        <th className="text-left px-4 py-2">WhatsApp Formatı</th>
                                                        <th className="text-left px-4 py-2">Durum</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {processedRows.slice(0, 100).map((r, i) => (
                                                        <tr key={i} className={`border-t ${!r._valid ? "bg-red-50" : ""}`}>
                                                            <td className="px-4 py-2">{r._full_name || "—"}</td>
                                                            <td className="px-4 py-2 font-mono text-xs text-slate-500">{r._raw_phone}</td>
                                                            <td className="px-4 py-2 font-mono text-xs font-semibold text-green-700">{r._normalized_phone}</td>
                                                            <td className="px-4 py-2">
                                                                {r._valid
                                                                    ? <span className="text-green-600 text-xs flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Geçerli</span>
                                                                    : <span className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Atlanacak</span>
                                                                }
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {processedRows.length > 100 && (
                                                <div className="text-center py-2 text-xs text-slate-400 border-t">
                                                    +{processedRows.length - 100} satır daha gösterilmiyor
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <Button variant="outline" onClick={() => setMappingStep("mapping")}>
                                            ← Geri
                                        </Button>
                                        <Button
                                            onClick={handleSaveList}
                                            disabled={!listName.trim() || phoneStats.valid === 0 || isSaving}
                                            className="min-w-[140px]"
                                        >
                                            {isSaving ? (
                                                <><RefreshCw className="w-4 h-4 animate-spin mr-2" /> Kaydediliyor...</>
                                            ) : (
                                                <><CheckCircle2 className="w-4 h-4 mr-2" /> Listeyi Kaydet ({phoneStats.valid} kişi)</>
                                            )}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW LIST MODAL */}
            {viewingList && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b">
                            <div>
                                <h2 className="text-xl font-bold">{viewingList.name}</h2>
                                <p className="text-sm text-slate-500 mt-0.5">{viewingList.row_count} kişi</p>
                            </div>
                            <button onClick={() => setViewingList(null)}>
                                <X className="w-6 h-6 text-slate-400 hover:text-slate-600" />
                            </button>
                        </div>
                        <div className="overflow-auto flex-1">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-xs text-slate-500 sticky top-0 border-b">
                                    <tr>
                                        <th className="text-left px-4 py-3 font-semibold">#</th>
                                        <th className="text-left px-4 py-3 font-semibold">Ad Soyad</th>
                                        <th className="text-left px-4 py-3 font-semibold">WhatsApp Numarası</th>
                                        <th className="text-left px-4 py-3 font-semibold">Ham Telefon</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(viewingList.rows || []).map((row: any, i: number) => (
                                        <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                                            <td className="px-4 py-2 text-slate-400 text-xs">{i + 1}</td>
                                            <td className="px-4 py-2">{row.full_name || "—"}</td>
                                            <td className="px-4 py-2 font-mono text-xs text-green-700 font-semibold">{row._normalized_phone}</td>
                                            <td className="px-4 py-2 font-mono text-xs text-slate-400">{row.phone}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 border-t flex justify-end">
                            <Button variant="outline" onClick={() => setViewingList(null)}>Kapat</Button>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
}
