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
import { ArrowLeft, Save, Building2, User, Plus, Trash2, ChevronDown, CheckCircle2, Loader2, MessageCircle, Instagram } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { clsx } from "clsx";
import { fetchInstagramProfile } from "@/app/actions/crm";

interface Note {
    id: string;
    note: string;
    created_at: string;
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
    });

    // Notes State
    const [notes, setNotes] = useState<Note[]>([]);
    const [newNote, setNewNote] = useState("");
    const [noteLoading, setNoteLoading] = useState(false);
    const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

    useEffect(() => {
        params.then(p => {
            setId(p.id);
            if (p.id !== 'new') {
                fetchCustomer(p.id);
            } else {
                setLoading(false);
            }
        });
    }, [params]);

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
        if (!formData.full_name && !formData.company_name) {
            alert("Lütfen en azından bir İsim veya Firma Adı giriniz.");
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
                                    <Label className="text-slate-600 font-medium">Ad Soyad</Label>
                                    <Input
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        placeholder="Müşteri Adı"
                                        className="h-12 rounded-xl border-slate-200 focus:border-orange-500 focus:ring-orange-500/20"
                                    />
                                </div>
                                <div className="space-y-2.5">
                                    <Label className="text-slate-600 font-medium">Telefon</Label>
                                    <Input
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+90 5..."
                                        className="h-12 rounded-xl border-slate-200 focus:border-orange-500 focus:ring-orange-500/20"
                                    />
                                </div>
                                <div className="space-y-2.5 md:col-span-2">
                                    <Label className="text-slate-600 font-medium">E-posta</Label>
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
        </div>
    );
}
