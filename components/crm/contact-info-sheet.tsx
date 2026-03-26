import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Phone, Briefcase, Mail, Save, X, Ban, Trash2, Eraser, MessageCircle, ChevronDown, Plus, Instagram, CalendarIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { clsx } from "clsx";
import { EventDialog } from "@/components/calendar/event-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { summarizeConversation } from "@/actions/summarize-conversation";
import { Sparkles } from "lucide-react";

// Normalize phone number: strip all non-digits, ensure consistent format
function normalizePhone(phone: string): string {
    let digits = phone.replace(/\D/g, '');
    if (digits.startsWith('0') && digits.length === 11) {
        digits = '9' + digits;
    }
    if (digits.length === 10 && digits.startsWith('5')) {
        digits = '90' + digits;
    }
    return digits;
}

interface ContactInfoSheetProps {
    isOpen: boolean;
    onClose: () => void;
    conversationId: string;
    customerHandle: string;
    platform: string;
    initialProfilePic?: string;
    triggerRef?: React.RefObject<HTMLButtonElement>;
    onClearChat?: () => void;
    onDeleteChat?: () => void;
}

interface Note {
    id: string;
    note: string;
    created_at: string;
}

export function ContactInfoSheet({ isOpen, onClose, conversationId, customerHandle, platform, initialProfilePic, onClearChat, onDeleteChat }: ContactInfoSheetProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [noteLoading, setNoteLoading] = useState(false);

    const [formData, setFormData] = useState({
        full_name: "",
        company_name: "",
        phone: "",
        email: "",
        instagram_username: "",
    });

    const [showEventDialog, setShowEventDialog] = useState(false);
    const [tenantId, setTenantId] = useState<string>("");

    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryOpen, setSummaryOpen] = useState(false);
    const [summaryText, setSummaryText] = useState("");

    const [newNote, setNewNote] = useState("");
    const [notesList, setNotesList] = useState<Note[]>([]);
    const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

    const [customerId, setCustomerId] = useState<string | null>(null);
    const [customerProfilePic, setCustomerProfilePic] = useState<string | null>(null);

    // Initial Data Fetch
    useEffect(() => {
        if (!isOpen) return;

        const fetchCustomerAndNotes = async () => {
            setLoading(true);
            const supabase = createClient();

            const { data: conv } = await supabase
                .from("conversations")
                .select("customer_id, tenant_id")
                .eq("id", conversationId)
                .single();

            if (conv) setTenantId(conv.tenant_id);

            if (conv?.customer_id) {
                const { data: customer } = await supabase
                    .from("customers")
                    .select("*")
                    .eq("id", conv.customer_id)
                    .single();

                if (customer) {
                    setCustomerId(customer.id);
                    setCustomerProfilePic(customer.profile_pic || null);
                    setFormData({
                        full_name: customer.full_name || "",
                        company_name: customer.company_name || "",
                        phone: customer.phone || "",
                        email: customer.email || "",
                        instagram_username: customer.instagram_username || "",
                    });

                    const { data: notes } = await supabase
                        .from("customer_notes")
                        .select("*")
                        .eq("customer_id", customer.id)
                        .order("created_at", { ascending: false });

                    if (notes) setNotesList(notes);
                }
            } else {
                setCustomerId(null);
                setCustomerProfilePic(null);
                // Extract only phone number from customerHandle (e.g. "Hayri Topkan/ Happy IK (+905491013425)" -> "905491013425")
                let extractedPhone = "";
                if (platform === 'whatsapp') {
                    const phoneMatch = customerHandle.match(/(\+?\d[\d\s\-()]{7,}\d)/);
                    extractedPhone = phoneMatch ? phoneMatch[1].replace(/[\s\-()]/g, '') : customerHandle;
                }
                setFormData(prev => ({
                    ...prev,
                    phone: platform === 'whatsapp' ? extractedPhone : "",
                    instagram_username: platform === 'instagram' ? customerHandle : "",
                    full_name: "",
                }));
                setNotesList([]);
            }
            setLoading(false);
        };

        fetchCustomerAndNotes();
    }, [isOpen, conversationId, customerHandle, platform]);

    const handleSaveProfile = async () => {
        setLoading(true);
        const supabase = createClient();

        try {
            const { data: conv } = await supabase.from("conversations").select("tenant_id, customer_id").eq("id", conversationId).single();
            if (!conv) throw new Error("Conversation not found");

            if (customerId) {
                if (!formData.full_name.trim()) return alert("Lütfen Ad Soyad giriniz.");
                if (!formData.phone.trim()) return alert("Lütfen telefon numarası giriniz.");
                if (!formData.email.trim()) return alert("Lütfen e-posta adresi giriniz.");

                const { error } = await supabase
                    .from("customers")
                    .update({
                        full_name: formData.full_name,
                        company_name: formData.company_name,
                        phone: normalizePhone(formData.phone),
                        email: formData.email,
                        instagram_username: formData.instagram_username,
                        profile_pic: initialProfilePic || undefined,
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", customerId);

                if (error) throw error;
            } else {
                if (!formData.full_name.trim()) return alert("Lütfen Ad Soyad giriniz.");
                if (!formData.phone.trim()) return alert("Lütfen telefon numarası giriniz.");
                if (!formData.email.trim()) return alert("Lütfen e-posta adresi giriniz.");

                const { data: newCustomer, error } = await supabase
                    .from("customers")
                    .insert({
                        tenant_id: conv.tenant_id,
                        full_name: formData.full_name,
                        company_name: formData.company_name,
                        phone: normalizePhone(formData.phone),
                        email: formData.email,
                        instagram_username: formData.instagram_username,
                        profile_pic: initialProfilePic
                    })
                    .select("id")
                    .single();

                if (error) throw error;

                await supabase
                    .from("conversations")
                    .update({ customer_id: newCustomer.id })
                    .eq("id", conversationId);

                setCustomerId(newCustomer.id);
            }

            alert("Kişi bilgileri kaydedildi.");
        } catch (err: any) {
            console.error(err);
            alert("Hata: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNote = async () => {
        if (!newNote.trim()) return;
        if (!customerId) {
            alert("Önce kişi bilgilerini kaydederek müşteriyi oluşturmalısınız.");
            return;
        }

        setNoteLoading(true);
        const supabase = createClient();
        try {
            const { data: noteData, error } = await supabase
                .from("customer_notes")
                .insert({
                    customer_id: customerId,
                    note: newNote.trim()
                })
                .select()
                .single();

            if (error) throw error;

            setNotesList(prev => [noteData, ...prev]);
            setNewNote("");
        } catch (error: any) {
            alert("Not kaydedilirken hata: " + error.message);
        } finally {
            setNoteLoading(false);
        }
    }

    const handleDeleteNote = async (noteId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Bu notu silmek istediğinize emin misiniz?")) return;

        const supabase = createClient();
        try {
            const { error } = await supabase.from("customer_notes").delete().eq("id", noteId);
            if (error) throw error;
            setNotesList(prev => prev.filter(n => n.id !== noteId));
        } catch (error: any) {
            alert("Not silinirken hata: " + error.message);
        }
    };

    const handleClearChat = async () => {
        if (onClearChat) {
            onClearChat();
            return;
        }
        if (!confirm("Bu sohbetin tüm mesajlarını silmek istediğinize emin misiniz?")) return;
        alert("Bu işlem ana ekrandan yapılmalıdır.");
    };

    const handleDeleteChat = async () => {
        if (onDeleteChat) {
            onDeleteChat();
            return;
        }
        if (!confirm("Bu sohbeti tamamen silmek istediğinize emin misiniz?")) return;
        alert("Bu işlem ana ekrandan yapılmalıdır.");
    };

    const handleSummarize = async () => {
        if (!customerId) {
            alert("Konuşma özetini çıkarabilmem için öncelikli olarak kişi bilgilerini doldurup kaydetmeniz gerekmektedir.");
            return;
        }

        if (!tenantId) return;
        setSummaryLoading(true);
        try {
            const res = await summarizeConversation(tenantId, conversationId);
            if (res.error) {
                alert(res.error);
                return;
            }
            if (res.summary) {
                setSummaryText(res.summary);
                setSummaryOpen(true);
            }
        } catch (err: any) {
            alert("Hata: " + err.message);
        } finally {
            setSummaryLoading(false);
        }
    };

    const handleSaveSummary = async () => {
        if (!summaryText.trim()) return;

        if (!customerId) {
            alert("Özeti kaydetmek için önce yukarıdan müşteri kaydını oluşturmalısınız.");
            return;
        }

        setNoteLoading(true);
        const supabase = createClient();
        try {
            const { data: noteData, error } = await supabase
                .from("customer_notes")
                .insert({
                    customer_id: customerId,
                    note: summaryText.trim()
                })
                .select()
                .single();

            if (error) throw error;

            setNotesList(prev => [noteData, ...prev]);
            setSummaryOpen(false);
            setSummaryText("");
            alert("Özet not olarak kaydedildi.");
        } catch (error: any) {
            alert("Kaydedilirken hata: " + error.message);
        } finally {
            setNoteLoading(false);
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="w-[400px] sm:w-[480px] overflow-y-auto p-0 border-l border-slate-200/50 z-[60]" overlayClassName="bg-transparent backdrop-blur-none">

                {/* ── GRADIENT HEADER ── */}
                <div className="relative bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 px-6 pt-10 pb-8 flex flex-col items-center">
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 left-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all duration-200 z-10"
                    >
                        <X className="w-4 h-4" />
                    </button>
                    <SheetHeader className="sr-only">
                        <SheetTitle>Kişi Bilgisi</SheetTitle>
                        <SheetDescription></SheetDescription>
                    </SheetHeader>
                    <Avatar className="w-20 h-20 border-[3px] border-white/20 shadow-2xl ring-4 ring-white/10">
                        {(customerProfilePic || initialProfilePic) ? (
                            <>
                                <AvatarImage src={customerProfilePic || initialProfilePic} className="object-cover" />
                                <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-green-400 to-green-600 text-white">
                                    {(formData.full_name || customerHandle).slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </>
                        ) : platform === 'whatsapp' ? (
                            <div className="w-full h-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                                <MessageCircle className="w-10 h-10 text-white drop-shadow" />
                            </div>
                        ) : (
                            <>
                                <AvatarImage src={initialProfilePic} className="object-cover" />
                                <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-pink-400 to-purple-500 text-white">
                                    {customerHandle.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </>
                        )}
                    </Avatar>
                    <div className="flex items-center gap-2 mt-4">
                        <h2 className="text-lg font-bold text-white tracking-tight">
                            {formData.full_name || customerHandle}
                        </h2>
                        {platform === 'whatsapp' ? (
                            <MessageCircle className="w-[18px] h-[18px] text-green-400 shrink-0" />
                        ) : (
                            <Instagram className="w-[18px] h-[18px] text-pink-400 shrink-0" />
                        )}
                    </div>
                    <p className="text-sm text-slate-400 mt-0.5">
                        {platform === 'whatsapp' ? '+' + customerHandle : '@' + customerHandle}
                    </p>

                </div>

                {/* ── MAIN CONTENT ── */}
                <div className="px-5 py-6 space-y-6 bg-white">

                    {/* NO CUSTOMER WARNING */}
                    {!customerId && (
                        <div className="flex items-start gap-3 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/50 rounded-2xl p-4 shadow-sm">
                            <div className="shrink-0 mt-0.5 p-2 bg-orange-100 rounded-xl">
                                <User className="w-4 h-4 text-orange-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-orange-800">Müşteri Kaydı Oluştur</h3>
                                <p className="text-xs text-orange-600/80 mt-0.5 leading-relaxed">
                                    Randevu oluşturmak için önce aşağıdaki bilgileri doldurup müşteriyi kaydediniz.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* PROFILE FORM */}
                    <form className="space-y-4" autoComplete="off" onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }}>
                        <div className="space-y-3">
                            <div>
                                <label className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider mb-1.5 block">Ad Soyad <span className="text-red-400">*</span></label>
                                <div className="relative">
                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                    <Input
                                        name="contact_full_name"
                                        autoComplete="off"
                                        value={formData.full_name}
                                        onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                        className="pl-10 h-11 bg-slate-50/80 border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all"
                                        placeholder="Ad Soyad girin..."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider mb-1.5 block">Firma Adı</label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                    <Input
                                        name="contact_company_name"
                                        autoComplete="organization"
                                        value={formData.company_name}
                                        onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                                        className="pl-10 h-11 bg-slate-50/80 border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all"
                                        placeholder="Firma adı..."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider mb-1.5 block">İletişim Numarası <span className="text-red-400">*</span></label>
                                <div className="relative">
                                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                    <Input
                                        name="contact_phone"
                                        autoComplete="off"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="pl-10 h-11 bg-slate-50/80 border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all"
                                        placeholder="+90..."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider mb-1.5 block">E-posta Adresi <span className="text-red-400">*</span></label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                    <Input
                                        name="contact_email"
                                        autoComplete="email"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="pl-10 h-11 bg-slate-50/80 border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all"
                                        placeholder="ornek@sirket.com"
                                    />
                                </div>
                            </div>
                        </div>

                        <Button type="submit" disabled={loading} className="w-full h-11 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20 font-bold rounded-xl border-0 transition-all duration-200 hover:shadow-xl hover:shadow-orange-500/30">
                            {loading ? "Kaydediliyor..." : <><Save className="mr-2 w-4 h-4" /> Değişiklikleri Kaydet</>}
                        </Button>

                        {customerId && (
                            <Button
                                type="button"
                                onClick={() => setShowEventDialog(true)}
                                className="w-full h-11 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg shadow-green-500/20 font-bold rounded-xl border-0 transition-all duration-200"
                            >
                                <CalendarIcon className="mr-2 w-4 h-4" /> Randevu Oluştur
                            </Button>
                        )}
                    </form>

                    {/* ── DIVIDER ── */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-slate-200"></div>
                        <span className="text-[10px] font-bold uppercase text-slate-300 tracking-widest">Notlar</span>
                        <div className="flex-1 h-px bg-slate-200"></div>
                    </div>

                    {/* NOTE ENTRY */}
                    <div className="space-y-3">
                        <Textarea
                            value={newNote}
                            onChange={e => setNewNote(e.target.value)}
                            className="min-h-[90px] resize-none text-slate-900 bg-slate-50/80 border-slate-200 rounded-xl placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all"
                            placeholder="Görüşme notunuzu buraya yazın..."
                        />
                        <Button onClick={handleSaveNote} disabled={noteLoading || !newNote.trim()} size="sm" className="w-full h-10 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/15 font-bold rounded-xl border-0">
                            {noteLoading ? "Ekleniyor..." : <><Plus className="mr-2 w-4 h-4" /> Notu Kaydet</>}
                        </Button>

                        <Button
                            onClick={handleSummarize}
                            disabled={summaryLoading}
                            size="sm"
                            className="w-full h-10 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white font-semibold shadow-lg shadow-slate-800/20 border-0 transition-all duration-200"
                        >
                            {summaryLoading ? (
                                "Özet Hazırlanıyor..."
                            ) : (
                                <><Sparkles className="mr-1.5 w-4 h-4" /> Konuşma Özetini Çıkar</>
                            )}
                        </Button>
                    </div>

                    {/* NOTES HISTORY (ACCORDION) */}
                    {notesList.length > 0 && (
                        <div className="space-y-2 pb-6">
                            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Geçmiş Görüşme Notları</h3>
                            {notesList.map((note) => (
                                <div key={note.id} className="border border-slate-200/80 rounded-xl overflow-hidden relative group bg-white hover:shadow-sm transition-shadow">
                                    <div
                                        className="w-full flex items-center justify-between p-3 hover:bg-slate-50/80 transition-colors cursor-pointer"
                                        onClick={() => setExpandedNoteId(expandedNoteId === note.id ? null : note.id)}
                                    >
                                        <span className="text-xs font-medium text-slate-500">
                                            {new Date(note.created_at).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                                        </span>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => handleDeleteNote(note.id, e)}
                                                className="p-1 hover:bg-red-100 rounded-lg text-slate-300 hover:text-red-500 transition-colors"
                                                title="Notu Sil"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                            <ChevronDown className={clsx("w-4 h-4 text-slate-300 transition-transform duration-200", expandedNoteId === note.id && "rotate-180")} />
                                        </div>
                                    </div>

                                    {expandedNoteId === note.id && (
                                        <div className="px-3 pb-3 text-sm text-slate-700 whitespace-pre-wrap border-t border-slate-100 pt-2 animate-in slide-in-from-top-1">
                                            {note.note}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </SheetContent>

            {/* EVENT DIALOG */}
            {tenantId && (
                <EventDialog
                    isOpen={showEventDialog}
                    onClose={() => setShowEventDialog(false)}
                    onSave={() => setShowEventDialog(false)}
                    tenantId={tenantId}
                    defaultCustomerId={customerId || undefined}
                />
            )}

            {/* SUMMARY DIALOG */}
            <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
                <DialogContent className="sm:max-w-[640px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
                    {/* Header */}
                    <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 px-6 py-5">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2.5 text-white text-lg font-bold">
                                <div className="p-2 bg-orange-500/20 rounded-xl">
                                    <Sparkles className="w-5 h-5 text-orange-400" />
                                </div>
                                Yapay Zeka Özeti
                            </DialogTitle>
                            <DialogDescription className="text-slate-400 text-sm mt-1.5 leading-relaxed">
                                Görüşme geçmişine dayalı oluşturulan otomatik özet. Dilerseniz düzenleyebilirsiniz.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    {/* Content */}
                    <div className="px-6 py-5">
                        <Textarea
                            value={summaryText}
                            onChange={(e) => setSummaryText(e.target.value)}
                            className="min-h-[280px] font-normal text-[15px] leading-relaxed text-slate-800 bg-slate-50/80 border-slate-200 rounded-xl placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all resize-none"
                            placeholder="Özet burada görünecek..."
                        />
                    </div>

                    {/* Footer */}
                    <div className="px-6 pb-5 flex items-center justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setSummaryOpen(false)}
                            className="h-11 px-6 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold transition-all"
                        >
                            İptal
                        </Button>
                        <Button
                            onClick={handleSaveSummary}
                            disabled={noteLoading || !summaryText.trim()}
                            className="h-11 px-6 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20 font-bold rounded-xl border-0 transition-all duration-200 hover:shadow-xl hover:shadow-orange-500/30"
                        >
                            {noteLoading ? "Kaydediliyor..." : <><Save className="mr-2 w-4 h-4" /> Özeti Kaydet</>}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </Sheet>
    );
}
