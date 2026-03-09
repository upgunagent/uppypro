"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Paperclip, Loader2 } from "lucide-react";
import { createTicket } from "@/app/actions/tickets";
import { createClient } from "@/lib/supabase/client";

interface NewTicketModalProps {
    tenantId: string;
    onClose: () => void;
    onSuccess: (ticketId: string) => void;
}

export function NewTicketModal({ tenantId, onClose, onSuccess }: NewTicketModalProps) {
    const [subject, setSubject] = useState("");
    const [category, setCategory] = useState("billing");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const categories = [
        { id: "billing", label: "Fatura & Ödeme" },
        { id: "subscription", label: "Abonelik & Paket Yükseltme" },
        { id: "meta_approval", label: "Meta (WhatsApp) Onay Sorunları" },
        { id: "connection_issue", label: "Instagram & Facebook Bağlantı Kopmaları" },
        { id: "ai_settings", label: "AI / Yapay Zeka Bot Ayarları" },
        { id: "campaign_reject", label: "Kampanya ve Şablon Reddi" },
        { id: "technical_error", label: "Teknik Hata Bildirimi" },
        { id: "other", label: "Diğer / Öneri" },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim() || !description.trim()) {
            alert("Lütfen konu başlığı ve açıklama giriniz.");
            return;
        }

        setLoading(true);
        let attachmentUrl = null;

        // Dosya Yükleme (Supabase Storage)
        if (file) {
            const supabase = createClient();
            const fileName = `ticket_${Date.now()}_${file.name}`;
            const { data, error } = await supabase.storage
                .from("ticket-attachments")
                .upload(fileName, file);

            if (error) {
                alert("Dosya yüklenirken hata oluştu: " + error.message);
                setLoading(false);
                return;
            }

            const { data: urlData } = supabase.storage
                .from("ticket-attachments")
                .getPublicUrl(fileName);

            attachmentUrl = urlData.publicUrl;
        }

        const res = await createTicket(tenantId, subject, category, description, attachmentUrl);
        setLoading(false);

        if (res.success && res.ticket) {
            onSuccess(res.ticket.id);
        } else {
            alert("Talep oluşturulurken hata: " + res.error);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm shadow-2xl">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-4 border-b border-slate-200">
                    <h2 className="text-xl font-bold">Yeni Destek Talebi</h2>
                    <Button variant="ghost" size="icon" onClick={onClose}><X size={20} /></Button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-slate-700">Konu Tipi</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full border border-slate-300 rounded-md h-10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                        >
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-slate-700">Kısa Konu Başlığı</label>
                        <Input
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Örn: Paketimi yükseltmek istiyorum"
                            required
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-slate-700">Sorun veya Talep Açıklaması</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full border border-slate-300 rounded-md p-3 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="Yaşadığınız sorunu detaylı şekilde açıklayınız..."
                            required
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                            Ek Dosya (İsteğe bağlı)
                            {file && <span className="text-xs text-green-600 truncate max-w-[200px]">{file.name}</span>}
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="file"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                        setFile(e.target.files[0]);
                                    }
                                }}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full flex items-center justify-center gap-2 border-dashed border-2 hover:bg-slate-50 text-slate-600"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Paperclip size={16} />
                                {file ? "Dosyayı Değiştir" : "Ekran Görüntüsü veya Dosya Yükle"}
                            </Button>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>İptal</Button>
                        <Button type="submit" disabled={loading} className="font-bold bg-orange-600 hover:bg-orange-700 text-white">
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Talebi Gönder
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
