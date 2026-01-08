import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Phone, Briefcase, Mail, Save, X, Ban, Trash2, Eraser, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deleteConversation, clearConversationMessages } from "@/app/actions/chat";

interface ContactInfoSheetProps {
    isOpen: boolean;
    onClose: () => void;
    conversationId: string;
    customerHandle: string; // Phone or Username
    platform: string;
    initialProfilePic?: string;
    triggerRef?: React.RefObject<HTMLButtonElement>;
}

export function ContactInfoSheet({ isOpen, onClose, conversationId, customerHandle, platform, initialProfilePic }: ContactInfoSheetProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        full_name: "",
        company_name: "",
        phone: "",
        email: "",
        notes: ""
    });
    const [customerId, setCustomerId] = useState<string | null>(null);

    // Initial Data Fetch
    useEffect(() => {
        if (!isOpen) return;

        const fetchCustomer = async () => {
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
                        notes: customer.notes || ""
                    });
                }
            } else {
                // Pre-fill defaults
                setCustomerId(null);
                setFormData(prev => ({
                    ...prev,
                    phone: platform === 'whatsapp' ? customerHandle : "",
                    full_name: "", // Leave blank for manual entry
                }));
            }
            setLoading(false);
        };

        fetchCustomer();
    }, [isOpen, conversationId, customerHandle, platform]);

    const handleSave = async () => {
        setLoading(true);
        const supabase = createClient();

        try {
            // Get Tenant ID first (usually from context, but fetching from conversation for safety)
            const { data: conv } = await supabase.from("conversations").select("tenant_id, customer_id").eq("id", conversationId).single();
            if (!conv) throw new Error("Conversation not found");

            let targetCustomerId = customerId;

            if (customerId) {
                // UPDATE
                const { error } = await supabase
                    .from("customers")
                    .update({
                        full_name: formData.full_name,
                        company_name: formData.company_name,
                        phone: formData.phone,
                        email: formData.email,
                        notes: formData.notes,
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
                        notes: formData.notes,
                        profile_pic: initialProfilePic // Save initial pic
                    })
                    .select("id")
                    .single();

                if (error) throw error;
                targetCustomerId = newCustomer.id;

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

    const handleClearChat = async () => {
        if (!confirm("Bu sohbetin tüm mesajlarını silmek istediğinize emin misiniz?")) return;
        try {
            setLoading(true);
            await clearConversationMessages(conversationId);
            alert("Sohbet temizlendi.");
        } catch (e: any) {
            alert("Hata: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteChat = async () => {
        if (!confirm("Bu sohbeti tamamen silmek istediğinize emin misiniz?")) return;
        try {
            setLoading(true);
            await deleteConversation(conversationId);
            alert("Sohbet silindi.");
            router.push('/panel/inbox'); // Redirect
            onClose();
        } catch (e: any) {
            alert("Hata: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
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

                {/* FORM */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-slate-500">Ad Soyad</label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <Input
                                value={formData.full_name}
                                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                className="pl-9"
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
                                className="pl-9"
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
                                className="pl-9"
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
                                className="pl-9"
                                placeholder="ornek@sirket.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-slate-500">Görüşme Notları</label>
                        <Textarea
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            className="min-h-[120px] resize-none text-slate-900 dark:text-slate-100"
                            placeholder="Müşteri ile ilgili notlar..."
                        />
                    </div>

                    <Button onClick={handleSave} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                        {loading ? "Kaydediliyor..." : <><Save className="mr-2 w-4 h-4" /> Değişiklikleri Kaydet</>}
                    </Button>
                </div>

                <div className="my-8 border-t border-slate-200 dark:border-slate-800" />

                {/* DANGER ZONE (Updated) */}
                <div className="space-y-2">
                    <Button variant="ghost" onClick={handleClearChat} disabled={loading} className="w-full justify-start text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                        <Eraser className="mr-3 w-4 h-4" /> Sohbeti Temizle
                    </Button>
                    <Button variant="ghost" onClick={handleDeleteChat} disabled={loading} className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Trash2 className="mr-3 w-4 h-4" /> Sohbeti Sil
                    </Button>
                </div>

            </SheetContent>
        </Sheet>
    );
}
