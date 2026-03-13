"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { updateLeadStatus, deleteLead, deleteLeadList, renameLeadList } from "@/app/(app)/admin/leads/actions";
import {
    Search, Star, Phone, Globe, Mail, AlertCircle,
    Trash2, MoreHorizontal, Target, MapPin, Building2,
    ArrowUpDown, Loader2, ArrowLeft, FolderOpen, Edit3, Check, X, RefreshCw,
    Upload, Download, FileUp, FileSpreadsheet
} from "lucide-react";
import { saveDiscoveredLeads } from "@/app/(app)/admin/leads/actions";
import * as XLSX from "xlsx";

// CSV parse helper
function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { inQuotes = !inQuotes; }
        else if ((ch === ',' || ch === ';') && !inQuotes) { result.push(current.trim()); current = ""; }
        else { current += ch; }
    }
    result.push(current.trim());
    return result;
}

// Auto-map column names to lead fields
const FIELD_MAP: Record<string, string[]> = {
    business_name: ["firma", "firma adı", "firma adi", "işletme", "isletme", "business", "company", "ünvan", "unvan"],
    contact_name: ["yetkili", "yetkili adı", "yetkili adi", "ad soyad", "adsoyad", "ad soy", "ilgili", "ilgili kişi", "contact", "kişi", "kisi"],
    email: ["e-posta", "eposta", "email", "mail", "e posta"],
    phone: ["telefon", "tel", "phone", "gsm", "cep"],
    city: ["şehir", "sehir", "il", "city"],
    district: ["ilçe", "ilce", "district"],
    address: ["adres", "address"],
    website: ["website", "web", "site", "url"],
    sector_name: ["sektör", "sektor", "sector"],
    google_rating: ["puan", "rating"],
    tags: ["etiket", "tag", "tags"],
};

function autoMapHeaders(headers: string[]): Record<string, string> {
    const autoMap: Record<string, string> = {};
    headers.forEach(h => {
        const lower = h.toLowerCase().trim();
        for (const [field, aliases] of Object.entries(FIELD_MAP)) {
            if (aliases.some(a => lower.includes(a))) { autoMap[h] = field; break; }
        }
    });
    return autoMap;
}

// Parse file (CSV or Excel)
function parseImportFile(
    file: File,
    onParsed: (headers: string[], rows: Record<string, string>[], mapping: Record<string, string>) => void
) {
    const isExcel = /\.(xlsx|xls|xlsb|xlsm|ods)$/i.test(file.name);

    if (isExcel) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const data = new Uint8Array(ev.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

            if (jsonData.length === 0) return;

            const headers = Object.keys(jsonData[0]);
            const rows = jsonData.map(row => {
                const r: Record<string, string> = {};
                headers.forEach(h => { r[h] = String(row[h] ?? ""); });
                return r;
            }).filter(row => Object.values(row).some(v => v.trim()));

            onParsed(headers, rows, autoMapHeaders(headers));
        };
        reader.readAsArrayBuffer(file);
    } else {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            const lines = text.split("\n").filter(l => l.trim());
            if (lines.length < 2) return;

            const headers = parseCSVLine(lines[0]);
            const rows = lines.slice(1).map(line => {
                const values = parseCSVLine(line);
                const row: Record<string, string> = {};
                headers.forEach((h, i) => { row[h] = values[i] || ""; });
                return row;
            }).filter(row => Object.values(row).some(v => v.trim()));

            onParsed(headers, rows, autoMapHeaders(headers));
        };
        reader.readAsText(file, "UTF-8");
    }
}

interface LeadList {
    id: string;
    name: string;
    sector_id: string | null;
    sector_name: string | null;
    city: string | null;
    district: string | null;
    lead_count: number;
    status: string;
    created_at: string;
}

interface Lead {
    id: string;
    business_name: string;
    contact_name: string | null;
    sector_name: string | null;
    city: string | null;
    district: string | null;
    phone: string | null;
    email: string | null;
    email_missing: boolean;
    website: string | null;
    google_rating: number | null;
    google_review_count: number | null;
    score: number;
    status: string;
    source: string;
    created_at: string;
    tags: string[] | null;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    new: { label: "Yeni", color: "text-blue-700", bg: "bg-blue-100" },
    contacted: { label: "İletişime Geçildi", color: "text-purple-700", bg: "bg-purple-100" },
    demo_scheduled: { label: "Demo Planlandı", color: "text-indigo-700", bg: "bg-indigo-100" },
    proposal: { label: "Teklif Verildi", color: "text-amber-700", bg: "bg-amber-100" },
    won: { label: "Kazanıldı", color: "text-green-700", bg: "bg-green-100" },
    lost: { label: "Kaybedildi", color: "text-red-700", bg: "bg-red-100" },
    archived: { label: "Arşivlendi", color: "text-slate-600", bg: "bg-slate-100" },
};

export default function LeadsListPage() {
    // View modes: "lists" or "leads"
    const [view, setView] = useState<"lists" | "leads">("lists");
    const [selectedList, setSelectedList] = useState<LeadList | null>(null);

    // Lists state
    const [lists, setLists] = useState<LeadList[]>([]);
    const [listsLoading, setListsLoading] = useState(true);
    const [editingListId, setEditingListId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState("");

    // Leads state
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [emailFilter, setEmailFilter] = useState("all");
    const [sortField, setSortField] = useState("business_name");
    const [sortAsc, setSortAsc] = useState(true);
    const [actionMenuId, setActionMenuId] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 25;

    // Import/Export
    const [showImportModal, setShowImportModal] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importData, setImportData] = useState<any[]>([]);
    const [importHeaders, setImportHeaders] = useState<string[]>([]);
    const [importMapping, setImportMapping] = useState<Record<string, string>>({});
    const [importListName, setImportListName] = useState("");
    const [importSectorId, setImportSectorId] = useState("");
    const [importSectorName, setImportSectorName] = useState("");
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ saved: number; skipped: number; errors: number; errorDetails?: string[] } | null>(null);
    const [sectors, setSectors] = useState<Array<{ id: string; name: string }>>([]);
    const [exporting, setExporting] = useState(false);

    // Enrichment
    const [enriching, setEnriching] = useState(false);
    const [enrichStatus, setEnrichStatus] = useState<string | null>(null);

    // Refresh list
    const [refreshing, setRefreshing] = useState(false);
    const [refreshStatus, setRefreshStatus] = useState<string | null>(null);

    // Fetch lists
    const fetchLists = useCallback(async () => {
        setListsLoading(true);
        const supabase = createClient();

        // Get lists
        const { data: listsData } = await supabase
            .from("lead_lists")
            .select("*")
            .eq("status", "active")
            .order("created_at", { ascending: false });

        if (listsData) {
            // Get actual lead counts for each list
            const listsWithCounts = await Promise.all(
                listsData.map(async (list) => {
                    const { count } = await supabase
                        .from("leads")
                        .select("id", { count: "exact", head: true })
                        .eq("list_id", list.id);
                    return { ...list, lead_count: count || 0 };
                })
            );
            setLists(listsWithCounts);
        }

        setListsLoading(false);
    }, []);

    const fetchSectors = useCallback(async () => {
        const supabase = createClient();
        const { data } = await supabase.from("lead_sectors").select("id, name").eq("is_active", true).order("name");
        if (data) setSectors(data);
    }, []);

    useEffect(() => { fetchLists(); fetchSectors(); }, [fetchLists, fetchSectors]);

    // Fetch leads for selected list
    const fetchLeads = useCallback(async () => {
        if (!selectedList) return;
        setLoading(true);
        const supabase = createClient();

        let query = supabase
            .from("leads")
            .select("*", { count: "exact" })
            .eq("list_id", selectedList.id)
            .order(sortField, { ascending: sortAsc })
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (searchQuery) {
            query = query.or(`business_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
        }
        if (statusFilter !== "all") query = query.eq("status", statusFilter);
        if (emailFilter === "missing") query = query.eq("email_missing", true);
        if (emailFilter === "available") query = query.eq("email_missing", false);

        const { data, count } = await query;
        if (data) {
            setLeads(data);
            setTotalCount(count || 0);
        }
        setLoading(false);
    }, [selectedList, searchQuery, statusFilter, emailFilter, sortField, sortAsc, page]);

    useEffect(() => {
        if (view === "leads" && selectedList) fetchLeads();
    }, [view, selectedList, fetchLeads]);

    const openList = (list: LeadList) => {
        setSelectedList(list);
        setView("leads");
        setPage(0);
        setSearchQuery("");
        setStatusFilter("all");
        setEmailFilter("all");
    };

    const goBackToLists = () => {
        setView("lists");
        setSelectedList(null);
        setLeads([]);
        fetchLists();
    };

    const handleSort = (field: string) => {
        if (sortField === field) setSortAsc(!sortAsc);
        else { setSortField(field); setSortAsc(false); }
        setPage(0);
    };

    const handleStatusChange = async (leadId: string, newStatus: string) => {
        await updateLeadStatus(leadId, newStatus);
        setActionMenuId(null);
        fetchLeads();
    };

    const handleDeleteLead = async (leadId: string) => {
        if (!confirm("Bu lead'i silmek istediğinize emin misiniz?")) return;
        await deleteLead(leadId);
        setActionMenuId(null);
        fetchLeads();
    };

    // Delete list modal state
    const [deleteListModal, setDeleteListModal] = useState<{ open: boolean; listId: string; listName: string }>({ open: false, listId: "", listName: "" });
    const [deletingList, setDeletingList] = useState(false);

    const handleDeleteList = (listId: string, listName: string) => {
        setDeleteListModal({ open: true, listId, listName });
    };

    const confirmDeleteList = async (withLeads: boolean) => {
        setDeletingList(true);
        await deleteLeadList(deleteListModal.listId, withLeads);
        setDeleteListModal({ open: false, listId: "", listName: "" });
        setDeletingList(false);
        fetchLists();
    };

    const handleRenameList = async (listId: string) => {
        if (!editingName.trim()) return;
        await renameLeadList(listId, editingName.trim());
        setEditingListId(null);
        fetchLists();
    };

    const handleBulkEnrich = async () => {
        if (!selectedList) return;
        setEnriching(true);
        setEnrichStatus("E-posta eksik olan lead'ler taranıyor...");

        try {
            const supabase = createClient();
            const { data: missingLeads } = await supabase
                .from("leads")
                .select("id")
                .eq("list_id", selectedList.id)
                .eq("email_missing", true)
                .not("website", "is", null);

            if (!missingLeads || missingLeads.length === 0) {
                setEnrichStatus("Bu listede taranacak lead bulunamadı.");
                setEnriching(false);
                return;
            }

            const leadIds = missingLeads.map(l => l.id);
            let totalFound = 0, totalNotFound = 0;

            for (let i = 0; i < leadIds.length; i += 10) {
                const batch = leadIds.slice(i, i + 10);
                setEnrichStatus(`E-postalar taranıyor... (${i + 1}-${Math.min(i + 10, leadIds.length)} / ${leadIds.length})`);

                const res = await fetch("/api/leads/enrich", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ leadIds: batch })
                });
                const data = await res.json();
                if (data.summary) {
                    totalFound += data.summary.found || 0;
                    totalNotFound += data.summary.not_found || 0;
                }
            }

            setEnrichStatus(`✅ Tamamlandı: ${totalFound} e-posta bulundu, ${totalNotFound} bulunamadı`);
            fetchLeads();
        } catch (err: any) {
            setEnrichStatus(`Hata: ${err.message}`);
        } finally {
            setEnriching(false);
        }
    };

    const handleRefreshList = async () => {
        if (!selectedList || !selectedList.sector_id) {
            setRefreshStatus("Bu listenin sektör bilgisi yok, güncellenemiyor.");
            return;
        }

        setRefreshing(true);
        setRefreshStatus("Sektör bilgileri alınıyor...");

        try {
            const supabase = createClient();

            // Get sector keywords
            const { data: sector } = await supabase
                .from("lead_sectors")
                .select("keywords, name, id")
                .eq("id", selectedList.sector_id)
                .single();

            if (!sector || !sector.keywords) {
                setRefreshStatus("Sektör anahtar kelimeleri bulunamadı.");
                setRefreshing(false);
                return;
            }

            setRefreshStatus(`"${sector.name}" sektöründe ${selectedList.city}${selectedList.district ? ` / ${selectedList.district}` : ""} bölgesinde tarama yapılıyor...`);

            // Call discover API
            const res = await fetch("/api/leads/discover", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sectorKeywords: sector.keywords,
                    city: selectedList.city,
                    district: selectedList.district || undefined,
                    sectorId: sector.id,
                    sectorName: sector.name
                })
            });

            const discoverData = await res.json();
            if (!res.ok) throw new Error(discoverData.error);

            const discoveredLeads = discoverData.leads || [];
            if (discoveredLeads.length === 0) {
                setRefreshStatus("Yeni işletme bulunamadı.");
                setRefreshing(false);
                return;
            }

            setRefreshStatus(`${discoveredLeads.length} işletme bulundu, yeniler ekleniyor...`);

            // Get existing google_place_ids in this list
            const { data: existingLeads } = await supabase
                .from("leads")
                .select("google_place_id")
                .eq("list_id", selectedList.id);

            const existingPlaceIds = new Set((existingLeads || []).map(l => l.google_place_id).filter(Boolean));

            // Filter only new leads
            const newLeads = discoveredLeads.filter((l: any) => !existingPlaceIds.has(l.google_place_id));

            if (newLeads.length === 0) {
                setRefreshStatus(`✅ Liste güncel — ${discoveredLeads.length} işletme kontrol edildi, yeni işletme bulunamadı.`);
                setRefreshing(false);
                return;
            }

            // Save new leads to this list - add list_id directly
            const adminDb = createClient();
            let savedCount = 0;

            for (const lead of newLeads) {
                const { error } = await supabase.from("leads").insert({
                    business_name: lead.business_name,
                    sector_id: lead.sector_id || null,
                    sector_name: lead.sector_name || null,
                    city: lead.city || null,
                    district: lead.district || null,
                    address: lead.address || null,
                    lat: lead.lat || null,
                    lng: lead.lng || null,
                    phone: lead.phone || null,
                    email: lead.email || null,
                    email_missing: !lead.email,
                    website: lead.website || null,
                    google_place_id: lead.google_place_id || null,
                    google_rating: lead.google_rating || null,
                    google_review_count: lead.google_review_count || null,
                    google_business_status: lead.google_business_status || null,
                    working_hours: lead.working_hours || null,
                    list_id: selectedList.id,
                    source: "google_places",
                    status: "new",
                });
                if (!error) savedCount++;
            }

            setRefreshStatus(`✅ ${savedCount} yeni işletme eklendi! (toplam ${discoveredLeads.length} kontrol edildi)`);
            fetchLeads();

            // Auto-enrich new leads for emails
            if (savedCount > 0) {
                setEnrichStatus("Yeni eklenen işletmelerin e-postaları taranıyor...");
                setEnriching(true);

                // Get newly added leads (the ones without email)
                const { data: newSavedLeads } = await supabase
                    .from("leads")
                    .select("id")
                    .eq("list_id", selectedList.id)
                    .eq("email_missing", true)
                    .not("website", "is", null);

                if (newSavedLeads && newSavedLeads.length > 0) {
                    const ids = newSavedLeads.map(l => l.id);
                    let totalFound = 0, totalNotFound = 0;

                    for (let i = 0; i < ids.length; i += 10) {
                        const batch = ids.slice(i, i + 10);
                        setEnrichStatus(`E-postalar taranıyor... (${i + 1}-${Math.min(i + 10, ids.length)} / ${ids.length})`);

                        const enrichRes = await fetch("/api/leads/enrich", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ leadIds: batch })
                        });
                        const enrichData = await enrichRes.json();
                        if (enrichData.summary) {
                            totalFound += enrichData.summary.found || 0;
                            totalNotFound += enrichData.summary.not_found || 0;
                        }
                    }

                    setEnrichStatus(`✅ E-posta taraması tamamlandı: ${totalFound} bulundu, ${totalNotFound} bulunamadı`);
                    fetchLeads();
                } else {
                    setEnrichStatus(null);
                }
                setEnriching(false);
            }
        } catch (err: any) {
            setRefreshStatus(`Hata: ${err.message}`);
        } finally {
            setRefreshing(false);
            setEnriching(false);
        }
    };

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    // ==================== LISTS VIEW ====================
    if (view === "lists") {
        return (
            <>
            <div className="p-6 max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Lead Listeleri</h1>
                        <p className="text-slate-500 mt-1">
                            {lists.length} liste oluşturulmuş
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                setShowImportModal(true);
                                setImportFile(null);
                                setImportData([]);
                                setImportHeaders([]);
                                setImportMapping({});
                                setImportListName("");
                                setImportSectorId("");
                                setImportSectorName("");
                                setImportResult(null);
                            }}
                            className="px-5 py-2.5 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors flex items-center gap-2"
                        >
                            <Upload size={18} /> Dosya İçe Aktar
                        </button>
                        <Link
                            href="/admin/lead-discovery"
                            className="px-5 py-2.5 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors flex items-center gap-2 shadow-lg shadow-orange-500/20"
                        >
                            <Search size={18} /> Yeni Keşif
                        </Link>
                    </div>
                </div>

                {listsLoading ? (
                    <div className="text-center py-20 text-slate-400">Yükleniyor...</div>
                ) : lists.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
                        <FolderOpen size={48} className="mx-auto mb-4 text-slate-300" />
                        <h2 className="text-lg font-semibold text-slate-700 mb-2">Henüz liste yok</h2>
                        <p className="text-slate-500 mb-6">Lead Keşfi ile yeni işletmeleri tarayın ve listeye kaydedin</p>
                        <Link
                            href="/admin/lead-discovery"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors"
                        >
                            Lead Keşfine Git →
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {lists.map(list => (
                            <div
                                key={list.id}
                                className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-lg hover:border-orange-300 transition-all group"
                            >
                                {editingListId === list.id ? (
                                    <div className="flex items-center gap-2 mb-3">
                                        <input
                                            type="text"
                                            value={editingName}
                                            onChange={(e) => setEditingName(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleRenameList(list.id)}
                                            className="flex-1 px-2 py-1 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                                            autoFocus
                                        />
                                        <button onClick={() => handleRenameList(list.id)} className="text-green-600 hover:text-green-700">
                                            <Check size={16} />
                                        </button>
                                        <button onClick={() => setEditingListId(null)} className="text-slate-400 hover:text-slate-600">
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-start justify-between mb-3">
                                        <button onClick={() => openList(list)} className="text-left flex-1">
                                            <h3 className="font-semibold text-slate-800 group-hover:text-orange-600 transition-colors">
                                                {list.name}
                                            </h3>
                                        </button>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => { setEditingListId(list.id); setEditingName(list.name); }}
                                                className="p-1 rounded hover:bg-slate-100"
                                                title="Yeniden adlandır"
                                            >
                                                <Edit3 size={14} className="text-slate-400" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteList(list.id, list.name)}
                                                className="p-1 rounded hover:bg-red-50"
                                                title="Sil"
                                            >
                                                <Trash2 size={14} className="text-red-400" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <button onClick={() => openList(list)} className="w-full text-left">
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="flex items-center gap-1.5 text-sm text-slate-500">
                                            <Target size={14} className="text-orange-400" />
                                            <span className="font-semibold text-orange-600">{list.lead_count}</span> Lead
                                        </div>
                                        {list.sector_name && (
                                            <div className="flex items-center gap-1 text-xs text-slate-400">
                                                <Building2 size={12} />
                                                {list.sector_name}
                                            </div>
                                        )}
                                    </div>

                                    {list.city && (
                                        <div className="flex items-center gap-1 text-xs text-slate-400 mb-2">
                                            <MapPin size={12} />
                                            {list.city}{list.district ? ` / ${list.district}` : ""}
                                        </div>
                                    )}

                                    <div className="text-xs text-slate-400">
                                        {new Date(list.created_at).toLocaleDateString("tr-TR", {
                                            day: "numeric", month: "long", year: "numeric"
                                        })}
                                    </div>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* CSV Import Modal (lists view) */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !importing && setShowImportModal(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-slate-200">
                            <div className="flex items-center gap-2">
                                <FileSpreadsheet size={20} className="text-violet-500" />
                                <h2 className="text-lg font-bold text-slate-800">Dosya İçe Aktar</h2>
                            </div>
                            <button onClick={() => !importing && setShowImportModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>
                        <div className="p-5 space-y-5">
                            {!importFile && (
                                <label className="flex flex-col items-center justify-center gap-3 p-10 border-2 border-dashed border-violet-300 rounded-xl cursor-pointer hover:bg-violet-50 hover:border-violet-400 transition-colors">
                                    <input type="file" accept=".csv,.txt,.xlsx,.xls,.xlsb,.xlsm,.ods" className="hidden" onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        setImportFile(file);
                                        parseImportFile(file, (headers, rows, mapping) => {
                                            setImportHeaders(headers);
                                            setImportData(rows);
                                            setImportMapping(mapping);
                                        });
                                    }} />
                                    <FileUp size={40} className="text-violet-400" />
                                    <span className="text-sm font-medium text-slate-600">CSV veya Excel dosyası seçin</span>
                                    <span className="text-xs text-slate-400">Desteklenen: .csv, .xlsx, .xls, .txt, .ods</span>
                                </label>
                            )}
                            {importFile && importData.length > 0 && !importResult && (
                                <>
                                    <div className="p-3 bg-violet-50 border border-violet-200 rounded-lg flex items-center gap-2">
                                        <FileSpreadsheet size={16} className="text-violet-500" />
                                        <span className="text-sm text-violet-700 font-medium">{importFile.name}</span>
                                        <span className="text-xs text-violet-500">— {importData.length} satır</span>
                                        <button onClick={() => { setImportFile(null); setImportData([]); setImportHeaders([]); setImportMapping({}); }} className="ml-auto text-xs text-violet-500 hover:text-violet-700">Değiştir</button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-medium text-slate-600 mb-1 block">Liste Adı *</label>
                                            <input value={importListName} onChange={e => setImportListName(e.target.value)} placeholder="ör: İstanbul Diş Klinikleri" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-violet-400" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-slate-600 mb-1 block">Sektör (opsiyonel)</label>
                                            <select value={importSectorId} onChange={e => { setImportSectorId(e.target.value); const s = sectors.find(s => s.id === e.target.value); setImportSectorName(s?.name || ""); }} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-violet-400">
                                                <option value="">Seçiniz</option>
                                                {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-700 mb-2">Alan Eşleştirme</h3>
                                        <div className="space-y-2 max-h-[250px] overflow-y-auto">
                                            {importHeaders.map(header => (
                                                <div key={header} className="flex items-center gap-3">
                                                    <span className="text-xs text-slate-500 w-40 truncate">{header}</span>
                                                    <span className="text-slate-300">→</span>
                                                    <select value={importMapping[header] || ""} onChange={e => setImportMapping(prev => ({ ...prev, [header]: e.target.value }))} className={`flex-1 text-xs px-2 py-1.5 border rounded-lg ${importMapping[header] ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200'}`}>
                                                        <option value="">— Atla —</option>
                                                        <option value="business_name">Firma Adı *</option>
                                                        <option value="contact_name">Yetkili Adı</option>
                                                        <option value="email">E-posta</option>
                                                        <option value="phone">Telefon</option>
                                                        <option value="city">Şehir</option>
                                                        <option value="district">İlçe</option>
                                                        <option value="address">Adres</option>
                                                        <option value="website">Website</option>
                                                        <option value="sector_name">Sektör</option>
                                                        <option value="google_rating">Google Puan</option>
                                                        <option value="google_review_count">Yorum Sayısı</option>
                                                        <option value="tags">Etiketler</option>
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <button onClick={async () => {
                                        if (!importListName.trim()) { alert("Liste adı gerekli"); return; }
                                        if (!Object.values(importMapping).includes("business_name")) { alert("Firma Adı alanını eşleştirin"); return; }
                                        setImporting(true);
                                        try {
                                            const mappedLeads = importData.map(row => {
                                                const lead: Record<string, any> = {};
                                                Object.entries(importMapping).forEach(([csvCol, field]) => { if (field && row[csvCol]) lead[field] = row[csvCol]; });
                                                return lead;
                                            }).filter(l => l.business_name);
                                            const res = await fetch("/api/leads/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leads: mappedLeads, listName: importListName.trim(), sectorId: importSectorId || undefined, sectorName: importSectorName || undefined }) });
                                            const data = await res.json();
                                            if (!res.ok) throw new Error(data.error);
                                            setImportResult({ saved: data.saved, skipped: data.skipped, errors: data.errors, errorDetails: data.errorDetails });
                                            fetchLists();
                                        } catch (err: any) { alert(`Import hatası: ${err.message}`); } finally { setImporting(false); }
                                    }} disabled={importing} className="w-full py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                                        {importing ? <><Loader2 size={16} className="animate-spin" /> İçe aktarılıyor...</> : <><Upload size={16} /> {importData.length} Lead&apos;i İçe Aktar</>}
                                    </button>
                                </>
                            )}
                            {importResult && (
                                <div className="text-center py-6">
                                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4"><Check size={32} className="text-emerald-600" /></div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-2">İçe Aktarma Tamamlandı!</h3>
                                    <div className="flex items-center justify-center gap-6 mb-4">
                                        <div className="text-center"><p className="text-2xl font-bold text-emerald-600">{importResult.saved}</p><p className="text-xs text-slate-500">Kaydedildi</p></div>
                                        <div className="text-center"><p className="text-2xl font-bold text-amber-500">{importResult.skipped}</p><p className="text-xs text-slate-500">Zaten Var</p></div>
                                        <div className="text-center"><p className="text-2xl font-bold text-red-500">{importResult.errors}</p><p className="text-xs text-slate-500">Hata</p></div>
                                    </div>
                                    {importResult.errorDetails && importResult.errorDetails.length > 0 && (
                                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-left max-h-[120px] overflow-y-auto">
                                            <p className="text-xs font-semibold text-red-600 mb-1">Hata Detayları:</p>
                                            {importResult.errorDetails.map((err, i) => (
                                                <p key={i} className="text-xs text-red-500">{err}</p>
                                            ))}
                                        </div>
                                    )}
                                    <button onClick={() => setShowImportModal(false)} className="px-6 py-2.5 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors">Tamam</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Delete List Confirmation Modal */}
            {deleteListModal.open && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !deletingList && setDeleteListModal({ open: false, listId: "", listName: "" })}>
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-6 text-center">
                            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertCircle size={28} className="text-red-500" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Listeyi Sil</h3>
                            <p className="text-sm text-slate-500 mb-6">
                                <strong>&quot;{deleteListModal.listName}&quot;</strong> listesini nasıl silmek istiyorsunuz?
                            </p>
                            <div className="space-y-3">
                                <button
                                    onClick={() => confirmDeleteList(false)}
                                    disabled={deletingList}
                                    className="w-full py-3 px-4 bg-amber-50 border-2 border-amber-200 text-amber-800 rounded-xl font-semibold hover:bg-amber-100 hover:border-amber-300 transition-colors text-sm disabled:opacity-50"
                                >
                                    {deletingList ? "Siliniyor..." : "🗂️ Sadece Listeyi Sil (Lead'ler kalsın)"}
                                </button>
                                <button
                                    onClick={() => confirmDeleteList(true)}
                                    disabled={deletingList}
                                    className="w-full py-3 px-4 bg-red-50 border-2 border-red-200 text-red-700 rounded-xl font-semibold hover:bg-red-100 hover:border-red-300 transition-colors text-sm disabled:opacity-50"
                                >
                                    {deletingList ? "Siliniyor..." : "🗑️ Listeyi ve Tüm Lead'leri Sil"}
                                </button>
                                <button
                                    onClick={() => setDeleteListModal({ open: false, listId: "", listName: "" })}
                                    disabled={deletingList}
                                    className="w-full py-2.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                                >
                                    Vazgeç
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            </>
        );
    }

    // ==================== LEADS VIEW (inside a list) ====================
    return (
        <>
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header with back button */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <button onClick={goBackToLists} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                        <ArrowLeft size={20} className="text-slate-500" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">{selectedList?.name}</h1>
                        <p className="text-slate-500 mt-0.5 text-sm">
                            {totalCount} lead •
                            {selectedList?.sector_name && ` ${selectedList.sector_name} •`}
                            {selectedList?.city && ` ${selectedList.city}${selectedList?.district ? ` / ${selectedList.district}` : ""}`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRefreshList}
                        disabled={refreshing || enriching}
                        className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        {refreshing ? (
                            <><Loader2 size={16} className="animate-spin" /> Güncelleniyor...</>
                        ) : (
                            <><RefreshCw size={16} /> Listeyi Güncelle</>
                        )}
                    </button>
                    <button
                        onClick={handleBulkEnrich}
                        disabled={enriching || refreshing}
                        className="px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        {enriching ? (
                            <><Loader2 size={16} className="animate-spin" /> Taranıyor...</>
                        ) : (
                            <><Mail size={16} /> E-posta Tara</>
                        )}
                    </button>
                    <button
                        onClick={async () => {
                            if (!selectedList) return;
                            setExporting(true);
                            try {
                                const params = new URLSearchParams();
                                params.set("list_id", selectedList.id);
                                if (statusFilter !== "all") params.set("status", statusFilter);
                                if (emailFilter === "missing") params.set("email_filter", "missing_email");
                                if (emailFilter === "available") params.set("email_filter", "has_email");
                                
                                const res = await fetch(`/api/leads/export?${params.toString()}`);
                                if (!res.ok) throw new Error("Export başarısız");
                                const blob = await res.blob();
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `${selectedList.name}_leads.csv`;
                                a.click();
                                window.URL.revokeObjectURL(url);
                            } catch (err: any) {
                                alert(`Export hatası: ${err.message}`);
                            } finally {
                                setExporting(false);
                            }
                        }}
                        disabled={exporting}
                        className="px-4 py-2.5 bg-slate-600 text-white rounded-xl font-semibold hover:bg-slate-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        {exporting ? (
                            <><Loader2 size={16} className="animate-spin" /> İndiriliyor...</>
                        ) : (
                            <><Download size={16} /> CSV İndir</>
                        )}
                    </button>
                    <Link
                        href="/admin/lead-discovery"
                        className="px-5 py-2.5 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors flex items-center gap-2 shadow-lg shadow-orange-500/20"
                    >
                        <Search size={18} /> Yeni Keşif
                    </Link>
                </div>
            </div>

            {/* Status banners */}
            {refreshStatus && (
                <div className={`mb-4 p-3 rounded-xl text-sm flex items-center gap-2 ${
                    refreshStatus.includes("✅") ? "bg-green-50 border border-green-200 text-green-700" :
                    refreshStatus.includes("Hata") ? "bg-red-50 border border-red-200 text-red-700" :
                    "bg-emerald-50 border border-emerald-200 text-emerald-700"
                }`}>
                    {refreshing && <Loader2 size={14} className="animate-spin" />}
                    {refreshStatus}
                    {!refreshing && (
                        <button onClick={() => setRefreshStatus(null)} className="ml-auto text-current opacity-50 hover:opacity-100">✕</button>
                    )}
                </div>
            )}
            {enrichStatus && (
                <div className={`mb-4 p-3 rounded-xl text-sm flex items-center gap-2 ${
                    enrichStatus.includes("✅") ? "bg-green-50 border border-green-200 text-green-700" :
                    enrichStatus.includes("Hata") ? "bg-red-50 border border-red-200 text-red-700" :
                    "bg-blue-50 border border-blue-200 text-blue-700"
                }`}>
                    {enriching && <Loader2 size={14} className="animate-spin" />}
                    {enrichStatus}
                    {!enriching && (
                        <button onClick={() => setEnrichStatus(null)} className="ml-auto text-current opacity-50 hover:opacity-100">✕</button>
                    )}
                </div>
            )}

            {/* Filters */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2 relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="İşletme adı, telefon veya e-posta ara..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                </div>

                <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                    className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                >
                    <option value="all">Tüm Durumlar</option>
                    {Object.entries(STATUS_MAP).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                    ))}
                </select>

                <select
                    value={emailFilter}
                    onChange={(e) => { setEmailFilter(e.target.value); setPage(0); }}
                    className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                >
                    <option value="all">E-posta Durumu</option>
                    <option value="available">E-posta Var</option>
                    <option value="missing">E-posta Eksik</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    <button onClick={() => handleSort("business_name")} className="flex items-center gap-1 hover:text-slate-700">
                                        İşletme <ArrowUpDown size={12} />
                                    </button>
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Bölge</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">İletişim</th>
                                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    <button onClick={() => handleSort("google_rating")} className="flex items-center gap-1 hover:text-slate-700 mx-auto">
                                        Puan <ArrowUpDown size={12} />
                                    </button>
                                </th>
                                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Durum</th>
                                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    <button onClick={() => handleSort("created_at")} className="flex items-center gap-1 hover:text-slate-700 mx-auto">
                                        Kayıt <ArrowUpDown size={12} />
                                    </button>
                                </th>
                                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={7} className="text-center py-16 text-slate-400">Yükleniyor...</td></tr>
                            ) : leads.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-16 text-slate-400">
                                        <Target size={40} className="mx-auto mb-3 opacity-40" />
                                        <p className="font-medium">Bu listede lead bulunmuyor</p>
                                    </td>
                                </tr>
                            ) : leads.map(lead => (
                                <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-4 py-3">
                                        <Link href={`/admin/leads/${lead.id}`} className="group">
                                            <span className="font-medium text-slate-800 group-hover:text-orange-600 transition-colors">
                                                {lead.business_name}
                                            </span>
                                            {lead.contact_name && (
                                                <p className="text-xs text-slate-400 mt-0.5">{lead.contact_name}</p>
                                            )}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-sm text-slate-500 flex items-center gap-1">
                                            <MapPin size={12} />
                                            {lead.city}{lead.district ? ` / ${lead.district}` : ""}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {lead.phone && <span title={lead.phone}><Phone size={13} className="text-slate-400" /></span>}
                                            {lead.website && <a href={lead.website} target="_blank" rel="noopener" title="Website"><Globe size={13} className="text-blue-400" /></a>}
                                            {lead.email ? (
                                                <span title={lead.email}><Mail size={13} className="text-green-500" /></span>
                                            ) : (
                                                <span title="E-posta eksik"><AlertCircle size={13} className="text-amber-500" /></span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {lead.google_rating ? (
                                            <div className="flex items-center justify-center gap-1">
                                                <Star size={13} className="text-amber-400 fill-amber-400" />
                                                <span className="text-sm font-medium">{lead.google_rating}</span>
                                            </div>
                                        ) : <span className="text-slate-300">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_MAP[lead.status]?.bg || "bg-slate-100"} ${STATUS_MAP[lead.status]?.color || "text-slate-600"}`}>
                                            {STATUS_MAP[lead.status]?.label || lead.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="text-xs text-slate-400">
                                            {new Date(lead.created_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center relative">
                                        <button
                                            onClick={() => setActionMenuId(actionMenuId === lead.id ? null : lead.id)}
                                            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                                        >
                                            <MoreHorizontal size={16} className="text-slate-400" />
                                        </button>
                                        {actionMenuId === lead.id && (
                                            <div className="absolute right-4 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1 min-w-[180px]">
                                                <Link href={`/admin/leads/${lead.id}`} className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                                                    Detayları Gör
                                                </Link>
                                                <div className="border-t border-slate-100 my-1" />
                                                {Object.entries(STATUS_MAP).filter(([k]) => k !== lead.status).map(([key, val]) => (
                                                    <button key={key} onClick={() => handleStatusChange(lead.id, key)} className="block w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                                                        {val.label} olarak işaretle
                                                    </button>
                                                ))}
                                                <div className="border-t border-slate-100 my-1" />
                                                <button onClick={() => handleDeleteLead(lead.id)} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                                                    Sil
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
                        <span className="text-sm text-slate-500">Sayfa {page + 1} / {totalPages}</span>
                        <div className="flex gap-2">
                            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-white disabled:opacity-50">← Önceki</button>
                            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-white disabled:opacity-50">Sonraki →</button>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* CSV Import Modal */}
        {showImportModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !importing && setShowImportModal(false)}>
                <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between p-5 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                            <FileSpreadsheet size={20} className="text-violet-500" />
                            <h2 className="text-lg font-bold text-slate-800">Dosya İçe Aktar</h2>
                        </div>
                        <button onClick={() => !importing && setShowImportModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                            <X size={20} className="text-slate-400" />
                        </button>
                    </div>

                    <div className="p-5 space-y-5">
                        {/* Step 1: File upload */}
                        {!importFile && (
                            <label className="flex flex-col items-center justify-center gap-3 p-10 border-2 border-dashed border-violet-300 rounded-xl cursor-pointer hover:bg-violet-50 hover:border-violet-400 transition-colors">
                                <input
                                    type="file"
                                    accept=".csv,.txt,.xlsx,.xls,.xlsb,.xlsm,.ods"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        setImportFile(file);
                                        parseImportFile(file, (headers, rows, mapping) => {
                                            setImportHeaders(headers);
                                            setImportData(rows);
                                            setImportMapping(mapping);
                                        });
                                    }}
                                />
                                <FileUp size={40} className="text-violet-400" />
                                <span className="text-sm font-medium text-slate-600">CSV veya Excel dosyası seçin</span>
                                <span className="text-xs text-slate-400">Desteklenen: .csv, .xlsx, .xls, .txt, .ods</span>
                            </label>
                        )}

                        {/* Step 2: Column mapping */}
                        {importFile && importData.length > 0 && !importResult && (
                            <>
                                <div className="p-3 bg-violet-50 border border-violet-200 rounded-lg flex items-center gap-2">
                                    <FileSpreadsheet size={16} className="text-violet-500" />
                                    <span className="text-sm text-violet-700 font-medium">{importFile.name}</span>
                                    <span className="text-xs text-violet-500">— {importData.length} satır bulundu</span>
                                    <button onClick={() => { setImportFile(null); setImportData([]); setImportHeaders([]); setImportMapping({}); }} className="ml-auto text-xs text-violet-500 hover:text-violet-700">Değiştir</button>
                                </div>

                                {/* List name & sector */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-slate-600 mb-1 block">Liste Adı *</label>
                                        <input
                                            value={importListName}
                                            onChange={e => setImportListName(e.target.value)}
                                            placeholder="ör: İstanbul Diş Klinikleri"
                                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-violet-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-600 mb-1 block">Sektör (opsiyonel)</label>
                                        <select
                                            value={importSectorId}
                                            onChange={e => {
                                                setImportSectorId(e.target.value);
                                                const s = sectors.find(s => s.id === e.target.value);
                                                setImportSectorName(s?.name || "");
                                            }}
                                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-violet-400"
                                        >
                                            <option value="">Seçiniz</option>
                                            {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Column mapping */}
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-700 mb-2">Alan Eşleştirme</h3>
                                    <p className="text-xs text-slate-400 mb-3">CSV sütunlarını lead alanlarına eşleştirin. Otomatik eşleşenler işaretlidir.</p>
                                    <div className="space-y-2 max-h-[250px] overflow-y-auto">
                                        {importHeaders.map(header => (
                                            <div key={header} className="flex items-center gap-3">
                                                <span className="text-xs text-slate-500 w-40 truncate" title={header}>{header}</span>
                                                <span className="text-slate-300">→</span>
                                                <select
                                                    value={importMapping[header] || ""}
                                                    onChange={e => setImportMapping(prev => ({ ...prev, [header]: e.target.value }))}
                                                    className={`flex-1 text-xs px-2 py-1.5 border rounded-lg outline-none focus:ring-1 focus:ring-violet-400 ${importMapping[header] ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200'}`}
                                                >
                                                    <option value="">— Atla —</option>
                                                    <option value="business_name">Firma Adı *</option>
                                                    <option value="contact_name">Yetkili Adı</option>
                                                    <option value="email">E-posta</option>
                                                    <option value="phone">Telefon</option>
                                                    <option value="city">Şehir</option>
                                                    <option value="district">İlçe</option>
                                                    <option value="address">Adres</option>
                                                    <option value="website">Website</option>
                                                    <option value="sector_name">Sektör</option>
                                                    <option value="google_rating">Google Puan</option>
                                                    <option value="google_review_count">Yorum Sayısı</option>
                                                    <option value="tags">Etiketler</option>
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Preview */}
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-700 mb-2">Önizleme (ilk 3 satır)</h3>
                                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                        <table className="w-full text-xs">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    {Object.entries(importMapping).filter(([_, v]) => v).map(([_, field]) => (
                                                        <th key={field} className="px-3 py-2 text-left font-medium text-slate-600">{field}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {importData.slice(0, 3).map((row, i) => (
                                                    <tr key={i} className="border-t border-slate-100">
                                                        {Object.entries(importMapping).filter(([_, v]) => v).map(([csvCol, _]) => (
                                                            <td key={csvCol} className="px-3 py-2 text-slate-600 truncate max-w-[180px]">{row[csvCol] || "—"}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Import button */}
                                <button
                                    onClick={async () => {
                                        if (!importListName.trim()) { alert("Liste adı gerekli"); return; }
                                        if (!Object.values(importMapping).includes("business_name")) { alert("Firma Adı alanını eşleştirin"); return; }

                                        setImporting(true);
                                        try {
                                            const mappedLeads = importData.map(row => {
                                                const lead: Record<string, any> = {};
                                                Object.entries(importMapping).forEach(([csvCol, field]) => {
                                                    if (field && row[csvCol]) lead[field] = row[csvCol];
                                                });
                                                return lead;
                                            }).filter(l => l.business_name);

                                            const res = await fetch("/api/leads/import", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({
                                                    leads: mappedLeads,
                                                    listName: importListName.trim(),
                                                    sectorId: importSectorId || undefined,
                                                    sectorName: importSectorName || undefined
                                                })
                                            });

                                            const data = await res.json();
                                            if (!res.ok) throw new Error(data.error);
                                            setImportResult({ saved: data.saved, skipped: data.skipped, errors: data.errors });
                                            fetchLists();
                                        } catch (err: any) {
                                            alert(`Import hatası: ${err.message}`);
                                        } finally {
                                            setImporting(false);
                                        }
                                    }}
                                    disabled={importing}
                                    className="w-full py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {importing ? (
                                        <><Loader2 size={16} className="animate-spin" /> İçe aktarılıyor...</>
                                    ) : (
                                        <><Upload size={16} /> {importData.length} Lead&apos;i İçe Aktar</>
                                    )}
                                </button>
                            </>
                        )}

                        {/* Step 3: Result */}
                        {importResult && (
                            <div className="text-center py-6">
                                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Check size={32} className="text-emerald-600" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-2">İçe Aktarma Tamamlandı!</h3>
                                <div className="flex items-center justify-center gap-6 mb-4">
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-emerald-600">{importResult.saved}</p>
                                        <p className="text-xs text-slate-500">Kaydedildi</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-amber-500">{importResult.skipped}</p>
                                        <p className="text-xs text-slate-500">Zaten Var</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-red-500">{importResult.errors}</p>
                                        <p className="text-xs text-slate-500">Hata</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowImportModal(false)}
                                    className="px-6 py-2.5 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors"
                                >
                                    Tamam
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
