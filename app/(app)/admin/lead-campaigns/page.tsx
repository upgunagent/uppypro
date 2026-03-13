"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    Wand2, Save, Send, Loader2, ArrowLeft, Plus, Trash2,
    FileText, Eye, Code, Edit3, RefreshCw, Mail, CheckCircle2,
    ChevronDown, ChevronUp, FolderOpen, X, UploadCloud, Image as ImageIcon, Package,
    Users, Zap, AlertTriangle
} from "lucide-react";

interface Template {
    id: string;
    name: string;
    sector_id: string | null;
    sector_name: string | null;
    subject: string;
    html_content: string;
    is_ai_generated: boolean;
    usage_count: number;
    created_at: string;
    updated_at: string;
}

interface Sector {
    id: string;
    name: string;
    description: string;
}

export default function LeadCampaignsPage() {
    // View: "library", "editor", or "send"
    const [view, setView] = useState<"library" | "editor" | "send">("library");

    // Library state
    const [templates, setTemplates] = useState<Template[]>([]);
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterSector, setFilterSector] = useState("all");

    // Editor state
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [templateName, setTemplateName] = useState("");
    const [selectedSectorId, setSelectedSectorId] = useState("");
    const [selectedSectorName, setSelectedSectorName] = useState("");
    const [sectorDescription, setSectorDescription] = useState("");
    const [subject, setSubject] = useState("");
    const [htmlContent, setHtmlContent] = useState("");
    const [aiCommand, setAiCommand] = useState("");
    const [previewMode, setPreviewMode] = useState<"preview" | "code">("preview");

    // Image upload
    const [uploading, setUploading] = useState(false);

    // Image asset gallery (persistent, from DB)
    const [imageAssets, setImageAssets] = useState<Array<{ id: string; url: string; name: string; description: string }>>([]);
    const [galleryOpen, setGalleryOpen] = useState(false);

    // Loading states
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [sendingTest, setSendingTest] = useState(false);
    const [testEmail, setTestEmail] = useState("");
    const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

    // Send campaign state
    const [sendTemplate, setSendTemplate] = useState<Template | null>(null);
    const [leadLists, setLeadLists] = useState<Array<{ id: string; name: string; sector_name: string | null; lead_count: number }>>([]);
    const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
    const [eligibleLeads, setEligibleLeads] = useState<Array<{ id: string; business_name: string; email: string }>>([]);
    const [loadingLeads, setLoadingLeads] = useState(false);
    const [sendingCampaign, setSendingCampaign] = useState(false);
    const [campaignName, setCampaignName] = useState("");
    const [sendResult, setSendResult] = useState<{ sent: number; failed: number; skipped: number; sentA?: number; sentB?: number } | null>(null);

    // A/B Test state
    const [abTestEnabled, setAbTestEnabled] = useState(false);
    const [abTemplateId, setAbTemplateId] = useState<string>("");

    // Cooldown toggle
    const [cooldownEnabled, setCooldownEnabled] = useState(true);

    // Fetch templates and sectors
    const fetchData = useCallback(async () => {
        setLoading(true);
        const supabase = createClient();

        const [templatesRes, sectorsRes, assetsRes] = await Promise.all([
            supabase.from("lead_email_templates").select("*").order("updated_at", { ascending: false }),
            supabase.from("lead_sectors").select("id, name, description").eq("is_active", true).order("name"),
            supabase.from("lead_image_assets").select("*").order("created_at", { ascending: false })
        ]);

        if (templatesRes.data) setTemplates(templatesRes.data);
        if (sectorsRes.data) setSectors(sectorsRes.data);
        if (assetsRes.data) setImageAssets(assetsRes.data);
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // -- LIBRARY FUNCTIONS --

    const openNewTemplate = () => {
        setEditingTemplate(null);
        setTemplateName("");
        setSelectedSectorId("");
        setSelectedSectorName("");
        setSectorDescription("");
        setSubject("");
        setHtmlContent("");
        setAiCommand("");
        setView("editor");
    };

    const openExistingTemplate = (template: Template) => {
        setEditingTemplate(template);
        setTemplateName(template.name);
        setSelectedSectorId(template.sector_id || "");
        setSelectedSectorName(template.sector_name || "");
        setSubject(template.subject);
        setHtmlContent(template.html_content);
        setAiCommand("");
        setView("editor");
    };

    const deleteTemplate = async (templateId: string) => {
        if (!confirm("Bu şablonu silmek istediğinize emin misiniz?")) return;
        const supabase = createClient();
        await supabase.from("lead_email_templates").delete().eq("id", templateId);
        fetchData();
    };

    const goBackToLibrary = () => {
        setView("library");
        setEditingTemplate(null);
        fetchData();
    };

    // -- EDITOR FUNCTIONS --

    const handleSectorChange = (sectorId: string) => {
        setSelectedSectorId(sectorId);
        const sector = sectors.find(s => s.id === sectorId);
        if (sector) {
            setSelectedSectorName(sector.name);
            setSectorDescription(sector.description || "");
            if (!templateName) setTemplateName(`${sector.name} - E-posta Şablonu`);

            // Auto-generate when sector is selected for new templates
            if (!editingTemplate && !htmlContent) {
                setTimeout(() => {
                    autoGenerate(sector.name, sector.description || "");
                }, 100);
            }
        }
    };

    const autoGenerate = async (sectorName: string, sectorDesc: string) => {
        setGenerating(true);
        setStatusMessage({ type: "info", text: `"${sectorName}" sektörü için şablon oluşturuluyor...` });

        try {
            const res = await fetch("/api/leads/generate-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sectorName,
                    sectorDescription: sectorDesc,
                    imageGallery: imageAssets.length > 0 ? imageAssets.map(a => ({ url: a.url, description: a.description || a.name })) : undefined,
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setHtmlContent(data.htmlContent);
            if (data.subject) setSubject(data.subject);
            setPreviewMode("preview");
            setStatusMessage({ type: "success", text: "✅ Şablon oluşturuldu! Beğenmediğiniz yerleri aşağıdan AI'a yazarak değiştirebilirsiniz." });
        } catch (err: any) {
            setStatusMessage({ type: "error", text: `Hata: ${err.message}` });
        } finally {
            setGenerating(false);
        }
    };

    const handleGenerateEmail = async () => {
        if (!selectedSectorName) {
            setStatusMessage({ type: "error", text: "Lütfen bir sektör seçin" });
            return;
        }

        setGenerating(true);
        setStatusMessage({ type: "info", text: "AI şablon oluşturuyor..." });

        try {
            const res = await fetch("/api/leads/generate-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sectorName: selectedSectorName,
                    sectorDescription,
                    customInstructions: aiCommand || undefined,
                    existingHtml: undefined,
                    imageGallery: imageAssets.length > 0 ? imageAssets.map(a => ({ url: a.url, description: a.description || a.name })) : undefined
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setHtmlContent(data.htmlContent);
            if (data.subject) setSubject(data.subject);
            setPreviewMode("preview");
            setStatusMessage({ type: "success", text: "✅ Şablon başarıyla oluşturuldu!" });
            setAiCommand("");
        } catch (err: any) {
            setStatusMessage({ type: "error", text: `Hata: ${err.message}` });
        } finally {
            setGenerating(false);
        }
    };

    const handleEditWithAI = async () => {
        if (!aiCommand.trim()) return;
        if (!htmlContent) {
            setStatusMessage({ type: "error", text: "Önce bir şablon oluşturun" });
            return;
        }

        setGenerating(true);
        setStatusMessage({ type: "info", text: "AI düzenliyor..." });

        try {
            const res = await fetch("/api/leads/generate-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sectorName: selectedSectorName,
                    customInstructions: aiCommand,
                    existingHtml: htmlContent,
                    imageGallery: imageAssets.length > 0 ? imageAssets.map(a => ({ url: a.url, description: a.description || a.name })) : undefined
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setHtmlContent(data.htmlContent);
            if (data.subject && !subject) setSubject(data.subject);
            setPreviewMode("preview");
            setStatusMessage({ type: "success", text: "✅ Şablon güncellendi!" });
            setAiCommand("");
        } catch (err: any) {
            setStatusMessage({ type: "error", text: `Hata: ${err.message}` });
        } finally {
            setGenerating(false);
        }
    };

    const handleSave = async () => {
        if (!templateName.trim() || !subject.trim() || !htmlContent.trim()) {
            setStatusMessage({ type: "error", text: "Şablon adı, konu ve HTML içerik gerekli" });
            return;
        }

        setSaving(true);
        const supabase = createClient();

        const templateData = {
            name: templateName.trim(),
            sector_id: selectedSectorId || null,
            sector_name: selectedSectorName || null,
            subject: subject.trim(),
            html_content: htmlContent,
            is_ai_generated: true,
            updated_at: new Date().toISOString()
        };

        let error;
        if (editingTemplate) {
            ({ error } = await supabase.from("lead_email_templates").update(templateData).eq("id", editingTemplate.id));
        } else {
            ({ error } = await supabase.from("lead_email_templates").insert(templateData));
        }

        if (error) {
            setStatusMessage({ type: "error", text: `Kaydetme hatası: ${error.message}` });
        } else {
            setStatusMessage({ type: "success", text: "✅ Şablon kaydedildi!" });
        }

        setSaving(false);
    };

    const handleSendTest = async () => {
        if (!testEmail.trim() || !subject.trim() || !htmlContent.trim()) {
            setStatusMessage({ type: "error", text: "E-posta adresi, konu ve HTML içerik gerekli" });
            return;
        }

        setSendingTest(true);
        setStatusMessage({ type: "info", text: `Test e-postası gönderiliyor: ${testEmail}` });

        try {
            const res = await fetch("/api/leads/send-test-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: testEmail.trim(),
                    subject: `[TEST] ${subject}`,
                    htmlContent
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setStatusMessage({ type: "success", text: `✅ Test e-postası ${testEmail} adresine gönderildi!` });
        } catch (err: any) {
            setStatusMessage({ type: "error", text: `Gönderim hatası: ${err.message}` });
        } finally {
            setSendingTest(false);
        }
    };

    const filteredTemplates = filterSector === "all"
        ? templates
        : templates.filter(t => t.sector_id === filterSector);

    // ==================== LIBRARY VIEW ====================
    if (view === "library") {
        return (
            <div className="p-6 max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">E-posta Şablonları</h1>
                        <p className="text-slate-500 mt-1">{templates.length} şablon mevcut</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={openNewTemplate}
                            className="px-5 py-2.5 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors flex items-center gap-2 shadow-lg shadow-orange-500/20"
                        >
                            <Plus size={18} /> Yeni Şablon
                        </button>
                    </div>
                </div>

                {/* Sector filter */}
                <div className="mb-6">
                    <select
                        value={filterSector}
                        onChange={(e) => setFilterSector(e.target.value)}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                    >
                        <option value="all">Tüm Sektörler</option>
                        {sectors.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-slate-400">Yükleniyor...</div>
                ) : filteredTemplates.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
                        <FileText size={48} className="mx-auto mb-4 text-slate-300" />
                        <h2 className="text-lg font-semibold text-slate-700 mb-2">Henüz şablon oluşturulmamış</h2>
                        <p className="text-slate-500 mb-6">AI ile sektöre özel profesyonel e-posta şablonları oluşturun</p>
                        <button
                            onClick={openNewTemplate}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors"
                        >
                            <Wand2 size={18} /> AI ile Şablon Oluştur
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredTemplates.map(template => (
                            <div
                                key={template.id}
                                onClick={() => openExistingTemplate(template)}
                                className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-orange-300 transition-all group cursor-pointer"
                            >
                                {/* Preview thumbnail */}
                                <div className="h-40 bg-slate-50 border-b border-slate-200 overflow-hidden relative">
                                    <iframe
                                        srcDoc={template.html_content}
                                        className="w-full h-full pointer-events-none"
                                        style={{ transform: "scale(0.5)", transformOrigin: "top left", width: "200%", height: "200%" }}
                                        sandbox="allow-same-origin"
                                    />
                                    <div className="absolute inset-0 bg-transparent" />
                                </div>

                                <div className="p-4">
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="font-semibold text-slate-800 group-hover:text-orange-600 transition-colors text-sm flex-1">
                                            {template.name}
                                        </h3>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteTemplate(template.id); }}
                                            className="p-1 rounded hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={14} className="text-red-400" />
                                        </button>
                                    </div>

                                    <p className="text-xs text-slate-400 mb-2 truncate">{template.subject}</p>

                                    <div className="flex items-center justify-between">
                                        {template.sector_name && (
                                            <span className="text-xs px-2 py-0.5 bg-orange-50 text-orange-600 rounded-full">
                                                {template.sector_name}
                                            </span>
                                        )}
                                        <span className="text-xs text-slate-400">
                                            {new Date(template.updated_at).toLocaleDateString("tr-TR")}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between mt-3">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSendTemplate(template);
                                                setCampaignName(`${template.name} - ${new Date().toLocaleDateString("tr-TR")}`);
                                                setSendResult(null);
                                                setSelectedListIds([]);
                                                setEligibleLeads([]);
                                                setView("send");
                                                // Fetch lead lists
                                                const fetchLists = async () => {
                                                    const supabase = createClient();
                                                    const { data } = await supabase.from("lead_lists").select("id, name, sector_name, lead_count").eq("status", "active").order("created_at", { ascending: false });
                                                    if (data) setLeadLists(data);
                                                };
                                                fetchLists();
                                            }}
                                            className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1"
                                        >
                                            <Send size={12} /> Kampanya Gönder
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // ==================== SEND VIEW ====================
    if (view === "send" && sendTemplate) {
        return (
            <div className="p-6 max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => setView("library")} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                        <ArrowLeft size={20} className="text-slate-500" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Kampanya Gönder</h1>
                        <p className="text-slate-500 mt-0.5 text-sm">Şablon: {sendTemplate.name}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Settings */}
                    <div className="space-y-5">
                        {/* Campaign name */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-5">
                            <label className="text-sm font-semibold text-slate-700 mb-2 block">Kampanya Adı</label>
                            <input
                                value={campaignName}
                                onChange={e => setCampaignName(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                                placeholder="Kampanya adı..."
                            />
                        </div>

                        {/* A/B Test Panel */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    🧪 A/B Test
                                </label>
                                <button
                                    onClick={() => {
                                        setAbTestEnabled(!abTestEnabled);
                                        if (abTestEnabled) setAbTemplateId("");
                                    }}
                                    className={`relative w-11 h-6 rounded-full transition-colors ${abTestEnabled ? 'bg-emerald-500' : 'bg-slate-200'}`}
                                >
                                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${abTestEnabled ? 'translate-x-5.5 left-[1px]' : 'left-[2px]'}`}
                                        style={{ transform: abTestEnabled ? 'translateX(22px)' : 'translateX(0)' }}
                                    />
                                </button>
                            </div>

                            {abTestEnabled && (
                                <div>
                                    <p className="text-xs text-slate-400 mb-3">
                                        Lead&apos;ler rastgele ikiye bölünür. A grubuna mevcut şablon, B grubuna seçtiğiniz şablon gönderilir.
                                    </p>
                                    <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                                        {templates
                                            .filter(t => t.id !== sendTemplate.id)
                                            .map(t => (
                                                <label
                                                    key={t.id}
                                                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all text-xs ${
                                                        abTemplateId === t.id ? 'border-violet-400 bg-violet-50' : 'border-slate-200 hover:border-slate-300'
                                                    }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="abTemplate"
                                                        checked={abTemplateId === t.id}
                                                        onChange={() => setAbTemplateId(t.id)}
                                                        className="w-3.5 h-3.5 text-violet-600 focus:ring-violet-500"
                                                    />
                                                    <div className="flex-1">
                                                        <p className="font-medium text-slate-700">{t.name}</p>
                                                        <p className="text-slate-400 truncate">{t.subject}</p>
                                                    </div>
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-violet-100 text-violet-600 rounded font-medium">B</span>
                                                </label>
                                            ))
                                        }
                                    </div>
                                    {abTestEnabled && abTemplateId && (
                                        <div className="mt-3 p-2 bg-violet-50 border border-violet-200 rounded-lg text-xs text-violet-700">
                                            <strong>A:</strong> {sendTemplate.name} &nbsp;|&nbsp; <strong>B:</strong> {templates.find(t => t.id === abTemplateId)?.name}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Lead list selection */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-5">
                            <label className="text-sm font-semibold text-slate-700 mb-3 block flex items-center gap-2">
                                <Users size={16} className="text-emerald-500" /> Hedef Lead Listeleri
                            </label>

                            {leadLists.length === 0 ? (
                                <p className="text-sm text-slate-400 py-4 text-center">Henüz lead listesi yok. Önce Lead Keşfi ile liste oluşturun.</p>
                            ) : (
                                <div className="space-y-2 max-h-[260px] overflow-y-auto">
                                    {leadLists.map(list => (
                                        <label
                                            key={list.id}
                                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                                selectedListIds.includes(list.id) ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedListIds.includes(list.id)}
                                                onChange={e => {
                                                    setSelectedListIds(prev =>
                                                        e.target.checked
                                                            ? [...prev, list.id]
                                                            : prev.filter(id => id !== list.id)
                                                    );
                                                }}
                                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                                            />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-slate-700">{list.name}</p>
                                                <p className="text-xs text-slate-400">
                                                    {list.lead_count} lead {list.sector_name && `• ${list.sector_name}`}
                                                </p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {/* Load leads button */}
                            {selectedListIds.length > 0 && (
                                <button
                                    onClick={async () => {
                                        setLoadingLeads(true);
                                        try {
                                            const supabase = createClient();
                                            const { data } = await supabase
                                                .from("leads")
                                                .select("id, business_name, email")
                                                .in("list_id", selectedListIds)
                                                .eq("email_missing", false)
                                                .not("email", "is", null)
                                                .order("business_name");
                                            setEligibleLeads(data || []);
                                        } catch (err) {
                                            console.error(err);
                                        } finally {
                                            setLoadingLeads(false);
                                        }
                                    }}
                                    disabled={loadingLeads}
                                    className="mt-3 w-full py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {loadingLeads ? (
                                        <><Loader2 size={14} className="animate-spin" /> Yükleniyor...</>
                                    ) : (
                                        <><RefreshCw size={14} /> Lead&apos;leri Yükle</>
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Leads summary */}
                        {eligibleLeads.length > 0 && (
                            <div className="bg-white border border-slate-200 rounded-2xl p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-semibold text-slate-700">Uygun Lead&apos;ler</span>
                                    <span className="text-sm font-bold text-emerald-600">{eligibleLeads.length} adet</span>
                                </div>
                                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                                    {eligibleLeads.map(lead => (
                                        <div key={lead.id} className="flex items-center gap-2 text-xs">
                                            <CheckCircle2 size={12} className="text-emerald-500" />
                                            <span className="text-slate-600 flex-1 truncate">{lead.business_name}</span>
                                            <span className="text-slate-400">{lead.email}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle size={14} className="text-amber-500 mt-0.5" />
                                        <div className="text-xs text-amber-700">
                                            <p className="font-medium">Gönderim Bilgisi:</p>
                                            <p>• Suppress listesindekiler otomatik hariç tutulur</p>
                                            <p>• Günlük limit: {process.env.LEAD_DAILY_SEND_LIMIT || "100"} e-posta</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Cooldown Toggle */}
                                <div className="mt-3 flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                    <div>
                                        <p className="text-xs font-medium text-slate-700">7 Gün Bekleme Kuralı</p>
                                        <p className="text-[10px] text-slate-400">
                                            {cooldownEnabled
                                                ? "Son 7 günde mail gönderilen lead'ler atlanır"
                                                : "Aynı lead'e tekrar gönderilebilir"}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setCooldownEnabled(!cooldownEnabled)}
                                        className={`relative w-11 h-6 rounded-full transition-colors ${cooldownEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                    >
                                        <div
                                            className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                                            style={{ transform: cooldownEnabled ? 'translateX(22px)' : 'translateX(2px)' }}
                                        />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Send button */}
                        {eligibleLeads.length > 0 && !sendResult && (
                            <button
                                onClick={async () => {
                                    const abTemplate = abTestEnabled ? templates.find(t => t.id === abTemplateId) : null;
                                    const isABTest = abTestEnabled && abTemplate;

                                    const confirmMsg = isABTest
                                        ? `A/B Test: ${eligibleLeads.length} lead ikiye bölünüp A ("${sendTemplate.name}") ve B ("${abTemplate.name}") şablonlarıyla gönderilecek. Emin misiniz?`
                                        : `${eligibleLeads.length} lead'e "${sendTemplate.subject}" konulu e-posta göndermek istediğinize emin misiniz?`;

                                    if (!confirm(confirmMsg)) return;

                                    setSendingCampaign(true);

                                    try {
                                        if (isABTest) {
                                            // Shuffle and split leads
                                            const shuffled = [...eligibleLeads].sort(() => Math.random() - 0.5);
                                            const midpoint = Math.ceil(shuffled.length / 2);
                                            const groupA = shuffled.slice(0, midpoint);
                                            const groupB = shuffled.slice(midpoint);

                                            setStatusMessage({ type: "info", text: `A/B Test gönderiliyor... A grubu: ${groupA.length}, B grubu: ${groupB.length}` });

                                            // Send Group A
                                            const resA = await fetch("/api/lead-campaigns/send", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({
                                                    campaignName: `${campaignName.trim() || "Kampanya"} [A]`,
                                                    templateId: sendTemplate.id,
                                                    subject: sendTemplate.subject,
                                                    htmlContent: sendTemplate.html_content,
                                                    leadIds: groupA.map(l => l.id),
                                                    skipCooldown: !cooldownEnabled
                                                })
                                            });
                                            const dataA = await resA.json();

                                            // Send Group B
                                            const resB = await fetch("/api/lead-campaigns/send", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({
                                                    campaignName: `${campaignName.trim() || "Kampanya"} [B]`,
                                                    templateId: abTemplate.id,
                                                    subject: abTemplate.subject,
                                                    htmlContent: abTemplate.html_content,
                                                    leadIds: groupB.map(l => l.id),
                                                    skipCooldown: !cooldownEnabled
                                                })
                                            });
                                            const dataB = await resB.json();

                                            const totalSent = (dataA.sent || 0) + (dataB.sent || 0);
                                            const totalFailed = (dataA.failed || 0) + (dataB.failed || 0);
                                            const totalSkipped = (dataA.skipped || 0) + (dataB.skipped || 0);

                                            setSendResult({
                                                sent: totalSent,
                                                failed: totalFailed,
                                                skipped: totalSkipped,
                                                sentA: dataA.sent || 0,
                                                sentB: dataB.sent || 0
                                            });
                                            setStatusMessage({ type: "success", text: `✅ A/B Test tamamlandı! A: ${dataA.sent || 0}, B: ${dataB.sent || 0} gönderildi.` });
                                        } else {
                                            setStatusMessage({ type: "info", text: `Gönderiliyor... (0/${eligibleLeads.length})` });

                                            const res = await fetch("/api/lead-campaigns/send", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({
                                                    campaignName: campaignName.trim() || undefined,
                                                    templateId: sendTemplate.id,
                                                    subject: sendTemplate.subject,
                                                    htmlContent: sendTemplate.html_content,
                                                    leadIds: eligibleLeads.map(l => l.id),
                                                    skipCooldown: !cooldownEnabled
                                                })
                                            });

                                            const data = await res.json();
                                            if (!res.ok) throw new Error(data.error);

                                            setSendResult({ sent: data.sent, failed: data.failed, skipped: data.skipped });
                                            setStatusMessage({ type: "success", text: `✅ ${data.sent} e-posta başarıyla gönderildi!` });
                                        }
                                    } catch (err: any) {
                                        setStatusMessage({ type: "error", text: `Hata: ${err.message}` });
                                    } finally {
                                        setSendingCampaign(false);
                                    }
                                }}
                                disabled={sendingCampaign || (abTestEnabled && !abTemplateId)}
                                className={`w-full py-3.5 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg ${
                                    abTestEnabled ? 'bg-violet-600 hover:bg-violet-700 shadow-violet-500/20' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                                }`}
                            >
                                {sendingCampaign ? (
                                    <><Loader2 size={18} className="animate-spin" /> Gönderiliyor...</>
                                ) : abTestEnabled ? (
                                    <>🧪 A/B Test — {eligibleLeads.length} Lead&apos;e Gönder</>
                                ) : (
                                    <><Zap size={18} /> {eligibleLeads.length} Lead&apos;e Kampanya Gönder</>
                                )}
                            </button>
                        )}

                        {/* Send result */}
                        {sendResult && (
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center">
                                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle2 size={32} className="text-emerald-600" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-3">
                                    {sendResult.sentA !== undefined ? "A/B Test Tamamlandı!" : "Kampanya Tamamlandı!"}
                                </h3>

                                {sendResult.sentA !== undefined && (
                                    <div className="flex items-center justify-center gap-6 mb-4">
                                        <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
                                            <p className="text-xs font-semibold text-emerald-600 mb-1">A Grubu</p>
                                            <p className="text-xl font-bold text-emerald-700">{sendResult.sentA}</p>
                                            <p className="text-[10px] text-emerald-500">gönderildi</p>
                                        </div>
                                        <span className="text-slate-300 text-xl font-bold">vs</span>
                                        <div className="px-4 py-2 bg-violet-50 border border-violet-200 rounded-xl">
                                            <p className="text-xs font-semibold text-violet-600 mb-1">B Grubu</p>
                                            <p className="text-xl font-bold text-violet-700">{sendResult.sentB}</p>
                                            <p className="text-[10px] text-violet-500">gönderildi</p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-center gap-8 mb-4">
                                    <div>
                                        <p className="text-2xl font-bold text-emerald-600">{sendResult.sent}</p>
                                        <p className="text-xs text-slate-500">Toplam Gönderildi</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-red-500">{sendResult.failed}</p>
                                        <p className="text-xs text-slate-500">Başarısız</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-amber-500">{sendResult.skipped}</p>
                                        <p className="text-xs text-slate-500">Atlandı</p>
                                    </div>
                                </div>

                                {sendResult.sentA !== undefined && (
                                    <p className="text-xs text-slate-400 mb-4">
                                        💡 Raporlar sayfasından A ve B kampanyalarının açılma/tıklama oranlarını karşılaştırabilirsiniz.
                                    </p>
                                )}

                                <button
                                    onClick={() => setView("library")}
                                    className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
                                >
                                    Şablonlara Dön
                                </button>
                            </div>
                        )}

                        {statusMessage && (
                            <div className={`p-3 rounded-xl text-sm ${
                                statusMessage.type === "success" ? "bg-green-50 border border-green-200 text-green-700" :
                                statusMessage.type === "error" ? "bg-red-50 border border-red-200 text-red-700" :
                                "bg-blue-50 border border-blue-200 text-blue-700"
                            }`}>
                                {statusMessage.text}
                            </div>
                        )}
                    </div>

                    {/* Right: Template preview */}
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                            <h3 className="text-sm font-semibold text-slate-700">Şablon Önizleme</h3>
                            <p className="text-xs text-slate-400">{sendTemplate.subject}</p>
                        </div>
                        <iframe
                            srcDoc={sendTemplate.html_content}
                            className="w-full border-0"
                            style={{ height: "600px" }}
                            sandbox="allow-same-origin"
                        />
                    </div>
                </div>
            </div>
        );
    }

    // ==================== EDITOR VIEW ====================
    return (
        <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <button onClick={goBackToLibrary} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                        <ArrowLeft size={20} className="text-slate-500" />
                    </button>
                    <h1 className="text-xl font-bold text-slate-800">
                        {editingTemplate ? "Şablon Düzenle" : "Yeni Şablon Oluştur"}
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSave}
                        disabled={saving || !templateName || !htmlContent}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50 text-sm"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Kaydet
                    </button>
                </div>
            </div>

            {/* Status message */}
            {statusMessage && (
                <div className={`mb-4 p-3 rounded-xl text-sm flex items-center gap-2 ${
                    statusMessage.type === "success" ? "bg-green-50 border border-green-200 text-green-700" :
                    statusMessage.type === "error" ? "bg-red-50 border border-red-200 text-red-700" :
                    "bg-blue-50 border border-blue-200 text-blue-700"
                }`}>
                    {statusMessage.type === "info" && <Loader2 size={14} className="animate-spin" />}
                    {statusMessage.text}
                    <button onClick={() => setStatusMessage(null)} className="ml-auto text-current opacity-50 hover:opacity-100">
                        <X size={14} />
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* LEFT: Settings & AI */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Template info */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5">
                        <h2 className="text-sm font-semibold text-slate-700 mb-3">Şablon Bilgileri</h2>

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Şablon Adı</label>
                                <input
                                    type="text"
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                    placeholder="Örn: Kuaför Tanıtım E-postası"
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Sektör</label>
                                <select
                                    value={selectedSectorId}
                                    onChange={(e) => handleSectorChange(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                                >
                                    <option value="">Sektör seçin...</option>
                                    {sectors.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">E-posta Konusu</label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="E-posta konu satırı"
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* AI Generation */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5">
                        <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                            <Wand2 size={16} className="text-purple-500" />
                            AI ile {htmlContent ? "Düzenle" : "Oluştur"}
                        </h2>

                        <div className="space-y-3">
                            <textarea
                                value={aiCommand}
                                onChange={(e) => setAiCommand(e.target.value)}
                                placeholder={htmlContent
                                    ? "Değiştirmek istediğiniz yerleri yazın...\nÖrn: CTA butonunu kırmızı yap, başlığı değiştir, fiyat bilgisi ekle"
                                    : "İsteğe bağlı özel talimatlar...\nÖrn: Kampanya odaklı olsun, %20 indirim vurgulansın"
                                }
                                rows={3}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                            />

                            {!htmlContent ? (
                                <button
                                    onClick={handleGenerateEmail}
                                    disabled={generating || !selectedSectorId}
                                    className="w-full px-4 py-2.5 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {generating ? (
                                        <><Loader2 size={16} className="animate-spin" /> AI Oluşturuyor...</>
                                    ) : (
                                        <><Wand2 size={16} /> AI ile Şablon Oluştur</>
                                    )}
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleEditWithAI}
                                        disabled={generating || !aiCommand.trim()}
                                        className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {generating ? (
                                            <><Loader2 size={16} className="animate-spin" /> Düzenleniyor...</>
                                        ) : (
                                            <><Edit3 size={16} /> AI ile Düzenle</>
                                        )}
                                    </button>
                                    <button
                                        onClick={handleGenerateEmail}
                                        disabled={generating}
                                        className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors flex items-center gap-2 disabled:opacity-50"
                                        title="Sıfırdan yeniden oluştur"
                                    >
                                        <RefreshCw size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Image Gallery & Upload */}
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                        <button
                            onClick={() => setGalleryOpen(!galleryOpen)}
                            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <Package size={16} className="text-violet-500" />
                                <span className="text-sm font-semibold text-slate-700">Görsel Deposu</span>
                                <span className="text-xs px-1.5 py-0.5 bg-violet-100 text-violet-600 rounded-full">{imageAssets.length}</span>
                            </div>
                            {galleryOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                        </button>

                        {galleryOpen && (
                            <div className="border-t border-slate-200 p-4">
                                {/* Upload button */}
                                <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-violet-400 hover:bg-violet-50/50 transition-colors mb-3">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={async (e) => {
                                            const files = e.target.files;
                                            if (!files || files.length === 0) return;
                                            setUploading(true);
                                            const supabase = createClient();

                                            for (const file of Array.from(files)) {
                                                const ext = file.name.split('.').pop();
                                                const fileName = `email-assets/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
                                                const { data, error } = await supabase.storage.from('public-assets').upload(fileName, file, { upsert: true });

                                                if (error) {
                                                    setStatusMessage({ type: "error", text: `Yükleme hatası: ${error.message}` });
                                                } else if (data) {
                                                    const { data: urlData } = supabase.storage.from('public-assets').getPublicUrl(fileName);
                                                    const { data: assetData } = await supabase
                                                        .from('lead_image_assets')
                                                        .insert({ name: file.name, description: '', url: urlData.publicUrl, file_path: fileName, file_size: file.size })
                                                        .select().single();

                                                    if (assetData) setImageAssets(prev => [assetData, ...prev]);
                                                    setStatusMessage({ type: "success", text: `✅ "${file.name}" depoya eklendi. Açıklama yazıp AI komutunda kullanın.` });
                                                }
                                            }
                                            setUploading(false);
                                            e.target.value = "";
                                        }}
                                    />
                                    {uploading ? (
                                        <><Loader2 size={16} className="animate-spin text-violet-500" /> Yükleniyor...</>
                                    ) : (
                                        <><UploadCloud size={16} className="text-violet-500" /> <span className="text-sm text-slate-500">Yeni görsel yükle</span></>
                                    )}
                                </label>

                                {/* Usage tip */}
                                <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg mb-3">
                                    <p className="text-xs text-blue-600">
                                        💡 Görsellere açıklama yazın, sonra AI komutunda açıklama ile referans verin:
                                        <br /><em>&quot;Header&apos;daki logoyu &apos;uppypro logo&apos; ile değiştir, hero&apos;ya &apos;kampanya banner&apos; ekle&quot;</em>
                                    </p>
                                </div>

                                {/* Gallery list */}
                                <div className="max-h-[350px] overflow-y-auto space-y-2">
                                    {imageAssets.length === 0 ? (
                                        <p className="text-xs text-slate-400 text-center py-4">Henüz görsel yüklenmemiş</p>
                                    ) : imageAssets.map((asset) => (
                                        <div key={asset.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg group hover:bg-violet-50 transition-colors">
                                            <img src={asset.url} alt={asset.name} className="w-12 h-12 object-cover rounded border border-slate-200" />
                                            <div className="flex-1 min-w-0">
                                                <input
                                                    type="text"
                                                    value={asset.description}
                                                    onChange={(e) => setImageAssets(prev => prev.map(a => a.id === asset.id ? { ...a, description: e.target.value } : a))}
                                                    onBlur={async () => {
                                                        const supabase = createClient();
                                                        await supabase.from('lead_image_assets').update({ description: asset.description }).eq('id', asset.id);
                                                    }}
                                                    placeholder="Açıklama ekle (ör: uppypro logo, kampanya banner)"
                                                    className="w-full text-xs px-2 py-1 border border-slate-200 rounded bg-white outline-none focus:ring-1 focus:ring-violet-400"
                                                />
                                                <p className="text-[10px] text-slate-400 mt-1 truncate">{asset.name}</p>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    if (!confirm('Bu görseli silmek istediğinize emin misiniz?')) return;
                                                    const supabase = createClient();
                                                    await supabase.from('lead_image_assets').delete().eq('id', asset.id);
                                                    setImageAssets(prev => prev.filter(a => a.id !== asset.id));
                                                }}
                                                className="p-1 hover:bg-red-50 rounded flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 size={12} className="text-red-400" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Test Email */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5">
                        <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                            <Send size={16} className="text-blue-500" />
                            Test E-postası Gönder
                        </h2>

                        <div className="flex gap-2">
                            <input
                                type="email"
                                value={testEmail}
                                onChange={(e) => setTestEmail(e.target.value)}
                                placeholder="test@email.com"
                                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <button
                                onClick={handleSendTest}
                                disabled={sendingTest || !testEmail || !htmlContent}
                                className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 text-sm"
                            >
                                {sendingTest ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Send size={16} />
                                )}
                                Gönder
                            </button>
                        </div>
                    </div>

                    {/* Template Variables */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5">
                        <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                            <Code size={16} className="text-orange-500" />
                            Değişken Ekle
                        </h2>
                        <p className="text-xs text-slate-400 mb-3">Kampanya gönderilirken bu değişkenler lead bilgileriyle otomatik değiştirilir.</p>
                        <div className="flex flex-wrap gap-1.5">
                            {[
                                { var: "{{firma_adi}}", label: "Firma Adı" },
                                { var: "{{yetkili_adi}}", label: "Yetkili Adı" },
                                { var: "{{email}}", label: "E-posta" },
                                { var: "{{telefon}}", label: "Telefon" },
                                { var: "{{sehir}}", label: "Şehir" },
                                { var: "{{ilce}}", label: "İlçe" },
                                { var: "{{sektor}}", label: "Sektör" },
                                { var: "{{website}}", label: "Website" },
                            ].map(item => (
                                <button
                                    key={item.var}
                                    onClick={() => {
                                        // Copy variable to clipboard
                                        navigator.clipboard.writeText(item.var);
                                        setStatusMessage({ type: "success", text: `📋 "${item.var}" kopyalandı! HTML koduna veya konuya yapıştırın.` });
                                        setTimeout(() => setStatusMessage(null), 3000);
                                    }}
                                    className="px-2.5 py-1.5 text-xs bg-orange-50 border border-orange-200 text-orange-700 rounded-lg hover:bg-orange-100 hover:border-orange-300 transition-colors font-mono"
                                    title={`Tıklayınca kopyalanır: ${item.var}`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-slate-400 mt-2">💡 Tıklayınca kopyalanır → HTML koduna veya konuya yapıştırın.</p>
                    </div>
                </div>

                {/* RIGHT: Preview / Code */}
                <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
                    {/* Preview header */}
                    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 bg-slate-50">
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPreviewMode("preview")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                    previewMode === "preview" ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"
                                }`}
                            >
                                <Eye size={14} className="inline mr-1" /> Önizleme
                            </button>
                            <button
                                onClick={() => setPreviewMode("code")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                    previewMode === "code" ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"
                                }`}
                            >
                                <Code size={14} className="inline mr-1" /> HTML Kodu
                            </button>
                        </div>
                        {subject && (
                            <span className="text-xs text-slate-400 truncate max-w-[200px]">
                                Konu: {subject}
                            </span>
                        )}
                    </div>

                    {/* Content area */}
                    <div className="flex-1 overflow-auto">
                        {!htmlContent ? (
                            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                <Mail size={48} className="text-slate-200 mb-4" />
                                <p className="text-slate-400 text-sm">
                                    Sektör seçip "AI ile Şablon Oluştur" butonuna tıklayın
                                </p>
                            </div>
                        ) : previewMode === "preview" ? (
                            <iframe
                                srcDoc={htmlContent}
                                className="w-full border-0"
                                sandbox="allow-same-origin"
                                onLoad={(e) => {
                                    const iframe = e.target as HTMLIFrameElement;
                                    try {
                                        const height = iframe.contentDocument?.documentElement?.scrollHeight || 800;
                                        iframe.style.height = height + 20 + 'px';
                                    } catch { iframe.style.height = '800px'; }
                                }}
                            />
                        ) : (
                            <textarea
                                value={htmlContent}
                                onChange={(e) => setHtmlContent(e.target.value)}
                                className="w-full h-full p-4 font-mono text-xs text-slate-700 resize-none outline-none"
                                style={{ minHeight: "750px" }}
                                spellCheck={false}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
