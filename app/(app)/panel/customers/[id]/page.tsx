"use client";

import { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Building2, User, Plus, Trash2, ChevronDown, CheckCircle2, Loader2, MessageCircle, Instagram, History, Check, CheckCheck, AlertCircle, Clock, Send, FileText, Mail, X, Tag, LayoutTemplate, ChevronRight, ChevronLeft, Image as ImageIcon, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { clsx } from "clsx";
import { fetchInstagramProfile } from "@/app/actions/crm";
import { getWhatsAppTemplates } from "@/app/actions/whatsapp-templates";
import { sendTemplateToCustomer } from "@/app/actions/campaigns";
import { useToast } from "@/components/ui/use-toast";

interface Note {
    id: string;
    note: string;
    created_at: string;
}

interface CampaignLog {
    id: string;
    campaign_id: string;
    phone_number: string;
    meta_message_id: string | null;
    status: string;
    error_message: string | null;
    sent_at: string | null;
    delivered_at: string | null;
    read_at: string | null;
    failed_at: string | null;
    created_at: string;
    campaign_name: string;
    campaign_status: string;
    template_name: string;
    template_language: string;
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const [id, setId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        phone: "",
        invoice_type: "individual", // 'corporate' | 'individual'
        company_name: "",
        tax_office: "",
        tax_number: "",
        company_address: "",
        authorized_person: "",
        tckn: "",
        individual_address: "",
        instagram_username: "",
        profile_pic: "",
        segment: "",
        tags: [] as string[],
    });

    // Notes State
    const [notes, setNotes] = useState<Note[]>([]);
    const [newNote, setNewNote] = useState("");
    const [noteLoading, setNoteLoading] = useState(false);
    const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

    // Campaign Logs State
    const [campaignLogs, setCampaignLogs] = useState<CampaignLog[]>([]);
    const [campaignLogsLoading, setCampaignLogsLoading] = useState(false);

    // Segment & Tag State
    const [availableSegments, setAvailableSegments] = useState<string[]>([]);
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [newTagInput, setNewTagInput] = useState("");
    const [showSegmentDropdown, setShowSegmentDropdown] = useState(false);
    const [segmentSearch, setSegmentSearch] = useState("");

    // Template Send State
    const [sendStep, setSendStep] = useState(1);
    const [sendTemplates, setSendTemplates] = useState<any[]>([]);
    const [sendTemplatesLoading, setSendTemplatesLoading] = useState(false);
    const [selectedSendTemplate, setSelectedSendTemplate] = useState<string>("");
    const [templateVarValues, setTemplateVarValues] = useState<Record<string, string>>({});
    const [isSending, setIsSending] = useState(false);
    const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);
    const [tenantId, setTenantId] = useState<string>("");
    const { toast } = useToast();

    useEffect(() => {
        params.then(p => {
            setId(p.id);
            if (p.id !== 'new') {
                fetchCustomer(p.id);
                fetchCampaignLogs(p.id);
                fetchAvailableSegmentsAndTags();
            } else {
                setLoading(false);
                fetchAvailableSegmentsAndTags();
            }
        });
    }, [params]);

    const fetchAvailableSegmentsAndTags = async () => {
        const supabase = createClient();
        // Get current user's tenant
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: member } = await supabase
            .from('tenant_members')
            .select('tenant_id')
            .eq('user_id', user.id)
            .single();
        if (!member) return;

        // Save tenantId for template sending
        setTenantId(member.tenant_id);

        // Fetch all segments and tags from tenant's customers
        const { data: customers } = await supabase
            .from('customers')
            .select('segment, tags')
            .eq('tenant_id', member.tenant_id);

        if (customers) {
            const segments = new Set<string>();
            const tags = new Set<string>();
            customers.forEach((c: any) => {
                if (c.segment && c.segment.trim()) segments.add(c.segment.trim());
                if (c.tags && Array.isArray(c.tags)) {
                    c.tags.forEach((t: string) => { if (t && t.trim()) tags.add(t.trim()); });
                }
            });
            setAvailableSegments(Array.from(segments).sort());
            setAvailableTags(Array.from(tags).sort());
        }

        // Fetch approved templates for template send tab
        fetchSendTemplates(member.tenant_id);
    };

    const fetchSendTemplates = async (tid: string) => {
        setSendTemplatesLoading(true);
        const res = await getWhatsAppTemplates(tid);
        if (res.success && res.data) {
            const approved = res.data.filter((tpl: any) => tpl.status === "APPROVED");
            setSendTemplates(approved);
        }
        setSendTemplatesLoading(false);
    };

    const handleAddTag = (tag: string) => {
        const trimmed = tag.trim();
        if (!trimmed) return;
        if (formData.tags.includes(trimmed)) return;
        setFormData(prev => ({ ...prev, tags: [...prev.tags, trimmed] }));
        setNewTagInput("");
    };

    const handleRemoveTag = (tag: string) => {
        setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
    };

    const fetchCampaignLogs = async (customerId: string) => {
        setCampaignLogsLoading(true);
        const supabase = createClient();
        try {
            // Fetch campaign logs for this customer, with campaign info (left join for direct sends)
            const { data: logs, error } = await supabase
                .from('customer_campaign_logs')
                .select(`
                    id,
                    campaign_id,
                    phone_number,
                    meta_message_id,
                    status,
                    error_message,
                    sent_at,
                    delivered_at,
                    read_at,
                    failed_at,
                    created_at,
                    row_metadata,
                    campaigns!left(
                        name,
                        status,
                        template_name,
                        template_language
                    )
                `)
                .eq('customer_id', customerId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching campaign logs:', error);
                setCampaignLogs([]);
                return;
            }

            if (logs) {
                const mapped: CampaignLog[] = logs.map((log: any) => ({
                    id: log.id,
                    campaign_id: log.campaign_id,
                    phone_number: log.phone_number,
                    meta_message_id: log.meta_message_id,
                    status: log.status,
                    error_message: log.error_message,
                    sent_at: log.sent_at,
                    delivered_at: log.delivered_at,
                    read_at: log.read_at,
                    failed_at: log.failed_at,
                    created_at: log.created_at,
                    campaign_name: log.campaigns?.name || (log.row_metadata?.source === 'direct_send' ? 'Tekli Şablon Gönderimi' : 'İsimsiz Kampanya'),
                    campaign_status: log.campaigns?.status || (log.row_metadata?.source === 'direct_send' ? 'DIRECT' : 'UNKNOWN'),
                    template_name: log.campaigns?.template_name || log.row_metadata?.template_name || '-',
                    template_language: log.campaigns?.template_language || log.row_metadata?.template_language || 'tr',
                }));
                setCampaignLogs(mapped);
            }
        } catch (err) {
            console.error('Error fetching campaign logs:', err);
            setCampaignLogs([]);
        } finally {
            setCampaignLogsLoading(false);
        }
    };

    const fetchCustomer = async (customerId: string) => {
        const supabase = createClient();

        // 1. Fetch Customer
        const { data: customer, error } = await supabase
            .from('customers')
            .select('*')
            .eq('id', customerId)
            .single();

        if (error) {
            alert("Müşteri bulunamadı.");
            router.push('/panel/customers');
            return;
        }

        if (customer) {
            setFormData({
                full_name: customer.full_name || "",
                email: customer.email || "",
                phone: customer.phone || "",
                invoice_type: customer.invoice_type || "individual",
                company_name: customer.company_name || "",
                tax_office: customer.tax_office || "",
                tax_number: customer.tax_number || "",
                company_address: customer.company_address || "",
                authorized_person: customer.authorized_person || "",
                tckn: customer.tckn || "",
                individual_address: customer.individual_address || "",
                instagram_username: customer.instagram_username || "",
                profile_pic: customer.profile_pic || "",
                segment: customer.segment || "",
                tags: customer.tags || [],
            });
        }

        // 2. Fetch Notes
        const { data: notesData } = await supabase
            .from('customer_notes')
            .select('*')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false });

        if (notesData) setNotes(notesData);

        setLoading(false);
    };

    const handleSave = async () => {
        // Mandatory fields check
        if (!formData.full_name.trim()) {
            alert("Lütfen Ad Soyad giriniz.");
            return;
        }
        if (!formData.phone.trim()) {
            alert("Lütfen telefon numarası giriniz.");
            return;
        }
        if (!formData.email.trim()) {
            alert("Lütfen e-posta adresi giriniz.");
            return;
        }

        setSaving(true);
        const supabase = createClient();

        // Get Tenant ID if creating new
        let tenantId = null;
        if (id === 'new') {
            const { data: { user } } = await supabase.auth.getUser();
            // In a real app we might verify this securely or get from context, 
            // but usually we can infer from user metadata or helper. 
            // For now assuming existing tenant/user logic holds.
            // A safer bet is to rely on RLS, but we need to pass tenant_id if required.
            // Let's try to fetch an existing tenant_id from a recent message or user claim if applicable.
            // Or typically the RLS inserts it automatically? No, usually we send it.
            // Let's check `contact-info-sheet` logic... it fetched `conv.tenant_id`.
            // Here we are creating manually. We probably need the logged in user's tenant.
            // Let's assume we can get it from the session or profile.
            // Fallback: just try checking if RLS handles it or if we can Insert. 
            // Wait, this app seems to use `tenant_id` column.
            // We'll trust the User to have a tenant_id in their session/metadata or just omit if nullable?
            // Actually, checking `contact-info-sheet` again: `tenant_id: conv.tenant_id`. 
            // Meaning manual creation might need to know the tenant.
            // Let's try to fetch one from `tenants` table linked to user if possible.
            // Or maybe `auth.users` metadata? 
            // I'll check `profiles` or similar? 
            // For now, let's omit tenant_id and see; if it fails, I'll fix.
            // BUT wait, `app-sidebar` checks `tenantId` prop. 
            // I'll try to just basic insert.
        }

        const payload = {
            ...formData,
            updated_at: new Date().toISOString(),
        };

        try {
            if (id === 'new') {
                // Try to get tenant_id for new records.
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error("Kullanıcı oturumu bulunamadı.");

                const { data: member } = await supabase
                    .from("tenant_members")
                    .select("tenant_id")
                    .eq("user_id", user.id)
                    .single();

                if (!member) throw new Error("Tenant üyeliği bulunamadı.");

                const { data, error } = await supabase
                    .from('customers')
                    .insert([{ ...payload, tenant_id: member.tenant_id }])
                    .select()
                    .single();

                if (error) throw error;

                alert("Müşteri başarıyla oluşturuldu.");
                router.push(`/panel/customers/${data.id}`);
            } else {
                const { error } = await supabase
                    .from('customers')
                    .update(payload)
                    .eq('id', id);

                if (error) throw error;
                alert("Değişiklikler kaydedildi.");
            }
        } catch (err: any) {
            console.error(err);
            alert("Kaydetme hatası: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const [fetchLoading, setFetchLoading] = useState(false);

    const handleFetchProfile = async () => {
        if (!formData.instagram_username) {
            alert("Lütfen bir Instagram kullanıcı adı giriniz.");
            return;
        }

        setFetchLoading(true);
        try {
            const res = await fetchInstagramProfile(formData.instagram_username);
            if (res.success && res.url) {
                setFormData(prev => ({ ...prev, profile_pic: res.url! }));
                alert("Profil fotoğrafı başarıyla getirildi.");
            } else {
                alert("Hata: " + res.error);
            }
        } catch (err: any) {
            alert("Beklenmedik hata: " + err.message);
        } finally {
            setFetchLoading(false);
        }
    };

    const handleSaveNote = async () => {
        if (!newNote.trim()) return;
        setNoteLoading(true);
        const supabase = createClient();
        try {
            const { data: noteData, error } = await supabase
                .from('customer_notes')
                .insert({
                    customer_id: id,
                    note: newNote.trim()
                })
                .select()
                .single();

            if (error) throw error;

            setNotes(prev => [noteData, ...prev]);
            setNewNote("");
        } catch (error: any) {
            alert("Not eklenirken hata: " + error.message);
        } finally {
            setNoteLoading(false);
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        if (!confirm("Notu silmek istediğinize emin misiniz?")) return;
        const supabase = createClient();
        try {
            await supabase.from("customer_notes").delete().eq("id", noteId);
            setNotes(prev => prev.filter(n => n.id !== noteId));
        } catch (error: any) {
            alert("Silme hatası: " + error.message);
        }
    };

    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteCustomer = async () => {
        if (!confirm("Bu müşteriyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) return;

        setIsDeleting(true);

        try {
            // Import dynamically since we are inside a client component function and the action is in a file with "use server"
            // Wait, standard import at top is better. I will add import statement in a separate replacement.
            // But for now, let's just assume I added it or I'll use it if I can.
            // Actually, I should check if I imported it. I haven't.
            // I'll add the logic here assuming `deleteCustomerAction` is available, and then I'll add the import.

            const { deleteCustomerAction } = await import("@/app/actions/crm");
            const res = await deleteCustomerAction(id);

            if (!res.success) {
                throw new Error(res.error);
            }

            alert("Müşteri başarıyla silindi ve ilişkili sohbetlerin bağlantısı kaldırıldı.");
            router.push('/panel/customers');
        } catch (error: any) {
            alert("Silme hatası: " + error.message);
            setIsDeleting(false);
        }
    };

    if (loading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-slate-400" /></div>;
    }

    return (
        <div className="py-10 pl-12 pr-10 max-w-[1400px] space-y-8 pb-32">
            {/* Header */}
            <div className="flex items-center justify-between sticky top-0 bg-slate-50 z-20 py-6 -mx-8 px-8 border-b border-slate-100 mb-8 shadow-sm">
                <div className="flex items-center gap-6">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full w-10 h-10 hover:bg-slate-100">
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </Button>
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
                            {id === 'new' ? 'Yeni Müşteri Oluştur' : (formData.company_name || formData.full_name)}
                        </h1>
                        <p className="text-slate-500 font-medium mt-1">
                            {id === 'new' ? 'Müşteri detaylarını girerek kayıt oluşturun.' : 'Müşteri bilgilerini ve notlarını yönetin.'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {id !== 'new' && (
                        <Button
                            variant="destructive"
                            onClick={handleDeleteCustomer}
                            disabled={isDeleting || saving}
                            className="h-12 px-6 bg-red-100 hover:bg-red-200 text-red-600 font-medium text-base rounded-xl transition-all"
                        >
                            {isDeleting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Trash2 className="w-5 h-5 mr-2" />}
                            Sil
                        </Button>
                    )}
                    <Button
                        onClick={handleSave}
                        disabled={saving || isDeleting}
                        className="h-12 px-8 bg-orange-600 hover:bg-orange-700 text-white font-medium text-base shadow-lg shadow-orange-500/20 rounded-xl transition-all hover:-translate-y-0.5"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                        Kaydet
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="profile" className="w-full">
                <TabsList className="bg-slate-100 p-1 mb-6 rounded-xl">
                    <TabsTrigger value="profile" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm px-6">
                        Profil Bilgileri
                    </TabsTrigger>
                    {id !== 'new' && (
                        <TabsTrigger value="send_template" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm px-6">
                            <Send className="w-4 h-4 mr-2" />
                            Şablon Gönder
                        </TabsTrigger>
                    )}
                    {id !== 'new' && (
                        <TabsTrigger value="campaigns" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm px-6">
                            <History className="w-4 h-4 mr-2" />
                            Kampanya Geçmişi
                        </TabsTrigger>
                    )}
                </TabsList>

                <TabsContent value="profile" className="outline-none">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column: Info & Invoice */}
                        <div className="lg:col-span-2 space-y-8">

                            {/* Basic Info */}
                            {/* Basic Info */}
                            <Card className="border-2 border-orange-500 shadow-xl shadow-gray-200 rounded-[2rem] overflow-hidden">
                                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-6">
                                    <CardTitle className="flex items-center gap-3 text-lg font-bold text-slate-800">
                                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 text-xl font-bold transition-colors overflow-hidden ${formData.profile_pic ? 'bg-white' :
                                            formData.invoice_type === 'corporate' ? 'bg-purple-50 text-purple-600' :
                                                formData.instagram_username ? 'bg-pink-50 text-pink-600' :
                                                    'bg-green-50 text-green-600'
                                            }`}>
                                            {formData.profile_pic ? (
                                                <img src={formData.profile_pic} alt="" className="w-full h-full object-cover" />
                                            ) : formData.invoice_type === 'corporate' ? (
                                                <Building2 className="w-7 h-7" />
                                            ) : formData.instagram_username ? (
                                                <Instagram className="w-7 h-7" />
                                            ) : (
                                                <MessageCircle className="w-7 h-7" />
                                            )}
                                        </div>
                                        Müşteri Bilgileri
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2.5">
                                            <Label className="text-slate-600 font-medium">Ad Soyad (Zorunlu)</Label>
                                            <Input
                                                value={formData.full_name}
                                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                                placeholder="Müşteri Adı"
                                                className="h-12 rounded-xl border-slate-200 focus:border-orange-500 focus:ring-orange-500/20"
                                            />
                                        </div>
                                        <div className="space-y-2.5">
                                            <Label className="text-slate-600 font-medium">Telefon (Zorunlu)</Label>
                                            <Input
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                placeholder="+90 5..."
                                                className="h-12 rounded-xl border-slate-200 focus:border-orange-500 focus:ring-orange-500/20"
                                            />
                                        </div>
                                        <div className="space-y-2.5 md:col-span-2">
                                            <Label className="text-slate-600 font-medium">E-posta (Zorunlu)</Label>
                                            <Input
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="ornek@mail.com"
                                                className="h-12 rounded-xl border-slate-200 focus:border-orange-500 focus:ring-orange-500/20"
                                            />
                                        </div>
                                        <div className="space-y-2.5">
                                            <Label className="text-slate-600 font-medium">Instagram</Label>
                                            <div className="relative flex gap-2">
                                                <div className="relative flex-1">
                                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 select-none">@</div>
                                                    <Input
                                                        value={formData.instagram_username}
                                                        onChange={(e) => setFormData({ ...formData, instagram_username: e.target.value })}
                                                        placeholder="kullaniciadi"
                                                        className="h-12 pl-9 rounded-xl border-slate-200 focus:border-orange-500 focus:ring-orange-500/20"
                                                    />
                                                </div>
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="outline"
                                                    className="h-12 w-12 rounded-xl text-pink-600 border-slate-200 hover:bg-pink-50"
                                                    onClick={handleFetchProfile}
                                                    disabled={fetchLoading || !formData.instagram_username}
                                                    title="Herkese açık olan Instagram hesaplarının profil fotoğrafını müşteri kartınıza eklemek için tıklayın."
                                                >
                                                    {fetchLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Instagram className="w-5 h-5" />}
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Yeni Eklenen Alanlar: Segment ve Etiketler */}
                                        <div className="space-y-2.5">
                                            <Label className="text-slate-600 font-medium">Segment</Label>
                                            <Select
                                                value={formData.segment || "__none__"}
                                                onValueChange={(val) => {
                                                    if (val === "__custom__") {
                                                        // Trigger custom input
                                                        const custom = prompt("Yeni segment adı giriniz:");
                                                        if (custom && custom.trim()) {
                                                            setFormData(prev => ({ ...prev, segment: custom.trim() }));
                                                        }
                                                    } else if (val === "__none__") {
                                                        setFormData(prev => ({ ...prev, segment: "" }));
                                                    } else {
                                                        setFormData(prev => ({ ...prev, segment: val }));
                                                    }
                                                }}
                                            >
                                                <SelectTrigger className="h-12 rounded-xl border-slate-200 focus:ring-orange-500/20">
                                                    <SelectValue placeholder="Segment seçiniz...">
                                                        {formData.segment || "Segment seçiniz..."}
                                                    </SelectValue>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="__none__">
                                                        <span className="text-slate-400">Segment yok</span>
                                                    </SelectItem>
                                                    {availableSegments.map(seg => (
                                                        <SelectItem key={seg} value={seg}>
                                                            {seg}
                                                        </SelectItem>
                                                    ))}
                                                    {formData.segment && !availableSegments.includes(formData.segment) && (
                                                        <SelectItem value={formData.segment}>
                                                            {formData.segment}
                                                        </SelectItem>
                                                    )}
                                                    <SelectItem value="__custom__">
                                                        <span className="text-orange-600 font-medium flex items-center gap-1">
                                                            <Plus className="w-3 h-3" /> Yeni segment ekle...
                                                        </span>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2.5 md:col-span-2">
                                            <Label className="text-slate-600 font-medium">Etiketler</Label>
                                            {/* Mevcut Etiketler - Chip olarak */}
                                            {formData.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    {formData.tags.map(tag => (
                                                        <Badge
                                                            key={tag}
                                                            className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-0 gap-1 px-3 py-1.5 text-sm font-medium cursor-default"
                                                        >
                                                            <Tag className="w-3 h-3" />
                                                            {tag}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveTag(tag)}
                                                                className="ml-1 hover:text-red-600 transition-colors"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                            {/* Etiket Ekleme */}
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <Input
                                                        value={newTagInput}
                                                        onChange={(e) => setNewTagInput(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                handleAddTag(newTagInput);
                                                            }
                                                        }}
                                                        placeholder="Etiket yazın..."
                                                        className="h-12 rounded-xl border-slate-200 focus:border-orange-500 focus:ring-orange-500/20"
                                                        list="tag-suggestions"
                                                    />
                                                    <datalist id="tag-suggestions">
                                                        {availableTags
                                                            .filter(t => !formData.tags.includes(t))
                                                            .map(t => (
                                                                <option key={t} value={t} />
                                                            ))}
                                                    </datalist>
                                                </div>
                                                <Button
                                                    type="button"
                                                    onClick={() => handleAddTag(newTagInput)}
                                                    disabled={!newTagInput.trim()}
                                                    className="h-12 px-5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white"
                                                >
                                                    <Plus className="w-4 h-4 mr-1" />
                                                    Ekle
                                                </Button>
                                            </div>
                                            {/* Mevcut etiket önerileri */}
                                            {availableTags.filter(t => !formData.tags.includes(t)).length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-1">
                                                    <span className="text-[11px] text-slate-400 mr-1">Mevcut etiketler:</span>
                                                    {availableTags.filter(t => !formData.tags.includes(t)).map(tag => (
                                                        <button
                                                            key={tag}
                                                            type="button"
                                                            onClick={() => handleAddTag(tag)}
                                                            className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 hover:bg-orange-100 hover:text-orange-700 transition-colors cursor-pointer"
                                                        >
                                                            + {tag}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                    </div>
                                </CardContent>
                            </Card>

                            {/* Invoice Info */}
                            {/* Invoice Info */}
                            <Card className="border-2 border-orange-500 shadow-xl shadow-gray-200 rounded-[2rem] overflow-hidden">
                                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-6">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-3 text-lg font-bold text-slate-800">
                                            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                                                <Building2 className="w-5 h-5" />
                                            </div>
                                            Fatura Bilgileri
                                        </CardTitle>
                                    </div>
                                    <CardDescription className="pt-2 pl-[3.25rem]">
                                        Fatura kesimi için gerekli yasal bilgiler.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-8 pt-8">
                                    <div className="space-y-2.5">
                                        <Label className="text-slate-600 font-medium">Fatura Tipi</Label>
                                        <Select
                                            value={formData.invoice_type}
                                            onValueChange={(val) => setFormData({ ...formData, invoice_type: val })}
                                        >
                                            <SelectTrigger className="w-full md:w-[240px] h-12 rounded-xl border-slate-200 focus:ring-orange-500/20">
                                                <SelectValue placeholder="Seçiniz" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="individual">Şahıs (Bireysel)</SelectItem>
                                                <SelectItem value="corporate">Şirket (Kurumsal)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {formData.invoice_type === 'corporate' ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                            <div className="space-y-2.5 md:col-span-2">
                                                <Label className="text-slate-600 font-medium">Firma Ünvanı</Label>
                                                <Input
                                                    value={formData.company_name}
                                                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                                    className="h-12 rounded-xl border-slate-200 focus:border-orange-500 focus:ring-orange-500/20"
                                                />
                                            </div>
                                            <div className="space-y-2.5">
                                                <Label className="text-slate-600 font-medium">Vergi Dairesi</Label>
                                                <Input
                                                    value={formData.tax_office}
                                                    onChange={(e) => setFormData({ ...formData, tax_office: e.target.value })}
                                                    className="h-12 rounded-xl border-slate-200 focus:border-orange-500 focus:ring-orange-500/20"
                                                />
                                            </div>
                                            <div className="space-y-2.5">
                                                <Label className="text-slate-600 font-medium">Vergi Numarası</Label>
                                                <Input
                                                    value={formData.tax_number}
                                                    onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                                                    className="h-12 rounded-xl border-slate-200 focus:border-orange-500 focus:ring-orange-500/20"
                                                />
                                            </div>
                                            <div className="space-y-2.5">
                                                <Label className="text-slate-600 font-medium">Yetkili Kişi</Label>
                                                <Input
                                                    value={formData.authorized_person}
                                                    onChange={(e) => setFormData({ ...formData, authorized_person: e.target.value })}
                                                    className="h-12 rounded-xl border-slate-200 focus:border-orange-500 focus:ring-orange-500/20"
                                                />
                                            </div>
                                            <div className="space-y-2.5 md:col-span-2">
                                                <Label className="text-slate-600 font-medium">Firma Adresi</Label>
                                                <Textarea
                                                    value={formData.company_address}
                                                    onChange={(e) => setFormData({ ...formData, company_address: e.target.value })}
                                                    className="min-h-[100px] rounded-xl border-slate-200 focus:border-orange-500 focus:ring-orange-500/20"
                                                    placeholder="İl, İlçe, Açık adres..."
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                            <div className="space-y-2.5">
                                                <Label className="text-slate-600 font-medium">TC Kimlik No</Label>
                                                <Input
                                                    value={formData.tckn}
                                                    onChange={(e) => setFormData({ ...formData, tckn: e.target.value })}
                                                    maxLength={11}
                                                    className="h-12 rounded-xl border-slate-200 focus:border-orange-500 focus:ring-orange-500/20"
                                                />
                                            </div>
                                            <div className="space-y-2.5 md:col-span-2">
                                                <Label className="text-slate-600 font-medium">Adres</Label>
                                                <Textarea
                                                    value={formData.individual_address}
                                                    onChange={(e) => setFormData({ ...formData, individual_address: e.target.value })}
                                                    className="min-h-[100px] rounded-xl border-slate-200 focus:border-orange-500 focus:ring-orange-500/20"
                                                    placeholder="İl, İlçe, Açık adres..."
                                                />
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column: Notes */}
                        <div className="space-y-8">
                            <Card className="h-full flex flex-col border-2 border-orange-500 shadow-xl shadow-gray-200 rounded-[2rem] overflow-hidden">
                                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-6">
                                    <CardTitle className="text-lg font-bold text-slate-800">Müşteri Notları</CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1 flex flex-col gap-6 pt-6">
                                    {id === 'new' ? (
                                        <div className="text-sm text-slate-500 bg-slate-50 p-6 rounded-2xl text-center border border-dashed border-slate-200">
                                            Not eklemek için önce müşteriyi kaydediniz.
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-3">
                                                <Textarea
                                                    placeholder="Yeni not ekle..."
                                                    className="resize-none min-h-[120px] rounded-xl border-slate-200 focus:border-orange-500 focus:ring-orange-500/20"
                                                    value={newNote}
                                                    onChange={(e) => setNewNote(e.target.value)}
                                                />
                                                <Button
                                                    size="sm"
                                                    className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-md"
                                                    onClick={handleSaveNote}
                                                    disabled={noteLoading || !newNote.trim()}
                                                >
                                                    {noteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                                                    Notu Kaydet
                                                </Button>
                                            </div>

                                            <div className="flex-1 overflow-y-auto space-y-4 pr-1 max-h-[600px] mt-2">
                                                {notes.map((note) => (
                                                    <div key={note.id} className="border border-slate-100 rounded-2xl overflow-hidden group shadow-sm hover:shadow-md transition-all">
                                                        <div
                                                            className="bg-white p-4 cursor-pointer flex justify-between items-start"
                                                            onClick={() => setExpandedNoteId(expandedNoteId === note.id ? null : note.id)}
                                                        >
                                                            <div>
                                                                <div className="text-xs text-slate-400 font-bold mb-1 uppercase tracking-wide">
                                                                    {new Date(note.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                                                                </div>
                                                                <div className="text-sm text-slate-700 font-medium line-clamp-3 leading-relaxed">
                                                                    {note.note}
                                                                </div>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 -mr-2 -mt-2 transition-all opacity-0 group-hover:opacity-100"
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                        {expandedNoteId === note.id && (
                                                            <div className="px-4 pb-4 pt-0 text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                                                                {note.note}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                                {notes.length === 0 && (
                                                    <div className="text-center py-8">
                                                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                                                            <MessageCircle className="w-6 h-6" />
                                                        </div>
                                                        <p className="text-xs text-slate-400">Henüz not eklenmemiş.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* ŞABLON GÖNDER TAB */}
                {id !== 'new' && (
                    <TabsContent value="send_template" className="outline-none">
                        <Card className="border-2 border-slate-200 shadow-xl shadow-gray-200 rounded-[2rem] overflow-hidden min-h-[400px]">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                            <Send className="w-5 h-5 text-green-600" />
                                            Şablon Mesaj Gönder
                                        </CardTitle>
                                        <CardDescription className="mt-1">
                                            Bu müşteriye onaylı WhatsApp şablon mesajı gönderin.
                                        </CardDescription>
                                    </div>
                                    {/* Adım göstergesi */}
                                    <div className="flex items-center gap-2">
                                        {[1, 2, 3].map((s) => (
                                            <div key={s} className="flex items-center">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mx-1 transition-colors ${sendStep >= s ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                                    {s}
                                                </div>
                                                {s < 3 && <div className={`w-4 h-[2px] ${sendStep > s ? 'bg-green-600' : 'bg-slate-200'}`} />}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {/* Müşteri bilgi kartı */}
                                <div className="mt-4 flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3">
                                    <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600 font-bold text-sm">
                                        {formData.full_name?.charAt(0)?.toUpperCase() || '?'}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-slate-800 text-sm">{formData.full_name || 'İsimsiz Müşteri'}</div>
                                        <div className="text-xs text-slate-500 font-mono">{formData.phone || 'Telefon yok'}</div>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="pt-6 min-h-[350px]">
                                {/* ADIM 1: Şablon Seçimi */}
                                {sendStep === 1 && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <h4 className="font-semibold text-slate-800">Göndermek istediğiniz şablonu seçin</h4>
                                        <p className="text-sm text-slate-500">Sadece Meta tarafından onaylanan şablonlar listelenmiştir.</p>

                                        {sendTemplatesLoading ? (
                                            <div className="flex items-center justify-center py-16 text-slate-400">
                                                <Loader2 className="w-8 h-8 animate-spin mr-3" />
                                                <span>Şablonlar yükleniyor...</span>
                                            </div>
                                        ) : sendTemplates.length === 0 ? (
                                            <div className="text-center py-16 border border-dashed rounded-xl bg-slate-50">
                                                <LayoutTemplate className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                                <p className="font-medium text-slate-600">Onaylı şablon bulunamadı</p>
                                                <p className="text-sm text-slate-400 mt-1">Ayarlar &gt; WhatsApp Şablonları bölümünden şablon oluşturup Meta onayına gönderin.</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {sendTemplates.map((tpl: any) => {
                                                    const isSelected = selectedSendTemplate === tpl.id;
                                                    return (
                                                        <div
                                                            key={tpl.id}
                                                            className={`border rounded-lg p-5 cursor-pointer flex flex-col gap-3 transition-all h-full ${isSelected ? 'border-green-500 bg-green-600/5 ring-1 ring-green-500 shadow-sm' : 'border-slate-200 hover:border-green-500/40 bg-white'}`}
                                                            onClick={() => {
                                                                setSelectedSendTemplate(tpl.id);
                                                                setTemplateVarValues({});
                                                                setSendResult(null);
                                                            }}
                                                        >
                                                            {/* Header */}
                                                            <div className="flex justify-between items-start">
                                                                <div className="font-bold text-slate-900 flex items-center gap-2 break-all">
                                                                    <LayoutTemplate className={`w-4 h-4 ${isSelected ? 'text-green-600' : 'text-slate-500'}`} />
                                                                    {tpl.name}
                                                                </div>
                                                                {isSelected && <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />}
                                                                {!isSelected && <Badge variant="secondary" className="bg-green-100 text-green-800 shrink-0">APPROVED</Badge>}
                                                            </div>

                                                            {/* Labels */}
                                                            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium tracking-wide">
                                                                <span className="uppercase">{tpl.category}</span>
                                                                <span>•</span>
                                                                <span className="uppercase">{tpl.language}</span>
                                                            </div>

                                                            {/* Media Tag */}
                                                            {tpl.components?.find((c: any) => c.type === "HEADER" && (c.format === "IMAGE" || c.format === "VIDEO" || c.format === "DOCUMENT")) && (
                                                                <div className={`flex flex-col gap-2 p-2 rounded-md border mt-1 ${isSelected ? 'bg-white border-green-500/20' : 'bg-slate-100/70 border-slate-100 text-slate-600'}`}>
                                                                    <div className="flex items-center gap-2">
                                                                        {tpl.components?.find((c: any) => c.type === "HEADER").format === "IMAGE" && <ImageIcon className="w-4 h-4 text-green-500" />}
                                                                        {tpl.components?.find((c: any) => c.type === "HEADER").format === "VIDEO" && <Video className="w-4 h-4 text-red-500" />}
                                                                        {tpl.components?.find((c: any) => c.type === "HEADER").format === "DOCUMENT" && <FileText className="w-4 h-4 text-green-500" />}
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
                                                            <div className={`text-sm p-3 rounded-md line-clamp-none whitespace-pre-wrap flex-1 min-h-[80px] overflow-y-auto max-h-[200px] ${isSelected ? 'bg-white border-green-500/20 text-slate-800 border' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                                                                {tpl.components?.find((c: any) => c.type === "BODY")?.text || "Gövde bulunmuyor."}
                                                            </div>

                                                            {/* Buttons */}
                                                            {tpl.components?.find((c: any) => c.type === "BUTTONS") && (
                                                                <div className="flex flex-col gap-1.5 mt-1">
                                                                    {tpl.components.find((c: any) => c.type === "BUTTONS").buttons.map((btn: any, idx: number) => (
                                                                        <div key={idx} className={`flex items-center gap-1.5 text-[11px] p-2 rounded border font-semibold ${isSelected ? 'bg-white border-green-500/20 text-green-600' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                                                                            <span className="truncate">{btn.text}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ADIM 2: Değişken Eşleştirme & Önizleme */}
                                {sendStep === 2 && (() => {
                                    const activeTpl = sendTemplates.find((t: any) => t.id === selectedSendTemplate);
                                    const bodyText = activeTpl?.components?.find((c: any) => c.type === "BODY")?.text || "";
                                    const regex = /\{\{([^}]*)\}\}/g;
                                    const vars: string[] = [];
                                    let match;
                                    while ((match = regex.exec(bodyText)) !== null) vars.push(match[1]);
                                    const uniqueVars = [...new Set(vars)].sort((a, b) => {
                                        const numA = Number(a); const numB = Number(b);
                                        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                                        return a.localeCompare(b);
                                    });

                                    // Preview
                                    let previewText = bodyText;
                                    uniqueVars.forEach(v => {
                                        const val = templateVarValues[v];
                                        previewText = previewText.replace(new RegExp(`\\{\\{${v}\\}\\}`, 'g'), val || `{{${v}}}`);
                                    });

                                    return (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <h4 className="font-semibold text-slate-800">Değişkenleri Doldurun</h4>

                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                {/* Sol: Değişken formları */}
                                                <div className="space-y-4">
                                                    {uniqueVars.length === 0 ? (
                                                        <div className="text-center py-8 text-slate-500 border border-dashed rounded-xl bg-slate-50">
                                                            <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                                                            <p className="text-sm font-medium">Bu şablonda değişken bulunmuyor.</p>
                                                            <p className="text-xs text-slate-400 mt-1">Doğrudan gönderime hazır.</p>
                                                        </div>
                                                    ) : (
                                                        uniqueVars.map((v) => (
                                                            <div key={v} className="space-y-1.5">
                                                                <Label className="text-slate-600 flex items-center gap-2">
                                                                    <Badge variant="secondary" className="font-mono text-xs">{`{{${v}}}`}</Badge>
                                                                </Label>
                                                                <Select
                                                                    value={templateVarValues[`__mode_${v}`] || "name"}
                                                                    onValueChange={(val) => {
                                                                        const newVals = { ...templateVarValues, [`__mode_${v}`]: val };
                                                                        if (val === "name") newVals[v] = formData.full_name;
                                                                        else if (val === "phone") newVals[v] = formData.phone;
                                                                        else if (val === "custom") newVals[v] = templateVarValues[v] || "";
                                                                        setTemplateVarValues(newVals);
                                                                    }}
                                                                >
                                                                    <SelectTrigger className="bg-white">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="name">Müşteri Adı ({formData.full_name})</SelectItem>
                                                                        <SelectItem value="phone">Telefon ({formData.phone})</SelectItem>
                                                                        <SelectItem value="custom">Özel Değer (Elle Giriş)</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                                {(templateVarValues[`__mode_${v}`] === "custom") && (
                                                                    <Input
                                                                        value={templateVarValues[v] || ""}
                                                                        onChange={(e) => setTemplateVarValues(prev => ({ ...prev, [v]: e.target.value }))}
                                                                        placeholder="Değer giriniz..."
                                                                        className="mt-1"
                                                                    />
                                                                )}
                                                            </div>
                                                        ))
                                                    )}
                                                </div>

                                                {/* Sağ: Önizleme */}
                                                <div>
                                                    <Label className="text-sm font-semibold text-slate-700 mb-3 block">Mesaj Önizlemesi</Label>
                                                    <div className="border border-green-200 bg-green-50/30 rounded-xl p-5 space-y-3">
                                                        <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                                                            <LayoutTemplate className="w-4 h-4 text-green-600" />
                                                            {activeTpl?.name}
                                                        </div>
                                                        <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">
                                                            {activeTpl?.category} • {activeTpl?.language}
                                                        </div>
                                                        {(activeTpl as any)?.uppypro_media?.file_url && (
                                                            <div className="w-full h-32 rounded-lg overflow-hidden bg-slate-100">
                                                                <img src={(activeTpl as any).uppypro_media.file_url} alt="" className="w-full h-full object-cover" />
                                                            </div>
                                                        )}
                                                        <div className="text-sm text-slate-700 bg-white rounded-lg p-3 border border-green-100 whitespace-pre-wrap leading-relaxed">
                                                            {previewText}
                                                        </div>
                                                        {activeTpl?.components?.find((c: any) => c.type === "BUTTONS") && (
                                                            <div className="flex flex-col gap-1">
                                                                {activeTpl.components.find((c: any) => c.type === "BUTTONS").buttons.map((btn: any, idx: number) => (
                                                                    <div key={idx} className="text-[11px] font-semibold text-green-700 bg-white border border-green-200 rounded px-2 py-1.5 text-center">
                                                                        {btn.text}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* ADIM 3: Onay & Gönder */}
                                {sendStep === 3 && (() => {
                                    const activeTpl = sendTemplates.find((t: any) => t.id === selectedSendTemplate);
                                    return (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div className="text-center py-6">
                                                <Send className="w-16 h-16 text-green-600 mx-auto mb-4" />
                                                <h2 className="text-2xl font-bold text-slate-900 mb-2">Gönderime Hazır!</h2>
                                                <p className="text-slate-500 max-w-lg mx-auto">Aşağıdaki bilgileri kontrol edip onaylayın.</p>
                                            </div>

                                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 max-w-2xl mx-auto">
                                                <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                                                    <div>
                                                        <p className="text-sm text-slate-500 mb-1">Müşteri</p>
                                                        <p className="font-semibold text-slate-900">{formData.full_name}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-slate-500 mb-1">Telefon (WhatsApp)</p>
                                                        <p className="font-semibold text-slate-900 font-mono">{formData.phone}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-slate-500 mb-1">Şablon</p>
                                                        <p className="font-semibold text-slate-900">{activeTpl?.name}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-slate-500 mb-1">Dil</p>
                                                        <p className="font-semibold text-slate-900 uppercase">{activeTpl?.language}</p>
                                                    </div>
                                                </div>

                                                {sendResult && (
                                                    <div className={`mt-4 p-4 rounded-lg text-sm flex items-start gap-3 ${sendResult.success ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                                                        {sendResult.success ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
                                                        <div>{sendResult.message}</div>
                                                    </div>
                                                )}

                                                <div className="mt-6 flex justify-center">
                                                    <Button
                                                        onClick={async () => {
                                                            if (!tenantId || !activeTpl) return;
                                                            setIsSending(true);
                                                            setSendResult(null);

                                                            // Clean variable values (remove __mode_ keys)
                                                            const cleanVars: Record<string, string> = {};
                                                            Object.entries(templateVarValues).forEach(([k, v]) => {
                                                                if (!k.startsWith('__mode_')) cleanVars[k] = v;
                                                            });

                                                            const result = await sendTemplateToCustomer({
                                                                tenantId,
                                                                customerId: id,
                                                                customerPhone: formData.phone,
                                                                customerName: formData.full_name,
                                                                templateName: activeTpl.name,
                                                                templateLanguage: activeTpl.language,
                                                                variableValues: cleanVars,
                                                            });

                                                            setIsSending(false);

                                                            if (result.success) {
                                                                setSendResult({ success: true, message: `Şablon mesajı başarıyla gönderildi!` });
                                                                toast({ title: "Mesaj Gönderildi! ✅", description: `${formData.full_name} kişisine "${activeTpl.name}" şablonu gönderildi.` });
                                                                // Kampanya loglarını yenile
                                                                fetchCampaignLogs(id);
                                                            } else {
                                                                setSendResult({ success: false, message: result.error || "Gönderim sırasında bir hata oluştu." });
                                                                toast({ title: "Gönderim Hatası", description: result.error, variant: "destructive" });
                                                            }
                                                        }}
                                                        disabled={isSending || (sendResult?.success === true)}
                                                        className="bg-[#25D366] hover:bg-[#128C7E] text-white px-8 h-12 text-base font-semibold rounded-xl shadow-lg"
                                                    >
                                                        {isSending ? (
                                                            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Gönderiliyor...</>
                                                        ) : sendResult?.success ? (
                                                            <><CheckCircle2 className="w-5 h-5 mr-2" /> Gönderildi!</>
                                                        ) : (
                                                            <><Send className="w-5 h-5 mr-2" /> Onayla ve Gönder</>
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </CardContent>

                            {/* İleri/Geri Butonları */}
                            <div className="bg-slate-50 border-t flex justify-between py-4 px-6">
                                <Button
                                    variant="outline"
                                    onClick={() => { setSendStep(s => Math.max(s - 1, 1)); setSendResult(null); }}
                                    disabled={sendStep === 1}
                                >
                                    <ChevronLeft className="w-4 h-4 mr-2" />
                                    Geri
                                </Button>

                                {sendStep < 3 ? (
                                    <Button
                                        className="bg-green-600 hover:bg-green-700 text-white border-0"
                                        onClick={() => {
                                            if (sendStep === 1) {
                                                // Auto-fill first variable with customer name
                                                const activeTpl = sendTemplates.find((t: any) => t.id === selectedSendTemplate);
                                                const bodyText = activeTpl?.components?.find((c: any) => c.type === "BODY")?.text || "";
                                                const varMatches = bodyText.match(/\{\{([^}]*)\}\}/g);
                                                if (varMatches) {
                                                    const vars: string[] = Array.from(new Set(varMatches.map((m: string) => m.replace(/[{}]/g, "")))) as string[];
                                                    const autoVals: Record<string, string> = {};
                                                    vars.forEach((v: string, i: number) => {
                                                        if (i === 0) {
                                                            autoVals[v] = formData.full_name;
                                                            autoVals[`__mode_${v}`] = "name";
                                                        }
                                                    });
                                                    setTemplateVarValues(prev => ({ ...autoVals, ...prev }));
                                                }
                                            }
                                            setSendStep(s => Math.min(s + 1, 3));
                                        }}
                                        disabled={sendStep === 1 && !selectedSendTemplate}
                                    >
                                        İleri
                                        <ChevronRight className="w-4 h-4 ml-2" />
                                    </Button>
                                ) : (
                                    sendResult?.success && (
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setSendStep(1);
                                                setSelectedSendTemplate("");
                                                setTemplateVarValues({});
                                                setSendResult(null);
                                            }}
                                        >
                                            Yeni Gönderim Yap
                                        </Button>
                                    )
                                )}
                            </div>
                        </Card>
                    </TabsContent>
                )}

                {id !== 'new' && (
                    <TabsContent value="campaigns" className="outline-none">
                        <Card className="border-2 border-slate-200 shadow-xl shadow-gray-200 rounded-[2rem] overflow-hidden min-h-[400px]">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                            <History className="w-5 h-5 text-orange-500" />
                                            Müşterinin Kampanya Geçmişi
                                        </CardTitle>
                                        <CardDescription className="mt-1">
                                            Bu müşteriye gönderilen tüm şablon mesajları (tekli ve toplu) ve teslimat durumları.
                                        </CardDescription>
                                    </div>
                                    {campaignLogs.length > 0 && (
                                        <div className="hidden md:flex items-center gap-4 text-xs">
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full">
                                                <Mail className="w-3.5 h-3.5 text-slate-500" />
                                                <span className="font-semibold text-slate-700">{campaignLogs.length}</span>
                                                <span className="text-slate-500">mesaj</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-full">
                                                <CheckCheck className="w-3.5 h-3.5 text-green-600" />
                                                <span className="font-semibold text-green-700">{campaignLogs.filter(l => l.status === 'delivered' || l.status === 'read').length}</span>
                                                <span className="text-green-600">teslim</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 rounded-full">
                                                <CheckCheck className="w-3.5 h-3.5 text-orange-500" />
                                                <span className="font-semibold text-orange-600">{campaignLogs.filter(l => l.status === 'read').length}</span>
                                                <span className="text-orange-500">okundu</span>
                                            </div>
                                            {campaignLogs.filter(l => l.status === 'failed').length > 0 && (
                                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-full">
                                                    <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                                                    <span className="font-semibold text-red-600">{campaignLogs.filter(l => l.status === 'failed').length}</span>
                                                    <span className="text-red-500">hatalı</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                {campaignLogsLoading ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                        <Loader2 className="w-8 h-8 animate-spin mb-3" />
                                        <p className="text-sm">Kampanya geçmişi yükleniyor...</p>
                                    </div>
                                ) : campaignLogs.length === 0 ? (
                                    <div className="text-center py-16 text-slate-500 border border-dashed rounded-xl bg-slate-50">
                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Mail className="w-8 h-8 text-slate-300" />
                                        </div>
                                        <p className="font-medium text-slate-600 mb-1">Kampanya geçmişi bulunamadı</p>
                                        <p className="text-sm text-slate-400">Bu müşteriye henüz şablon mesajı gönderilmemiş.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {campaignLogs.map((log) => {
                                            const getStatusBadge = (status: string) => {
                                                switch (status?.toLowerCase()) {
                                                    case 'read':
                                                        return (
                                                            <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-0 gap-1">
                                                                <CheckCheck className="w-3 h-3" /> Okundu
                                                            </Badge>
                                                        );
                                                    case 'delivered':
                                                        return (
                                                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 gap-1">
                                                                <CheckCheck className="w-3 h-3" /> Teslim Edildi
                                                            </Badge>
                                                        );
                                                    case 'sent':
                                                        return (
                                                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0 gap-1">
                                                                <Check className="w-3 h-3" /> Gönderildi
                                                            </Badge>
                                                        );
                                                    case 'failed':
                                                        return (
                                                            <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 gap-1">
                                                                <AlertCircle className="w-3 h-3" /> Başarısız
                                                            </Badge>
                                                        );
                                                    case 'pending':
                                                        return (
                                                            <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-0 gap-1">
                                                                <Clock className="w-3 h-3" /> Bekliyor
                                                            </Badge>
                                                        );
                                                    default:
                                                        return (
                                                            <Badge variant="outline" className="gap-1">
                                                                {status}
                                                            </Badge>
                                                        );
                                                }
                                            };

                                            const formatDate = (dateStr: string | null) => {
                                                if (!dateStr) return null;
                                                try {
                                                    return new Date(dateStr).toLocaleDateString('tr-TR', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    });
                                                } catch {
                                                    return dateStr;
                                                }
                                            };

                                            return (
                                                <div
                                                    key={log.id}
                                                    className={`border rounded-xl p-5 transition-all hover:shadow-md bg-white ${
                                                        log.status === 'failed' ? 'border-red-200 hover:border-red-300' :
                                                        log.status === 'read' ? 'border-orange-200 hover:border-orange-300' :
                                                        log.status === 'delivered' ? 'border-green-200 hover:border-green-300' :
                                                        'border-slate-200 hover:border-slate-300'
                                                    }`}
                                                >
                                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                                        {/* Sol: Kampanya Bilgisi */}
                                                        <div className="flex-1 min-w-0 space-y-2">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                {getStatusBadge(log.status)}
                                                                <span className="text-xs text-slate-400 font-medium">
                                                                    {formatDate(log.created_at)}
                                                                </span>
                                                            </div>
                                                            <h4 className="font-bold text-slate-900 text-sm truncate flex items-center gap-2">
                                                                {log.campaign_name}
                                                                {log.campaign_status === 'DIRECT' && (
                                                                    <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 bg-violet-100 text-violet-700 text-[10px] font-bold rounded-full uppercase tracking-wide">
                                                                        <Send className="w-2.5 h-2.5" />
                                                                        Tekli Gönderim
                                                                    </span>
                                                                )}
                                                            </h4>
                                                            <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                                                                <span className="flex items-center gap-1">
                                                                    <FileText className="w-3.5 h-3.5" />
                                                                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                                                                        {log.template_name}
                                                                    </span>
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <Send className="w-3.5 h-3.5" />
                                                                    {log.phone_number}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Orta: Zaman Çizelgesi */}
                                                        <div className="flex items-center gap-2 lg:gap-4 flex-wrap">
                                                            {log.sent_at && (
                                                                <div className="flex items-center gap-1.5 text-xs">
                                                                    <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center">
                                                                        <Check className="w-3 h-3 text-blue-500" />
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-slate-400 text-[10px] font-medium uppercase tracking-wide">Gönderildi</div>
                                                                        <div className="text-slate-600 font-medium">{formatDate(log.sent_at)}</div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {log.delivered_at && (
                                                                <>
                                                                    <div className="hidden lg:block w-4 h-px bg-slate-200" />
                                                                    <div className="flex items-center gap-1.5 text-xs">
                                                                        <div className="w-6 h-6 rounded-full bg-green-50 flex items-center justify-center">
                                                                            <CheckCheck className="w-3 h-3 text-green-500" />
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-slate-400 text-[10px] font-medium uppercase tracking-wide">Teslim</div>
                                                                            <div className="text-slate-600 font-medium">{formatDate(log.delivered_at)}</div>
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            )}
                                                            {log.read_at && (
                                                                <>
                                                                    <div className="hidden lg:block w-4 h-px bg-slate-200" />
                                                                    <div className="flex items-center gap-1.5 text-xs">
                                                                        <div className="w-6 h-6 rounded-full bg-orange-50 flex items-center justify-center">
                                                                            <CheckCheck className="w-3 h-3 text-orange-500" />
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-slate-400 text-[10px] font-medium uppercase tracking-wide">Okundu</div>
                                                                            <div className="text-orange-600 font-medium">{formatDate(log.read_at)}</div>
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            )}
                                                            {log.status === 'failed' && (
                                                                <div className="flex items-center gap-1.5 text-xs">
                                                                    <div className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center">
                                                                        <AlertCircle className="w-3 h-3 text-red-500" />
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-red-400 text-[10px] font-medium uppercase tracking-wide">Hata</div>
                                                                        <div className="text-red-600 font-medium">{formatDate(log.failed_at)}</div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Hata Mesajı */}
                                                    {log.status === 'failed' && log.error_message && (
                                                        <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
                                                            <span className="font-semibold">Hata detayı:</span> {log.error_message}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}
