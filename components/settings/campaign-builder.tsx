"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, FileSpreadsheet, LayoutTemplate, Send, CheckCircle2, ChevronRight, ChevronLeft, Upload, AlertCircle, Loader2, Image as ImageIcon, Video, FileText, Link as LinkIcon, Phone, MousePointerClick, BookOpen, Save, X, Eye } from "lucide-react";
import { getWhatsAppTemplates } from "@/app/actions/whatsapp-templates";
import { createCampaign } from "@/app/actions/campaigns";
import { getCustomerLists, saveCustomerList, getCustomerListById } from "@/app/actions/customer-lists";
import { createClient } from "@/lib/supabase/client";
import * as XLSX from "xlsx";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

interface CampaignBuilderProps {
    tenantId: string;
}

export function CampaignBuilder({ tenantId }: CampaignBuilderProps) {
    const [step, setStep] = useState(1);
    const [campaignName, setCampaignName] = useState("");

    const [approvedTemplates, setApprovedTemplates] = useState<any[]>([]);
    const [templatesLoading, setTemplatesLoading] = useState(true);

    useEffect(() => {
        const fetchTemplates = async () => {
            setTemplatesLoading(true);
            const res = await getWhatsAppTemplates(tenantId);
            if (res.success && res.data) {
                const approved = res.data.filter((tpl: any) => tpl.status === "APPROVED");
                setApprovedTemplates(approved);
            }
            setTemplatesLoading(false);
        };
        fetchTemplates();
    }, [tenantId]);
    const [selectedTemplate, setSelectedTemplate] = useState<string>("");

    const [audienceType, setAudienceType] = useState<"customers" | "excel" | "saved_list">("customers");

    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [excelPreviewRows, setExcelPreviewRows] = useState<any[]>([]);
    const [excelHeaders, setExcelHeaders] = useState<string[]>([]);

    const [customerFilters, setCustomerFilters] = useState({
        segment: "all",
        tag: "",
        dateRange: "all"
    });

    // Customer preview list state
    const [customerPreview, setCustomerPreview] = useState<any[]>([]);
    const [customersLoading, setCustomersLoading] = useState(false);

    // Saved lists state
    const [savedLists, setSavedLists] = useState<any[]>([]);
    const [selectedSavedListId, setSelectedSavedListId] = useState<string>("");
    const [selectedSavedListRows, setSelectedSavedListRows] = useState<any[]>([]);

    // Dynamically select phone column
    const [selectedPhoneColumn, setSelectedPhoneColumn] = useState<string>("");

    // Save list dialog
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [saveListName, setSaveListName] = useState("");
    const [isSavingList, setIsSavingList] = useState(false);

    // Phone normalizer for preview
    const normalizePhone = (raw: string) => {
        if (!raw) return "";
        let d = String(raw).replace(/\D/g, "");
        if (!d) return "";
        if (d.startsWith("90") && d.length === 12) return d;
        if (d.startsWith("0")) return "90" + d.slice(1);
        if (d.length === 10 && d.startsWith("5")) return "90" + d;
        return d;
    };

    // Parse Excel file on change
    useEffect(() => {
        if (!excelFile) { setExcelPreviewRows([]); setExcelHeaders([]); return; }
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'array' });
            const ws = workbook.Sheets[workbook.SheetNames[0]];
            const rows: any[] = XLSX.utils.sheet_to_json(ws);
            if (rows.length > 0) setExcelHeaders(Object.keys(rows[0]));
            setExcelPreviewRows(rows);
        };
        reader.readAsArrayBuffer(excelFile);
    }, [excelFile]);

    // Fetch customers for preview when in customers mode & step=2
    const fetchCustomerPreview = useCallback(async () => {
        if (audienceType !== 'customers') return;
        setCustomersLoading(true);
        const supabase = createClient();
        let query = supabase
            .from('customers')
            .select('id, full_name, phone, created_at')
            .eq('tenant_id', tenantId);

        if (customerFilters.dateRange === 'today') {
            const today = new Date(); today.setHours(0, 0, 0, 0);
            query = query.gte('created_at', today.toISOString());
        } else if (customerFilters.dateRange === 'this_week') {
            const d = new Date(); d.setDate(d.getDate() - 7);
            query = query.gte('created_at', d.toISOString());
        } else if (customerFilters.dateRange === 'this_month') {
            const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0);
            query = query.gte('created_at', d.toISOString());
        }

        const { data } = await query.order('created_at', { ascending: false });
        setCustomerPreview(data || []);
        setCustomersLoading(false);
    }, [audienceType, tenantId, customerFilters]);

    useEffect(() => {
        if (step === 2 && audienceType === 'customers') fetchCustomerPreview();
    }, [step, audienceType, fetchCustomerPreview]);

    // Fetch saved lists
    useEffect(() => {
        if (step === 2) {
            getCustomerLists(tenantId).then(res => {
                if (res.success) setSavedLists(res.data);
            });
        }
    }, [step, tenantId]);

    // When a saved list is selected, load its rows
    useEffect(() => {
        if (!selectedSavedListId) { setSelectedSavedListRows([]); return; }

        async function fetchListRows() {
            const res = await getCustomerListById(tenantId, selectedSavedListId);
            if (res.success && res.data) {
                setSelectedSavedListRows(res.data.rows || []);
            } else {
                setSelectedSavedListRows([]);
            }
        }
        fetchListRows();
    }, [selectedSavedListId, tenantId]);

    const handleSaveExcelList = async () => {
        if (!saveListName.trim() || excelPreviewRows.length === 0) return;
        setIsSavingList(true);
        const rows = excelPreviewRows.map(r => {
            const phoneKey = Object.keys(r).find(k => k.toLowerCase().includes('telefon') || k.toLowerCase().includes('phone')) || '';
            return { ...r, _normalized_phone: normalizePhone(String(r[phoneKey] || '')) };
        });
        const res = await saveCustomerList({ tenantId, name: saveListName, rows });
        setIsSavingList(false);
        if (res.success) {
            toast({ title: "Liste kaydedildi!", description: `"${saveListName}" listesi başarıyla oluşturuldu.` });
            setShowSaveDialog(false);
            setSaveListName("");
            getCustomerLists(tenantId).then(r => { if (r.success) setSavedLists(r.data); });
        } else {
            toast({ title: "Hata", description: res.error, variant: "destructive" });
        }
    };

    const activeTemplate = approvedTemplates.find(t => t.id === selectedTemplate);

    const getTemplateVariables = () => {
        if (!activeTemplate) return [];
        const text = activeTemplate.components?.map((c: any) => c.text || c.buttons?.map((b: any) => b.url || b.text).join(" ")).join(" ") || "";
        const regex = /\{\{([^}]*)\}\}/g;
        const matches: string[] = [];
        let match;
        while ((match = regex.exec(text)) !== null) {
            matches.push(match[1]);
        }
        return [...new Set(matches)].sort((a, b) => {
            const numA = Number(a);
            const numB = Number(b);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.localeCompare(b);
        });
    };

    const templateVariables = getTemplateVariables();

    // Görsel gerektiren ama görseli yüklenmemiş şablon kontrolü
    const hasMediaComponent = activeTemplate?.components?.some((c: any) => c.type === "HEADER" && (c.format === "IMAGE" || c.format === "VIDEO" || c.format === "DOCUMENT"));
    const hasUploadedMedia = !!(activeTemplate as any)?.uppypro_media?.file_url;
    const isMissingMedia = hasMediaComponent && !hasUploadedMedia;

    const [variableMappings, setVariableMappings] = useState<Record<string, { column: string, customValue: string }>>({});

    const handleMappingChange = (variable: string, column: string) => {
        setVariableMappings(prev => ({
            ...prev,
            [variable]: { column, customValue: prev[variable]?.customValue || "" }
        }));
    };

    const handleCustomValueChange = (variable: string, customValue: string) => {
        setVariableMappings(prev => ({
            ...prev,
            [variable]: { column: prev[variable]?.column || "name", customValue }
        }));
    };

    const getPreviewBodyText = () => {
        let text = activeTemplate?.components?.find((c: any) => c.type === "BODY")?.text || "Gövde bulunmuyor.";

        templateVariables.forEach(variable => {
            const mapping = variableMappings[variable];
            let displayValue = `{{${variable}}}`; // default fallback

            const col = mapping?.column || "name"; // default name
            if (col === "name") displayValue = "(Adı Soyadı)";
            else if (col === "phone") displayValue = "(Telefon Numarası)";
            else if (col === "custom") {
                displayValue = mapping?.customValue ? mapping.customValue : "[Özel Değer]";
            }

            text = text.replace(new RegExp(`\\{\\{${variable}\\}\\}`, 'g'), displayValue);
        });

        return text;
    };

    const handleNext = () => setStep((s) => Math.min(s + 1, 4));
    const handlePrev = () => setStep((s) => Math.max(s - 1, 1));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const handleStartCampaign = async () => {
        if (!selectedTemplate) return;
        setIsSubmitting(true);

        try {
            let parsedExcelData: any[] = [];

            // Eğer excel ise veriyi parse et
            if (audienceType === 'excel' && excelFile) {
                const data = await excelFile.arrayBuffer();
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                parsedExcelData = XLSX.utils.sheet_to_json(worksheet);
            }

            const response = await createCampaign({
                tenantId: tenantId,
                campaignName: campaignName || "İsimsiz Kampanya",
                templateId: activeTemplate?.name || selectedTemplate,
                templateName: activeTemplate?.name,
                templateLanguage: activeTemplate?.language,
                audienceType: audienceType,
                customerFilters: customerFilters,
                excelData: audienceType === 'excel' ? parsedExcelData : undefined,
                savedListData: audienceType === 'saved_list' ? selectedSavedListRows : undefined,
                variableMappings: variableMappings,
                phoneColumn: selectedPhoneColumn || undefined
            });

            if (response.success) {
                toast({
                    title: "Kampanya Başlatıldı! 🚀",
                    description: "Mesajlarınız sıraya alındı, gönderim arka planda devam edecek.",
                    variant: "default",
                });
                // Raporlar sekmesine veya ilk ekrana dönmek için:
                setStep(1);
                setCampaignName("");
                setExcelFile(null);
                // router.push("/panel/settings") veya sekmeyi değiştir fonksiyonu eklenebilir.
            } else {
                toast({
                    title: "Hata Oluştu",
                    description: response.error || "Kampanya başlatılırken bir sorun oluştu.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error(error);
            toast({
                title: "Beklenmeyen Hata",
                description: "Sistemsel bir sorun oluştu.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50 border-b">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                        <CardTitle>Yeni Kampanya Oluştur</CardTitle>
                        <CardDescription>Onaylı şablonlarınızı kullanarak müşterilerinize toplu duyurular veya pazarlama mesajları gönderin.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        {[1, 2, 3, 4].map((s) => (
                            <div key={s} className="flex items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mx-1 ${step >= s ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500'}`}>
                                    {s}
                                </div>
                                {s < 4 && <div className={`w-4 h-[2px] ${step > s ? 'bg-primary' : 'bg-slate-200'}`} />}
                            </div>
                        ))}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-6 md:p-8 min-h-[400px]">
                {/* STEP 1: Şablon Seçimi */}
                {step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-2 max-w-md">
                            <Label className="text-base font-semibold">Kampanya Adı</Label>
                            <Input
                                placeholder="Örn: 2026 Yaz İndirimi Duyurusu"
                                value={campaignName}
                                onChange={(e) => setCampaignName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-4">
                            <Label className="text-base font-semibold">Kullanılacak Şablon</Label>
                            <p className="text-sm text-slate-500 mb-4">Sadece Meta tarafından "Onaylandı" (Approved) statüsündeki şablonlar ile kampanya başlatabilirsiniz.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {templatesLoading ? (
                                    <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-center py-8 text-slate-400">
                                        <Loader2 className="w-8 h-8 animate-spin" />
                                    </div>
                                ) : approvedTemplates.length === 0 ? (
                                    <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-8 text-slate-500 border rounded-lg bg-orange-50/50 border-orange-100">
                                        Onaylı (APPROVED) bir şablon bulunamadı. Lütfen önce "Yeni Şablon Oluştur" sekmesinden şablon oluşturup Meta onayına gönderin.
                                    </div>
                                ) : (
                                    approvedTemplates.map(tpl => (
                                        <div
                                            key={tpl.id}
                                            className={`border rounded-lg p-5 cursor-pointer flex flex-col gap-3 transition-all h-full ${selectedTemplate === tpl.id ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm' : 'border-slate-200 hover:border-primary/40 bg-white'}`}
                                            onClick={() => setSelectedTemplate(tpl.id)}
                                        >
                                            {/* Header */}
                                            <div className="flex justify-between items-start">
                                                <div className="font-bold text-slate-900 flex items-center gap-2 break-all">
                                                    <LayoutTemplate className={`w-4 h-4 ${selectedTemplate === tpl.id ? 'text-primary' : 'text-slate-500'}`} />
                                                    {tpl.name}
                                                </div>
                                                {selectedTemplate === tpl.id && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
                                                {selectedTemplate !== tpl.id && <Badge variant="secondary" className="bg-green-100 text-green-800 shrink-0">APPROVED</Badge>}
                                            </div>

                                            {/* Labels */}
                                            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium tracking-wide">
                                                <span className="uppercase">{tpl.category}</span>
                                                <span>•</span>
                                                <span className="uppercase">{tpl.language}</span>
                                            </div>

                                            {/* Media Tag */}
                                            {tpl.components?.find((c: any) => c.type === "HEADER" && (c.format === "IMAGE" || c.format === "VIDEO" || c.format === "DOCUMENT")) && (
                                                <div className={`flex flex-col gap-2 p-2 rounded-md border mt-1 ${selectedTemplate === tpl.id ? 'bg-white border-primary/20' : 'bg-slate-100/70 border-slate-100 text-slate-600'}`}>
                                                    <div className="flex items-center gap-2">
                                                        {tpl.components?.find((c: any) => c.type === "HEADER").format === "IMAGE" && <ImageIcon className="w-4 h-4 text-blue-500" />}
                                                        {tpl.components?.find((c: any) => c.type === "HEADER").format === "VIDEO" && <Video className="w-4 h-4 text-red-500" />}
                                                        {tpl.components?.find((c: any) => c.type === "HEADER").format === "DOCUMENT" && <FileText className="w-4 h-4 text-orange-500" />}
                                                        <span className="text-xs font-semibold">
                                                            {tpl.components?.find((c: any) => c.type === "HEADER").format === "IMAGE" && "Görselli Şablon"}
                                                            {tpl.components?.find((c: any) => c.type === "HEADER").format === "VIDEO" && "Videolu Şablon"}
                                                            {tpl.components?.find((c: any) => c.type === "HEADER").format === "DOCUMENT" && "Belgeli Şablon"}
                                                        </span>
                                                    </div>

                                                    {/* Image Display */}
                                                    {tpl.components?.find((c: any) => c.type === "HEADER").format === "IMAGE" && (tpl as any).uppypro_media?.file_url && (
                                                        <div className="relative w-full h-32 rounded bg-slate-100 overflow-hidden border border-slate-200 mt-1">
                                                            <img src={(tpl as any).uppypro_media.file_url} alt="Template Image" className="w-full h-full object-cover" />
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Body Text */}
                                            <div className={`text-sm p-3 rounded-md line-clamp-none whitespace-pre-wrap flex-1 min-h-[80px] overflow-y-auto max-h-[200px] ${selectedTemplate === tpl.id ? 'bg-white border-primary/20 text-slate-800 border' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                                                {tpl.components?.find((c: any) => c.type === "BODY")?.text || "Gövde bulunmuyor."}
                                            </div>

                                            {/* Buttons */}
                                            {tpl.components?.find((c: any) => c.type === "BUTTONS") && (
                                                <div className="flex flex-col gap-1.5 mt-1">
                                                    {tpl.components.find((c: any) => c.type === "BUTTONS").buttons.map((btn: any, idx: number) => (
                                                        <div key={idx} className={`flex items-center gap-1.5 text-[11px] p-2 rounded border font-semibold ${selectedTemplate === tpl.id ? 'bg-white border-primary/20 text-primary' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                                                            {btn.type === "URL" && <LinkIcon className="w-3.5 h-3.5 shrink-0" />}
                                                            {btn.type === "PHONE_NUMBER" && <Phone className="w-3.5 h-3.5 shrink-0" />}
                                                            {btn.type === "QUICK_REPLY" && <MousePointerClick className="w-3.5 h-3.5 shrink-0" />}
                                                            <span className="truncate">{btn.text}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {selectedTemplate && isMissingMedia && (
                            <div className="mt-4 p-4 border border-red-200 bg-red-50 text-red-800 rounded-xl flex items-start gap-3 animate-in fade-in">
                                <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                                <div className="text-sm">
                                    <strong className="block mb-1">Eksik Medya Tespit Edildi</strong>
                                    Seçtiğiniz şablon görselli (veya medyalı) bir şablondur. Ancak &quot;Mevcut Şablonlar&quot; sekmesinden bu şablona henüz görsel yüklemesi yapmamışsınız. Şablonu gönderebilmek için önce ilgili sekmeye gidip görselinizi yüklemelisiniz.
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 2: Kitle Seçimi */}
                {step === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <Label className="text-lg font-semibold block">Hedef Kitleyi Belirleyin</Label>
                        <p className="text-sm text-slate-500">Mesajı kime göndermek istiyorsunuz? Sistemde kayıtlı müşterilerinizi seçebilir, yeni bir dosya yükleyebilir veya daha önce kaydettiğiniz bir listeyi kullanabilirsiniz.</p>

                        {/* Audience Type Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            {/* Kayıtlı Müşteriler */}
                            <div
                                className={`border-2 rounded-xl p-6 cursor-pointer flex flex-col items-center justify-center text-center transition-all ${audienceType === 'customers' ? 'border-primary bg-primary/5 shadow-sm' : 'border-dashed border-slate-300 hover:border-slate-400'
                                    }`}
                                onClick={() => setAudienceType('customers')}
                            >
                                <Users className={`w-10 h-10 mb-3 ${audienceType === 'customers' ? 'text-primary' : 'text-slate-400'}`} />
                                <h3 className="text-base font-bold mb-1">Kayıtlı Müşteriler</h3>
                                <p className="text-xs text-slate-500">CRM'deki müşterilere gönderin.</p>
                            </div>

                            {/* Excel Yükle */}
                            <div
                                className={`border-2 rounded-xl p-6 cursor-pointer flex flex-col items-center justify-center text-center transition-all ${audienceType === 'excel' ? 'border-primary bg-primary/5 shadow-sm' : 'border-dashed border-slate-300 hover:border-slate-400'
                                    }`}
                                onClick={() => setAudienceType('excel')}
                            >
                                <FileSpreadsheet className={`w-10 h-10 mb-3 ${audienceType === 'excel' ? 'text-primary' : 'text-slate-400'}`} />
                                <h3 className="text-base font-bold mb-1">Excel / CSV Yükle</h3>
                                <p className="text-xs text-slate-500">Yeni bir liste dosyası yükleyin.</p>
                            </div>

                            {/* Kayıtlı Liste */}
                            <div
                                className={`border-2 rounded-xl p-6 cursor-pointer flex flex-col items-center justify-center text-center transition-all ${audienceType === 'saved_list' ? 'border-primary bg-primary/5 shadow-sm' : 'border-dashed border-slate-300 hover:border-slate-400'
                                    }`}
                                onClick={() => setAudienceType('saved_list')}
                            >
                                <BookOpen className={`w-10 h-10 mb-3 ${audienceType === 'saved_list' ? 'text-primary' : 'text-slate-400'}`} />
                                <h3 className="text-base font-bold mb-1">Kayıtlı Liste</h3>
                                <p className="text-xs text-slate-500">Önceden kaydettiğiniz bir listeyi kullanın.</p>
                            </div>
                        </div>

                        {/* === KAYITLI MÜŞTERİLER === */}
                        {audienceType === 'customers' && (
                            <div className="space-y-4 mt-2">
                                <div className="border border-slate-200 rounded-xl p-5 bg-slate-50">
                                    <h4 className="font-semibold text-slate-900 mb-4">Müşterileri Filtrele</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-slate-600">Segment</Label>
                                            <Select value={customerFilters.segment} onValueChange={(v) => setCustomerFilters({ ...customerFilters, segment: v })}>
                                                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Tüm Segmentler</SelectItem>
                                                    <SelectItem value="VIP">VIP</SelectItem>
                                                    <SelectItem value="Potansiyel">Potansiyel</SelectItem>
                                                    <SelectItem value="Kurumsal">Kurumsal</SelectItem>
                                                    <SelectItem value="Bireysel">Bireysel</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-600">Etiket (Tag)</Label>
                                            <Input value={customerFilters.tag} onChange={(e) => setCustomerFilters({ ...customerFilters, tag: e.target.value })} placeholder="Örn: yeni_kampanya" className="bg-white" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-600">Kayıt Tarihi</Label>
                                            <Select value={customerFilters.dateRange} onValueChange={(v) => setCustomerFilters({ ...customerFilters, dateRange: v })}>
                                                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Tüm Zamanlar</SelectItem>
                                                    <SelectItem value="today">Bugün</SelectItem>
                                                    <SelectItem value="this_week">Bu Hafta</SelectItem>
                                                    <SelectItem value="this_month">Bu Ay</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        )}

                        {/* === EXCEL YÜKLE === */}
                        {audienceType === 'excel' && (
                            <div className="space-y-4 mt-2">
                                <div className="border border-dashed border-blue-300 bg-blue-50/50 rounded-xl p-8 flex flex-col items-center text-center">
                                    <Upload className={`w-10 h-10 mb-3 ${excelFile ? 'text-green-500' : 'text-blue-500'}`} />
                                    <h4 className="font-semibold mb-1">{excelFile ? excelFile.name : 'Dosyanızı sürükleyin veya seçin'}</h4>
                                    <p className="text-sm text-slate-500 mb-4">{excelFile ? `${(excelFile.size / 1024).toFixed(1)} KB` : '.xlsx, .xls, .csv desteklenir.'}</p>
                                    <Label htmlFor="excel-upload" className="cursor-pointer">
                                        <div className={`border rounded-lg px-6 py-2.5 text-sm font-medium transition-colors ${excelFile ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                            }`}>
                                            {excelFile ? 'Başka Dosya Seç' : 'Dosya Seç'}
                                        </div>
                                        <input id="excel-upload" type="file" className="hidden" accept=".xlsx,.xls,.csv"
                                            onChange={(e) => setExcelFile(e.target.files?.[0] || null)} />
                                    </Label>
                                </div>
                            </div>
                        )}

                        {/* === KAYITLI LİSTE === */}
                        {audienceType === 'saved_list' && (
                            <div className="space-y-4 mt-2">
                                {savedLists.length === 0 ? (
                                    <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center text-slate-400 text-sm">
                                        Henüz kayıtlı liste bulunmuyor. Excel yükleyip kaydedebilirsiniz.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold">Bir liste seçin</Label>
                                        <Select value={selectedSavedListId} onValueChange={setSelectedSavedListId}>
                                            <SelectTrigger><SelectValue placeholder="Liste Seçin..." /></SelectTrigger>
                                            <SelectContent>
                                                {savedLists.map((l: any) => (
                                                    <SelectItem key={l.id} value={l.id}>
                                                        {l.name} <span className="text-slate-400 ml-1">({l.row_count} kişi)</span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 3: Eşleştirme */}
                {step === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <Label className="text-lg font-semibold block">Değişken Eşleştirme</Label>
                        <p className="text-sm text-slate-500 mb-6">Seçtiğiniz şablonda bulunan dinamik değişkenleri (örn. {"{{1}}"}) gönderim yapacağınız listedeki verilerle eşleştirin.</p>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                            {/* Sol Taraf: Değişken Eşleştirme Formu */}
                            <div className="lg:col-span-2 space-y-4 bg-white border border-slate-200 p-6 rounded-lg shadow-sm">
                                <div className="flex items-center justify-between border-b pb-4 mb-4">
                                    <div className="font-semibold text-slate-700">Şablon Değişkeni</div>
                                    <div className="font-semibold text-slate-700">Tablo Sütunu</div>
                                </div>

                                {templateVariables.length === 0 ? (
                                    <div className="text-center text-sm text-slate-500 py-4">
                                        Bu şablonda eşleştirilecek herhangi bir değişken bulunmuyor. İlerleyebilirsiniz.
                                    </div>
                                ) : (
                                    templateVariables.map((variable) => (
                                        <div key={variable} className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-2 w-1/3">
                                                <Badge variant="secondary" className="font-mono text-sm px-2 py-1 shrink-0">{"{{"}{variable}{"}}"}</Badge>
                                            </div>
                                            <div className="flex-1 flex flex-col gap-2">
                                                <Select
                                                    value={variableMappings[variable]?.column || "name"}
                                                    onValueChange={(val) => handleMappingChange(variable, val)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Sütun Seç" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="name">Adı Soyadı</SelectItem>
                                                        <SelectItem value="phone">Telefon Numarası</SelectItem>
                                                        <SelectItem value="custom">Özel Değer (Sabit Metin)</SelectItem>
                                                    </SelectContent>
                                                </Select>

                                                {variableMappings[variable]?.column === "custom" && (
                                                    <Input
                                                        placeholder="Sabit metin giriniz..."
                                                        value={variableMappings[variable]?.customValue || ""}
                                                        onChange={(e) => handleCustomValueChange(variable, e.target.value)}
                                                        className="h-9 text-sm"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}

                                {audienceType === 'excel' && (
                                    <div className="flex flex-col border-t mt-4 pt-4 gap-2">
                                        <Label className="text-sm text-slate-500">Varsayılan Telefon Numarası Sütunu <span className="text-red-500">* ZORUNLU</span></Label>
                                        <p className="text-xs text-slate-400 mb-1">Listedeki mesaj gönderilecek telefon numaralarının bulunduğu sütunu seçin.</p>
                                        <Select value={selectedPhoneColumn} onValueChange={setSelectedPhoneColumn}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Telefon numaralarının bulunduğu sütunu seçin..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {excelHeaders?.map(header => (
                                                    <SelectItem key={header} value={header}>{header}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>

                            {/* Sağ Taraf: Şablon Önizlemesi */}
                            <div className="lg:col-span-1">
                                <Label className="text-sm font-semibold text-slate-700 mb-3 block">Şablon Önizlemesi</Label>
                                {activeTemplate ? (
                                    <div className="border border-slate-200 rounded-lg p-5 flex flex-col gap-3 bg-white shadow-sm sticky top-6">
                                        {/* Header */}
                                        <div className="flex justify-between items-start">
                                            <div className="font-bold text-slate-900 flex items-center gap-2 break-all">
                                                <LayoutTemplate className="w-4 h-4 text-primary" />
                                                {activeTemplate.name}
                                            </div>
                                        </div>

                                        {/* Labels */}
                                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium tracking-wide">
                                            <span className="uppercase">{activeTemplate.category}</span>
                                            <span>•</span>
                                            <span className="uppercase">{activeTemplate.language}</span>
                                        </div>

                                        {/* Media Tag */}
                                        {activeTemplate.components?.find((c: any) => c.type === "HEADER" && (c.format === "IMAGE" || c.format === "VIDEO" || c.format === "DOCUMENT")) && (
                                            <div className="flex flex-col gap-2 p-2 rounded-md border mt-1 bg-white border-primary/20">
                                                <div className="flex items-center gap-2">
                                                    {activeTemplate.components?.find((c: any) => c.type === "HEADER").format === "IMAGE" && <ImageIcon className="w-4 h-4 text-blue-500" />}
                                                    {activeTemplate.components?.find((c: any) => c.type === "HEADER").format === "VIDEO" && <Video className="w-4 h-4 text-red-500" />}
                                                    {activeTemplate.components?.find((c: any) => c.type === "HEADER").format === "DOCUMENT" && <FileText className="w-4 h-4 text-orange-500" />}
                                                    <span className="text-xs font-semibold">
                                                        {activeTemplate.components?.find((c: any) => c.type === "HEADER").format === "IMAGE" && "Görselli Şablon"}
                                                        {activeTemplate.components?.find((c: any) => c.type === "HEADER").format === "VIDEO" && "Videolu Şablon"}
                                                        {activeTemplate.components?.find((c: any) => c.type === "HEADER").format === "DOCUMENT" && "Belgeli Şablon"}
                                                    </span>
                                                </div>

                                                {/* Image Display */}
                                                {activeTemplate.components?.find((c: any) => c.type === "HEADER").format === "IMAGE" && (activeTemplate as any).uppypro_media?.file_url && (
                                                    <div className="relative w-full h-40 rounded bg-slate-100 overflow-hidden border border-slate-200 mt-1">
                                                        <img src={(activeTemplate as any).uppypro_media.file_url} alt="Template Preview" className="w-full h-full object-cover" />
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Body Text */}
                                        <div className="text-sm p-3 rounded-md line-clamp-none whitespace-pre-wrap flex-1 min-h-[80px] overflow-y-auto max-h-[300px] bg-white border border-primary/20 text-slate-800">
                                            {getPreviewBodyText()}
                                        </div>

                                        {/* Buttons */}
                                        {activeTemplate.components?.find((c: any) => c.type === "BUTTONS") && (
                                            <div className="flex flex-col gap-1.5 mt-1">
                                                {activeTemplate.components.find((c: any) => c.type === "BUTTONS").buttons.map((btn: any, idx: number) => (
                                                    <div key={idx} className="flex items-center gap-1.5 text-[11px] p-2 rounded border font-semibold bg-white border-primary/20 text-primary">
                                                        {btn.type === "URL" && <LinkIcon className="w-3.5 h-3.5 shrink-0" />}
                                                        {btn.type === "PHONE_NUMBER" && <Phone className="w-3.5 h-3.5 shrink-0" />}
                                                        {btn.type === "QUICK_REPLY" && <MousePointerClick className="w-3.5 h-3.5 shrink-0" />}
                                                        <span className="truncate">{btn.text}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-4 border border-dashed rounded-lg text-sm text-slate-500 text-center">
                                        Şablon seçilmedi
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 4: Onay ve Gönder */}
                {step === 4 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="text-center py-6">
                            <Send className="w-16 h-16 text-primary mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Her Şey Hazır!</h2>
                            <p className="text-slate-500 max-w-lg mx-auto">Kampanyanız başlatılmak üzere. Lütfen aşağıdaki özeti kontrol edip onaylayın.</p>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 max-w-2xl mx-auto">
                            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                                <div>
                                    <p className="text-sm text-slate-500 mb-1">Kampanya Adı</p>
                                    <p className="font-semibold text-slate-900">{campaignName || "İsimsiz Kampanya"}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 mb-1">Seçilen Şablon</p>
                                    <p className="font-semibold text-slate-900">{approvedTemplates.find(t => t.id === selectedTemplate)?.name || "Bilinmiyor"}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 mb-1">Hedef Kitle Kaynağı</p>
                                    <p className="font-semibold text-slate-900 capitalize flex items-center gap-2">
                                        {audienceType === 'customers' ? <Users className="w-4 h-4" /> : audienceType === 'excel' ? <FileSpreadsheet className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                                        {audienceType === 'customers' ? 'Sistem Müşterileri' : audienceType === 'excel' ? 'Excel Yüklemesi' : 'Kayıtlı Liste'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 mb-1">Tahmini Gönderim</p>
                                    <p className="font-semibold text-slate-900">
                                        {audienceType === 'customers' ? customerPreview.length : audienceType === 'excel' ? excelPreviewRows.length : selectedSavedListRows.length} kişi
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-orange-50 border border-orange-200 text-orange-800 rounded-lg text-sm flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                <div>
                                    <strong>Önemli Kullanım Bilgisi:</strong> Bu butona tıkladığınızda sistem sıraya alma işlemini başlatacaktır. Başlatılan işlemler durdurulamaz. İşletme faturanız doğrudan Meta Business yönünden ücretlendirilecektir. Şablon spam limitlerini aşmanız durumunda Meta tarafından WABA limitlerine takılabilirsiniz.
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>

            <CardFooter className="bg-slate-50 border-t flex justify-between py-4">
                <Button
                    variant="outline"
                    onClick={handlePrev}
                    disabled={step === 1}
                >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Geri
                </Button>

                {step < 4 ? (
                    <Button
                        onClick={handleNext}
                        disabled={(step === 1 && (!selectedTemplate || isMissingMedia)) || (step === 3 && audienceType === 'excel' && !selectedPhoneColumn)}
                    >
                        İleri
                        <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                ) : (
                    <Button
                        onClick={handleStartCampaign}
                        disabled={isSubmitting}
                        className="bg-[#25D366] hover:bg-[#128C7E] text-white"
                    >
                        {isSubmitting ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Başlatılıyor...</>
                        ) : (
                            <><CheckCircle2 className="w-4 h-4 mr-2" /> Onayla ve Kampanyayı Başlat</>
                        )}
                    </Button>
                )}
            </CardFooter>

            {/* Step 2 Preview Tables — butonların altında, sayfa uzamasın diye buraya alındı */}
            {step === 2 && (
                <div className="px-6 md:px-8 pb-6 space-y-4">
                    {/* Kayıtlı Müşteriler Önizleme */}
                    {audienceType === 'customers' && (
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b">
                                <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <Eye className="w-4 h-4 text-primary" /> Önizleme
                                </span>
                                <span className="text-xs font-medium text-slate-500 bg-white border rounded-full px-3 py-0.5">
                                    {customersLoading ? '...' : `${customerPreview.length} müşteri`}
                                </span>
                            </div>
                            {customersLoading ? (
                                <div className="flex items-center justify-center py-8 text-slate-400">
                                    <Loader2 className="w-5 h-5 animate-spin mr-2" /> Yükleniyor...
                                </div>
                            ) : customerPreview.length === 0 ? (
                                <div className="py-8 text-center text-slate-400 text-sm">Bu filtreye uygun müşteri bulunamadı.</div>
                            ) : (
                                <div className="overflow-auto max-h-72">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 text-xs text-slate-500 sticky top-0">
                                            <tr>
                                                <th className="text-left px-4 py-2 font-semibold">Ad Soyad</th>
                                                <th className="text-left px-4 py-2 font-semibold">Telefon (WhatsApp)</th>
                                                <th className="text-left px-4 py-2 font-semibold">Kayıt Tarihi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {customerPreview.slice(0, 200).map((c, i) => (
                                                <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                                                    <td className="px-4 py-2">{c.full_name || '—'}</td>
                                                    <td className="px-4 py-2 font-mono text-xs text-slate-600">{normalizePhone(c.phone || '')}</td>
                                                    <td className="px-4 py-2 text-slate-400 text-xs">{c.created_at ? new Date(c.created_at).toLocaleDateString('tr-TR') : '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {customerPreview.length > 200 && (
                                        <div className="text-center py-2 text-xs text-slate-400 border-t">+{customerPreview.length - 200} kişi daha (toplam {customerPreview.length})</div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Excel Önizleme */}
                    {audienceType === 'excel' && excelPreviewRows.length > 0 && (
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b">
                                <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <Eye className="w-4 h-4 text-primary" /> Önizleme — {excelPreviewRows.length} satır
                                </span>
                                <Button size="sm" variant="outline" className="h-7 text-xs flex items-center gap-1" onClick={() => setShowSaveDialog(true)}>
                                    <Save className="w-3 h-3" /> Bu Listeyi Kaydet
                                </Button>
                            </div>
                            <div className="overflow-auto max-h-72">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 text-xs text-slate-500 sticky top-0">
                                        <tr>
                                            {excelHeaders.map(h => (
                                                <th key={h} className="text-left px-3 py-2 font-semibold whitespace-nowrap">{h}</th>
                                            ))}
                                            <th className="text-left px-3 py-2 font-semibold bg-green-50 text-green-700">Telefon (WhatsApp)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {excelPreviewRows.slice(0, 200).map((row, i) => {
                                            const phoneKey = excelHeaders.find(k => k.toLowerCase().includes('telefon') || k.toLowerCase().includes('phone')) || '';
                                            const normalized = normalizePhone(String(row[phoneKey] || ''));
                                            const isValid = normalized.length >= 10;
                                            return (
                                                <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                                                    {excelHeaders.map(h => (
                                                        <td key={h} className="px-3 py-2 text-xs whitespace-nowrap max-w-[160px] truncate">{String(row[h] ?? '')}</td>
                                                    ))}
                                                    <td className={`px-3 py-2 font-mono text-xs ${isValid ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                                                        {normalized || '—'}{!isValid && <span className="ml-1 text-[10px]">⚠</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {excelPreviewRows.length > 200 && (
                                    <div className="text-center py-2 text-xs text-slate-400 border-t">+{excelPreviewRows.length - 200} daha gösterilmiyor</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Kayıtlı Liste Önizleme */}
                    {audienceType === 'saved_list' && selectedSavedListRows.length > 0 && (
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b">
                                <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <Eye className="w-4 h-4 text-primary" /> Liste Önizlemesi — {selectedSavedListRows.length} kişi
                                </span>
                            </div>
                            <div className="overflow-auto max-h-72">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 text-xs text-slate-500 sticky top-0">
                                        <tr>
                                            <th className="text-left px-4 py-2 font-semibold">Ad Soyad</th>
                                            <th className="text-left px-4 py-2 font-semibold">Telefon (WhatsApp)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedSavedListRows.slice(0, 200).map((row: any, i: number) => {
                                            const nameKey = Object.keys(row).find(k => k.toLowerCase().includes('ad') || k.toLowerCase().includes('name')) || '';
                                            const phoneKey = Object.keys(row).find(k => k.toLowerCase().includes('tel') || k.toLowerCase().includes('phone')) || '';
                                            return (
                                                <tr key={i} className="border-t border-slate-100">
                                                    <td className="px-4 py-2">{row.full_name || row[nameKey] || '—'}</td>
                                                    <td className="px-4 py-2 font-mono text-xs">{row._normalized_phone || normalizePhone(String(row[phoneKey] || ''))}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {selectedSavedListRows.length > 200 && (
                                    <div className="text-center py-2 text-xs text-slate-400 border-t">+{selectedSavedListRows.length - 200} daha gösterilmiyor</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
}
