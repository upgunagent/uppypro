"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, MessageSquare, RefreshCw, AlertCircle, Image as ImageIcon, Video, FileText, Link as LinkIcon, Phone, MousePointerClick, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getWhatsAppTemplates, saveTemplateAttachment } from "@/app/actions/whatsapp-templates";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

export function TemplatesCard({ tenantId }: { tenantId: string }) {
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [uploadingTpl, setUploadingTpl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchTemplates = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getWhatsAppTemplates(tenantId);
            if (res.success) {
                setTemplates(res.data || []);
            } else {
                setError(res.error || "Şablonlar yüklenirken hata oluştu.");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, tpl: any, format: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // WhatsApp Dosya Boyutu Limitleri Kontrolü
        const fSizeMB = file.size / (1024 * 1024);
        if (format === 'IMAGE' && fSizeMB > 5) {
            alert(`Hata: WhatsApp şablonları için resim boyutu maksimum 5 MB olabilir. Sizin dosyanız: ${fSizeMB.toFixed(2)} MB`);
            return;
        }
        if (format === 'VIDEO' && fSizeMB > 16) {
            alert(`Hata: WhatsApp şablonları için video boyutu maksimum 16 MB olabilir. Sizin dosyanız: ${fSizeMB.toFixed(2)} MB`);
            return;
        }
        if (format === 'DOCUMENT' && fSizeMB > 100) {
            alert(`Hata: WhatsApp şablonları için belge boyutu maksimum 100 MB olabilir. Sizin dosyanız: ${fSizeMB.toFixed(2)} MB`);
            return;
        }

        setUploadingTpl(tpl.id);
        const supabase = createClient();

        const fileExt = file.name.split('.').pop();
        const fileName = `${tenantId}/${tpl.name}_${tpl.language}_${Date.now()}.${fileExt}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('whatsapp_templates')
                .upload(fileName, file, {
                    upsert: true,
                    contentType: file.type // Kritik: Meta API'nin MIME type engeline takılmaması için
                });

            if (uploadError) throw new Error("Görsel yüklenemedi: " + uploadError.message);

            const { data } = supabase.storage.from('whatsapp_templates').getPublicUrl(fileName);

            const res = await saveTemplateAttachment({
                tenantId,
                templateName: tpl.name,
                language: tpl.language,
                fileUrl: data.publicUrl,
                fileType: format
            });

            if (res.success) {
                await fetchTemplates(); // Listeyi yenile ki tumbnail gelsin
            } else {
                alert("Veritabanına kaydedilirken hata oluştu: " + res.error);
            }
        } catch (error: any) {
            alert(error.message);
        } finally {
            setUploadingTpl(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, [tenantId]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "APPROVED": return "bg-green-100 text-green-800";
            case "PENDING": return "bg-yellow-100 text-yellow-800";
            case "REJECTED": return "bg-red-100 text-red-800";
            default: return "bg-slate-100 text-slate-800";
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-primary" />
                        WhatsApp Şablonları
                    </CardTitle>
                    <CardDescription>
                        Müşterilerinize 24 saat kuralı dışında mesaj gönderebilmek için kullanabileceğiniz onaylı Meta şablonlarınız.
                    </CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchTemplates} disabled={loading} size="icon">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="text-center py-8 text-slate-500 border border-dashed rounded-xl flex items-center justify-center">
                        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                        Şablonlar yükleniyor...
                    </div>
                ) : error ? (
                    <div className="text-center py-8 text-red-500 border border-dashed border-red-200 rounded-xl bg-red-50">
                        <p className="font-medium">Bağlantı Hatası</p>
                        <p className="text-sm">{error}</p>
                    </div>
                ) : templates.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 border border-dashed rounded-xl">
                        Kayıtlı bir WhatsApp şablonunuz bulunmuyor. Sağ üstten yeni bir şablon ekleyerek başlayabilirsiniz.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {templates.map((tpl) => (
                            <div key={tpl.id} className="border border-slate-200 rounded-lg p-4 flex flex-col gap-2 hover:border-slate-300 transition-colors h-full">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-slate-900 break-all">{tpl.name}</h4>
                                    <Badge variant="secondary" className={getStatusColor(tpl.status)}>
                                        {tpl.status}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                                    <span className="capitalize">{tpl.category}</span>
                                    <span>•</span>
                                    <span>{tpl.language}</span>
                                </div>

                                {tpl.components?.find((c: any) => c.type === "HEADER" && (c.format === "IMAGE" || c.format === "VIDEO" || c.format === "DOCUMENT")) && (
                                    <div className="flex flex-col gap-2 mb-2">
                                        <div className="flex items-center justify-between text-slate-600 bg-slate-100/50 p-2 rounded-md border border-slate-100">
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

                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    accept={tpl.components?.find((c: any) => c.type === "HEADER").format === "IMAGE" ? "image/*" : tpl.components?.find((c: any) => c.type === "HEADER").format === "VIDEO" ? "video/*" : "application/pdf"}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    onChange={(e) => handleFileUpload(e, tpl, tpl.components?.find((c: any) => c.type === "HEADER").format)}
                                                    disabled={uploadingTpl === tpl.id}
                                                />
                                                <Button size="sm" variant="outline" className="h-7 text-xs px-2" disabled={uploadingTpl === tpl.id}>
                                                    {uploadingTpl === tpl.id ? (
                                                        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                                    ) : (
                                                        <Upload className="w-3 h-3 mr-1" />
                                                    )}
                                                    {tpl.uppypro_media ? "Değiştir" : "Yükle"}
                                                </Button>
                                            </div>
                                        </div>

                                        {tpl.uppypro_media && tpl.uppypro_media.file_type === "IMAGE" && (
                                            <div className="relative w-full h-32 rounded-md overflow-hidden border border-slate-200">
                                                <img src={tpl.uppypro_media.file_url} alt="Template Media" className="object-cover w-full h-full" />
                                            </div>
                                        )}
                                        {tpl.uppypro_media && tpl.uppypro_media.file_type !== "IMAGE" && (
                                            <div className="w-full text-xs text-blue-600 bg-blue-50 p-2 rounded-md truncate">
                                                {tpl.uppypro_media.file_url}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="text-sm text-slate-700 bg-slate-50 p-3 rounded-md line-clamp-none whitespace-pre-wrap flex-1 min-h-[100px] overflow-y-auto max-h-[300px]">
                                    {tpl.components?.find((c: any) => c.type === "BODY")?.text || "Gövde Yok"}
                                </div>

                                {tpl.components?.find((c: any) => c.type === "BUTTONS") && (
                                    <div className="flex flex-col gap-1 mt-2">
                                        {tpl.components.find((c: any) => c.type === "BUTTONS").buttons.map((btn: any, idx: number) => (
                                            <div key={idx} className="flex flex-col text-xs bg-slate-100 p-2 rounded border border-slate-200 text-slate-600">
                                                <div className="flex items-center gap-1.5 font-semibold">
                                                    {btn.type === "URL" && <LinkIcon className="w-3.5 h-3.5 text-blue-500" />}
                                                    {btn.type === "PHONE_NUMBER" && <Phone className="w-3.5 h-3.5 text-green-500" />}
                                                    {btn.type === "QUICK_REPLY" && <MousePointerClick className="w-3.5 h-3.5 text-indigo-500" />}
                                                    {btn.text}
                                                </div>
                                                {btn.type === "URL" && btn.url && (
                                                    <span className="text-[10px] text-slate-400 mt-0.5 ml-5 truncate font-mono">
                                                        {btn.url}
                                                    </span>
                                                )}
                                                {btn.type === "PHONE_NUMBER" && btn.phone_number && (
                                                    <span className="text-[10px] text-slate-400 mt-0.5 ml-5 font-mono">
                                                        {btn.phone_number}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-6 flex items-start gap-4">
                    <div className="bg-blue-100 p-2 rounded-full text-blue-600 mt-1 flex-shrink-0">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-blue-900 text-lg mb-2">WhatsApp Şablonları Nasıl Oluşturulur?</h3>
                        <p className="text-blue-800 text-sm mb-4 leading-relaxed">
                            Müşterilerinize görselli (Video, Resim, PDF) kampanyalar veya tıkanabilir interaktif butonlar (URL, Hızlı Yanıt) içeren mesajlar göndermek için <strong>Meta'nın resmî Gelişmiş Şablon Kütüphanesi ve Oluşturucusunu</strong> kullanmanız gerekmektedir.
                            <br /><br />
                            Meta Yöneticisi üzerinden oluşturduğunuz ve onaylanan tüm şablonlar (Hazır veya Özel tasarımlar) <strong>otomatik olarak bu panele senkronize olur</strong> ve paneldeki "Şablon Gönder" menüsünden görselleriyle birlikte müşterilerinize iletilebilir.
                        </p>
                        <a
                            href="https://business.facebook.com/latest/whatsapp_manager/message_templates"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white border-0">
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Meta Şablon Yöneticisine Git
                            </Button>
                        </a>
                    </div>
                </div>

            </CardContent>
        </Card>
    );
}
