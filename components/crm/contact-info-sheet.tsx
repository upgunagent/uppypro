import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Phone, Briefcase, Mail, Save, X, Ban, Trash2, Eraser, MessageCircle, ChevronDown, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { clsx } from "clsx";

interface ContactInfoSheetProps {
    isOpen: boolean;
    onClose: () => void;
    conversationId: string;
    customerHandle: string; // Phone or Username
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

    // Profile Data
    const [formData, setFormData] = useState({
        full_name: "",
        company_name: "",
        phone: "",
        email: "",
    });

    // Notes Data
    const [newNote, setNewNote] = useState("");
    const [notesList, setNotesList] = useState<Note[]>([]);
    const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

    const [customerId, setCustomerId] = useState<string | null>(null);

    // Initial Data Fetch
    useEffect(() => {
        if (!isOpen) return;

        const fetchCustomerAndNotes = async () => {
            setLoading(true);
            const supabase = createClient();

            // 1. Check if conversation already has a customer_id
            const { data: conv } = await supabase
                .from("conversations")
                .select("customer_id, tenant_id")
                .eq("id", conversationId)
                .single();

            if (conv?.customer_id) {
                // Fetch Customer Data
                const { data: customer } = await supabase
                    .from("customers")
                    .select("*")
                    .eq("id", conv.customer_id)
                    .single();

                if (customer) {
                    setCustomerId(customer.id);
                    setFormData({
                        full_name: customer.full_name || "",
                        company_name: customer.company_name || "",
                        phone: customer.phone || "",
                        email: customer.email || "",
                    });

                    // Fetch Notes
                    const { data: notes } = await supabase
                        .from("customer_notes")
                        .select("*")
                        .eq("customer_id", customer.id)
                        .order("created_at", { ascending: false });

                    if (notes) setNotesList(notes);
                }
            } else {
                // Pre-fill defaults
                setCustomerId(null);
                setFormData(prev => ({
                    ...prev,
                    phone: platform === 'whatsapp' ? customerHandle : "",
                    full_name: "", // Leave blank for manual entry
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
                // UPDATE
                const { error } = await supabase
                    .from("customers")
                    .update({
                        full_name: formData.full_name,
                        company_name: formData.company_name,
                        phone: formData.phone,
                        email: formData.email,
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", customerId);

                if (error) throw error;
            } else {
                // INSERT
                const { data: newCustomer, error } = await supabase
                    .from("customers")
                    .insert({
                        tenant_id: conv.tenant_id,
                        full_name: formData.full_name,
                        company_name: formData.company_name,
                        phone: formData.phone,
                        email: formData.email,
                        profile_pic: initialProfilePic
                    })
                    .select("id")
                    .single();

                if (error) throw error;

                // LINK
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

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800" overlayClassName="bg-transparent backdrop-blur-none">
                <SheetHeader className="mb-6">
                    <SheetTitle>Kişi Bilgisi</SheetTitle>
                    <SheetDescription></SheetDescription>
                </SheetHeader>

                {/* HEADER PROFILE */}
                <div className="flex flex-col items-center mb-8">
                    <Avatar className="w-24 h-24 mb-4 border-4 border-white dark:border-slate-800 shadow-xl">
                        {platform === 'whatsapp' ? (
                            <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <MessageCircle className="w-12 h-12 text-green-500" />
                            </div>
                        ) : (
                            <>
                                <AvatarImage src={initialProfilePic} className="object-cover" />
                                <AvatarFallback className="text-2xl bg-slate-200 dark:bg-slate-800">
                                    {customerHandle.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </>
                        )}
                    </Avatar>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        {formData.full_name || customerHandle}
                    </h2>
                    <p className="text-sm text-slate-500 font-mono">
                        {platform === 'whatsapp' ? '+' + customerHandle : '@' + customerHandle}
                    </p>
                </div>

                {/* PROFILE FORM */}
                <div className="space-y-4 mb-8">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-slate-500">Ad Soyad</label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <Input
                                value={formData.full_name}
                                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                className="pl-9 bg-white text-black border-slate-300 placeholder:text-slate-400 focus:ring-slate-400"
                                placeholder="Ad Soyad girin..."
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-slate-500">Firma Adı</label>
                        <div className="relative">
                            <Briefcase className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <Input
                                value={formData.company_name}
                                onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                                className="pl-9 bg-white text-black border-slate-300 placeholder:text-slate-400 focus:ring-slate-400"
                                placeholder="Firma adı..."
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-slate-500">İletişim Numarası</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <Input
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                className="pl-9 bg-white text-black border-slate-300 placeholder:text-slate-400 focus:ring-slate-400"
                                placeholder="+90..."
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-slate-500">E-posta Adresi</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <Input
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="pl-9 bg-white text-black border-slate-300 placeholder:text-slate-400 focus:ring-slate-400"
                                placeholder="ornek@sirket.com"
                            />
                        </div>
                    </div>

                    <Button onClick={handleSaveProfile} disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white">
                        {loading ? "Kaydediliyor..." : <><Save className="mr-2 w-4 h-4" /> Değişiklikleri Kaydet</>}
                    </Button>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800 my-6" />

                {/* NOTE ENTRY */}
                <div className="space-y-3 mb-8">
                    <label className="text-xs font-semibold uppercase text-slate-500">Yeni Görüşme Notu</label>
                    <Textarea
                        value={newNote}
                        onChange={e => setNewNote(e.target.value)}
                        className="min-h-[100px] resize-none text-slate-900 dark:text-slate-100"
                        placeholder="Notunuzu buraya yazın..."
                    />
                    <Button onClick={handleSaveNote} disabled={noteLoading || !newNote.trim()} size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                        {noteLoading ? "Ekleniyor..." : <><Plus className="mr-2 w-4 h-4" /> Notu Kaydet</>}
                    </Button>
                </div>



                {/* NOTES HISTORY (ACCORDION) */}
                {notesList.length > 0 && (
                    <div className="space-y-2 pb-10">
                        <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Geçmiş Görüşme Notları</h3>
                        {notesList.map((note) => (
                            <div key={note.id} className="border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden relative group">
                                <div
                                    className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    onClick={() => setExpandedNoteId(expandedNoteId === note.id ? null : note.id)}
                                >
                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                        {new Date(note.created_at).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                                    </span>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => handleDeleteNote(note.id, e)}
                                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-slate-400 hover:text-red-600 transition-colors"
                                            title="Notu Sil"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                        <ChevronDown className={clsx("w-4 h-4 text-slate-400 transition-transform duration-200", expandedNoteId === note.id && "rotate-180")} />
                                    </div>
                                </div>

                                {expandedNoteId === note.id && (
                                    <div className="p-3 bg-white dark:bg-black text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-1">
                                        {note.note}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

            </SheetContent>
        </Sheet>
    );
}
