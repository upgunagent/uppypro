"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sparkles, MessageSquarePlus, Trash2, Plus, Image as ImageIcon, Upload, X, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";

interface CannedResponse {
    id: string;
    shortcut: string;
    content: string;
    media_url: string | null;
}

interface ChatSettingsTabProps {
    tenantId: string;
    initialAiEnabled: boolean;
    initialResponses: CannedResponse[];
}

export function ChatSettingsTab({ tenantId, initialAiEnabled, initialResponses }: ChatSettingsTabProps) {
    const router = useRouter();
    const supabase = createClient();

    const [aiEnabled, setAiEnabled] = useState(initialAiEnabled);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [shortcut, setShortcut] = useState("");
    const [content, setContent] = useState("");
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "done" | "failed">("idle");
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleToggleAi = async (checked: boolean) => {
        setAiEnabled(checked);
        try {
            const { error } = await supabase.from("tenants").update({ ai_auto_correct_enabled: checked }).eq("id", tenantId);
            if (error) throw error;
            toast.success(`Yapay zeka düzeltme ${checked ? "açıldı" : "kapatıldı"}.`);
        } catch {
            setAiEnabled(!checked);
            toast.error("Ayar kaydedilemedi.");
        }
    };

    const openDialog = () => {
        setShortcut("");
        setContent("");
        setMediaFile(null);
        setMediaPreview(null);
        setUploadStatus("idle");
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        if (isSaving) return; // Kayıt sırasında kapanmasın
        setIsDialogOpen(false);
        setShortcut("");
        setContent("");
        setMediaFile(null);
        setMediaPreview(null);
        setUploadStatus("idle");
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 20 * 1024 * 1024) {
            toast.error("Dosya 20MB'dan küçük olmalıdır.");
            return;
        }
        setMediaFile(file);
        setMediaPreview(URL.createObjectURL(file));
    };

    const handleSave = async () => {
        if (!shortcut.trim() || !content.trim()) {
            toast.error("Kısayol ve mesaj içeriği zorunludur.");
            return;
        }

        setIsSaving(true);
        let finalMediaUrl: string | null = null;

        try {
            // 1. Medya yükleme (opsiyonel - hata olsa bile devam et)
            if (mediaFile) {
                setUploadStatus("uploading");
                try {
                    const ext = mediaFile.name.split(".").pop() || "png";
                    const filePath = `${tenantId}/${Date.now()}.${ext}`;

                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from("canned_media")
                        .upload(filePath, mediaFile, { cacheControl: "3600", upsert: false });

                    if (uploadError) {
                        console.warn("Medya yükleme uyarısı:", uploadError.message);
                        setUploadStatus("failed");
                        toast.warning("Görsel yüklenemedi, metin kaydedilecek.", { description: uploadError.message });
                    } else {
                        const { data: { publicUrl } } = supabase.storage.from("canned_media").getPublicUrl(filePath);
                        finalMediaUrl = publicUrl;
                        setUploadStatus("done");
                    }
                } catch (mediaErr: any) {
                    console.warn("Medya yükleme exception:", mediaErr);
                    setUploadStatus("failed");
                }
            }

            // 2. Veritabanına doğrudan Supabase client ile kaydet (Server Action'a gerek yok)
            let cleanShortcut = shortcut.trim().toLowerCase().replace(/^\/+/, "").replace(/\s+/g, "-");

            const { data: insertData, error: insertError } = await supabase
                .from("canned_responses")
                .insert([{
                    tenant_id: tenantId,
                    shortcut: cleanShortcut,
                    content: content.trim(),
                    media_url: finalMediaUrl,
                    created_by: (await supabase.auth.getUser()).data.user?.id
                }])
                .select()
                .single();

            if (insertError) {
                if (insertError.code === "23505") {
                    toast.error(`"/${cleanShortcut}" kısayolu zaten kullanımda.`);
                } else {
                    toast.error("Kayıt hatası", { description: insertError.message });
                    console.error("Insert error:", insertError);
                }
                setIsSaving(false);
                return;
            }

            // 3. Başarı!
            toast.success("Hazır cevap başarıyla kaydedildi! ✅");
            setIsDialogOpen(false);
            setShortcut("");
            setContent("");
            setMediaFile(null);
            setMediaPreview(null);
            setUploadStatus("idle");
            router.refresh();

        } catch (err: any) {
            console.error("handleSave exception:", err);
            toast.error("Beklenmeyen hata", { description: err?.message || "Bir şeyler ters gitti." });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try {
            const { error } = await supabase
                .from("canned_responses")
                .delete()
                .match({ id, tenant_id: tenantId });

            if (error) {
                toast.error("Silinemedi", { description: error.message });
            } else {
                toast.success("Hazır cevap silindi.");
                router.refresh();
            }
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* AI Auto-Correct */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Yapay Zeka (AI) Düzeltme</h3>
                        <p className="text-sm text-slate-500">Müşteriye yazarken metninizin imlasını ve profesyonelliğini tek tıkla düzeltin.</p>
                    </div>
                </div>
                <div className="flex items-center justify-between py-2">
                    <div>
                        <Label htmlFor="ai-toggle" className="text-base font-medium text-slate-700">Akıllı Yazım Düzeltmeyi Aktifleştir</Label>
                        <p className="text-sm text-slate-500 mt-0.5">Mesaj kutusunda "✨ AI Düzelt" butonunu görünür yapar.</p>
                    </div>
                    <Switch id="ai-toggle" checked={aiEnabled} onCheckedChange={handleToggleAi} className="data-[state=checked]:bg-orange-600" />
                </div>
            </div>

            {/* Hazır Cevaplar */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                            <MessageSquarePlus className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Hazır Cevaplar (Hızlı Yanıtlar)</h3>
                            <p className="text-sm text-slate-500">Sık kullandığınız mesajları kaydedin ve "/" komutu ile hızlıca çağırın.</p>
                        </div>
                    </div>
                    <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={openDialog}>
                        <Plus className="w-4 h-4 mr-2" /> Yeni Cevap Ekle
                    </Button>
                </div>

                {initialResponses.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        <MessageSquarePlus className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <h4 className="text-slate-700 font-medium mb-1">Henüz Hazır Cevap Eklenmemiş</h4>
                        <p className="text-slate-500 text-sm max-w-sm mx-auto mb-4">
                            Müşterilerinize hızlıca gönderebileceğiniz cevapları buraya ekleyin.
                        </p>
                        <Button variant="outline" className="border-orange-200 text-orange-600 hover:bg-orange-50" onClick={openDialog}>
                            İlk Cevabınızı Oluşturun
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {initialResponses.map((resp) => (
                            <div key={resp.id} className="flex items-start justify-between p-4 border border-slate-200 rounded-lg hover:border-orange-200 transition-colors bg-slate-50/50">
                                <div className="space-y-1 flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="inline-flex items-center px-2 py-1 rounded bg-slate-200 text-slate-700 text-xs font-mono font-bold">
                                            /{resp.shortcut}
                                        </span>
                                        {resp.media_url && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-600 text-xs font-medium">
                                                <ImageIcon className="w-3 h-3" /> Medya Eki
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-slate-600 text-sm line-clamp-2">{resp.content}</p>
                                    {resp.media_url && (
                                        <img src={resp.media_url} alt="Ek görsel" className="mt-2 max-h-16 rounded-md border border-slate-200 object-cover" />
                                    )}
                                </div>
                                <Button
                                    variant="ghost" size="icon"
                                    className="h-8 w-8 text-slate-400 hover:text-red-600 ml-4 shrink-0"
                                    onClick={() => handleDelete(resp.id)}
                                    disabled={deletingId === resp.id}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Ekle Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open && !isSaving) closeDialog(); }}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>Yeni Hazır Cevap Ekle</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Kısayol */}
                        <div className="space-y-2">
                            <Label>Kısayol <span className="text-orange-500">*</span></Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold select-none">/</span>
                                <Input
                                    value={shortcut}
                                    onChange={(e) => setShortcut(e.target.value)}
                                    className="pl-7"
                                    placeholder="Örn: fiyat, merhaba, tesekkur"
                                    disabled={isSaving}
                                />
                            </div>
                            <p className="text-xs text-slate-400">Chat ekranında "/" yazıp bu kısayolu yazarak çağırabilirsiniz.</p>
                        </div>

                        {/* İçerik */}
                        <div className="space-y-2">
                            <Label>Mesaj İçeriği <span className="text-orange-500">*</span></Label>
                            <Textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Müşteriye gönderilecek hazır mesaj metni..."
                                className="min-h-[120px] resize-y"
                                disabled={isSaving}
                            />
                        </div>

                        {/* Medya */}
                        <div className="space-y-2">
                            <Label>Görsel / Medya Eki <span className="text-slate-400 text-xs">(İsteğe bağlı)</span></Label>

                            {mediaPreview ? (
                                <div className="relative border border-slate-200 rounded-lg overflow-hidden">
                                    <img src={mediaPreview} alt="Seçilen görsel" className="w-full max-h-48 object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => { setMediaFile(null); setMediaPreview(null); setUploadStatus("idle"); }}
                                        className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
                                        disabled={isSaving}
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                    <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                                        {uploadStatus === "failed"
                                            ? <><AlertCircle className="w-3 h-3 text-yellow-400" /> Yükleme başarısız (opsiyonel)</>
                                            : <><CheckCircle className="w-3 h-3 text-green-400" /> {mediaFile?.name}</>
                                        }
                                    </div>
                                </div>
                            ) : (
                                <label
                                    htmlFor="media-upload"
                                    className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 hover:border-orange-300 rounded-lg p-6 cursor-pointer transition-colors group bg-slate-50/50 hover:bg-orange-50/30"
                                >
                                    <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-orange-100 flex items-center justify-center transition-colors">
                                        <Upload className="w-5 h-5 text-slate-400 group-hover:text-orange-500" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-medium text-slate-600 group-hover:text-orange-600">Görsel / Video Seçin</p>
                                        <p className="text-xs text-slate-400 mt-0.5">PNG, JPG, GIF veya MP4 — Maks 20MB</p>
                                    </div>
                                    <input id="media-upload" type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} disabled={isSaving} />
                                </label>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={closeDialog} disabled={isSaving}>
                            İptal
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSave}
                            className="bg-orange-600 hover:bg-orange-700 text-white min-w-[110px]"
                            disabled={isSaving || !shortcut.trim() || !content.trim()}
                        >
                            {uploadStatus === "uploading" ? (
                                <><Upload className="w-4 h-4 mr-2 animate-bounce" />Yükleniyor...</>
                            ) : isSaving ? "Kaydediliyor..." : "Kaydet"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
