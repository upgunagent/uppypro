"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Smartphone, Save, AlertCircle, FileImage, Video, FileText, Loader2, UploadCloud } from "lucide-react";
import { useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface TemplateBuilderProps {
    tenantId: string;
}

export function TemplateBuilder({ tenantId }: TemplateBuilderProps) {
    const [name, setName] = useState("");
    const [language, setLanguage] = useState("tr");
    const [category, setCategory] = useState("MARKETING");

    const [headerType, setHeaderType] = useState("NONE");
    const [headerText, setHeaderText] = useState("");
    const [headerUrl, setHeaderUrl] = useState(""); // Examples for media headers
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [bodyText, setBodyText] = useState("");
    const [bodyVariables, setBodyVariables] = useState<string[]>([]);
    const [footerText, setFooterText] = useState("");

    const [buttons, setButtons] = useState<any[]>([]);

    // Helpers
    const addVariable = () => {
        const currentCount = (bodyText.match(/\{\{\d+\}\}/g) || []).length;
        const nextIndex = currentCount + 1;
        setBodyText((prev) => prev + `{{${nextIndex}}}`);
        setBodyVariables([...bodyVariables, `Örnek ${nextIndex}`]);
    };

    const handleBodyVariablesChange = (index: number, val: string) => {
        const newVars = [...bodyVariables];
        newVars[index] = val;
        setBodyVariables(newVars);
    };

    const addButton = (type: string) => {
        if (buttons.length >= 3) return; // WhatsApp max 3 buttons per template usually
        setButtons([...buttons, { type, text: "", url: "", phone_number: "" }]);
    };

    const updateButton = (index: number, field: string, value: string) => {
        const newBtns = [...buttons];
        newBtns[index][field] = value;
        setButtons(newBtns);
    };

    const removeButton = (index: number) => {
        setButtons(buttons.filter((_, i) => i !== index));
    };

    const formatPreviewText = (text: string) => {
        if (!text) return "";
        let formatted = text.replace(/\n/g, "<br/>");
        // Replace {{1}} with the actual example value from bodyVariables
        formatted = formatted.replace(/\{\{(\d+)\}\}/g, (match, p1) => {
            const idx = parseInt(p1) - 1;
            const val = bodyVariables[idx] || match;
            return `<span class='bg-orange-100/50 text-orange-800 px-1 py-0.5 rounded'>${val}</span>`;
        });
        return <div dangerouslySetInnerHTML={{ __html: formatted }} />;
    };

    const [isSaving, setIsSaving] = useState(false);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const file = event.target.files?.[0];
            if (!file) return;

            setIsUploading(true);
            const supabase = createClient();
            const fileExt = file.name.split('.').pop();
            const fileName = `${tenantId}/${Math.random()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('whatsapp_templates')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('whatsapp_templates')
                .getPublicUrl(fileName);

            setHeaderUrl(publicUrl);
            alert("Medya başarıyla yüklendi.");
        } catch (error: any) {
            console.error("Upload error:", error);
            alert("Medya yüklenirken bir hata oluştu: " + error.message);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Build the payload for Meta API
            const components: any[] = [];

            // 1. Header
            if (headerType !== "NONE") {
                const headerComp: any = { type: "HEADER", format: headerType };
                if (headerType === "TEXT") {
                    headerComp.text = headerText;
                } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType)) {
                    // Provide the example header url
                    if (headerUrl) {
                        // Normally Meta expects 'header_handle' or 'header_url' undocumented workaround? 
                        // Actually the API allows 'header_handle' mostly. We will pass header_url to our backend,
                        // and either meta accepts it, or we handle it in the backend via resumable upload.
                        headerComp.example = { header_url: [headerUrl] };
                    }
                }
                components.push(headerComp);
            }

            // 2. Body
            const bodyComp: any = { type: "BODY", text: bodyText };
            if (bodyVariables.length > 0) {
                bodyComp.example = { body_text: [bodyVariables] };
            }
            components.push(bodyComp);

            // 3. Footer
            if (footerText) {
                components.push({ type: "FOOTER", text: footerText });
            }

            // 4. Buttons
            if (buttons.length > 0) {
                const mappedBtns = buttons.map(b => {
                    if (b.type === "URL") {
                        return { type: "URL", text: b.text, url: b.url };
                    } else if (b.type === "QUICK_REPLY") {
                        return { type: "QUICK_REPLY", text: b.text };
                    }
                    return b;
                });
                components.push({ type: "BUTTONS", buttons: mappedBtns });
            }

            const payload = {
                name: name,
                language: language,
                category: category,
                components: components
            };

            const { createWhatsAppTemplate, saveTemplateAttachment } = await import('@/app/actions/whatsapp-templates');
            const res = await createWhatsAppTemplate(tenantId, payload);

            if (res.success) {
                alert("Şablon başarıyla onaya gönderildi!");

                // If there's an image, save to db
                if (headerUrl && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType)) {
                    await saveTemplateAttachment({
                        tenantId: tenantId,
                        templateName: name,
                        language: language,
                        fileUrl: headerUrl,
                        fileType: headerType
                    });
                }

                // Reset logic or navigate away
            } else {
                alert("Meta Reddi / Hata: \n" + res.error);
            }
        } catch (err: any) {
            console.error(err);
            alert("Bir hata oluştu: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 flex flex-col gap-6">
                <Card className="border-orange-500 shadow-sm">
                    <CardHeader>
                        <CardTitle>Genel Bilgiler</CardTitle>
                        <CardDescription>Şablonunuzun temel ayarlarını belirleyin.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Şablon Adı</Label>
                                <Input
                                    placeholder="orn_yeni_sezon_indirimi"
                                    value={name}
                                    onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                />
                                <p className="text-xs text-slate-500">Sadece küçük harf, rakam ve alt çizgi.</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Kategori</Label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Kategori Seç" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="MARKETING">Pazarlama (Marketing)</SelectItem>
                                        <SelectItem value="UTILITY">İşlem (Utility)</SelectItem>
                                        <SelectItem value="AUTHENTICATION">Doğrulama (Authentication)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Dil</Label>
                                <Select value={language} onValueChange={setLanguage}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Dil Seç" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="tr">Türkçe (tr)</SelectItem>
                                        <SelectItem value="en">İngilizce (en)</SelectItem>
                                        <SelectItem value="en_US">İngilizce - US (en_US)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-orange-500 shadow-sm overflow-hidden">
                    <CardHeader>
                        <CardTitle>Şablon İçeriği</CardTitle>
                        <CardDescription>Mesajınızın başlık, gövde ve altbilgi (footer) kısımlarını oluşturun.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <Label className="text-base font-semibold">Başlık (Opsiyonel)</Label>
                            <Select value={headerType} onValueChange={setHeaderType}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Başlık Türü" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="NONE">Yok</SelectItem>
                                    <SelectItem value="TEXT">Metin</SelectItem>
                                    <SelectItem value="IMAGE">Görsel (Resim)</SelectItem>
                                    <SelectItem value="VIDEO">Video</SelectItem>
                                    <SelectItem value="DOCUMENT">Belge (PDF)</SelectItem>
                                </SelectContent>
                            </Select>

                            {headerType === "TEXT" && (
                                <Input
                                    placeholder="Başlık metni..."
                                    maxLength={60}
                                    value={headerText}
                                    onChange={(e) => setHeaderText(e.target.value)}
                                />
                            )}
                            {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType) && (
                                <div className="space-y-4">
                                    <div className="bg-orange-50 text-orange-800 p-3 rounded-md text-sm flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <span>Meta onayı için örnek bir medya yüklemeniz (veya URL girmeniz) zorunludur. (Medya dosyalarınızı ileride kampanya gönderirken sitemizden yükleyerek değiştirebilirsiniz)</span>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm">Örnek Medya URL veya Dosya</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="Örn: https://example.com/gorsel.jpg"
                                                value={headerUrl}
                                                onChange={(e) => setHeaderUrl(e.target.value)}
                                                className="flex-1"
                                            />
                                            <input
                                                type="file"
                                                className="hidden"
                                                ref={fileInputRef}
                                                onChange={handleFileUpload}
                                                accept={headerType === 'IMAGE' ? 'image/*' : headerType === 'VIDEO' ? 'video/*' : 'application/pdf'}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isUploading}
                                            >
                                                {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
                                                Yükle
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4 border-t pt-4">
                            <div className="flex justify-between items-end">
                                <Label className="text-base font-semibold">Gövde Metni</Label>
                                <Button size="sm" onClick={addVariable} type="button" className="bg-orange-500 hover:bg-orange-600 text-white border-0">
                                    <Plus className="w-4 h-4 mr-1" /> Değişken Ekle {'{{1}}'}
                                </Button>
                            </div>
                            <Textarea
                                placeholder="Mesajınızın ana gövdesini buraya yazın..."
                                className="min-h-[150px]"
                                value={bodyText}
                                onChange={(e) => setBodyText(e.target.value)}
                                maxLength={1024}
                            />
                            <p className="text-xs text-slate-500">Maksimum 1024 karakter. Müşteri isimlerini veya dinamik verileri eklemek için değişkenleri kullanın.</p>

                            {bodyVariables.length > 0 && (
                                <div className="space-y-3 mt-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                                    <Label className="text-sm font-semibold text-slate-700">Değişken Örnekleri</Label>
                                    <p className="text-xs text-slate-500 mb-2">Meta onayı için değişkenlerin yerine geçecek örnek kelimeler yazın. (Örn: İsim, Tarih vb.)</p>
                                    {bodyVariables.map((val, idx) => (
                                        <div key={idx} className="flex items-center gap-3">
                                            <div className="bg-orange-100/50 text-orange-800 font-bold px-2 py-1 rounded text-xs select-none">
                                                {`{{${idx + 1}}}`}
                                            </div>
                                            <Input
                                                placeholder={`Değişken ${idx + 1} için örnek...`}
                                                value={val}
                                                onChange={(e) => handleBodyVariablesChange(idx, e.target.value)}
                                                className="flex-1 bg-white h-8"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-4 border-t pt-4">
                            <Label className="text-base font-semibold">Altbilgi / Footer (Opsiyonel)</Label>
                            <Input
                                placeholder="Örn: Sorularınız için bize ulaşın."
                                maxLength={60}
                                value={footerText}
                                onChange={(e) => setFooterText(e.target.value)}
                            />
                        </div>

                        <div className="space-y-4 border-t pt-4">
                            <div className="flex justify-between items-center">
                                <Label className="text-base font-semibold">Butonlar (Opsiyonel)</Label>
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={() => addButton("QUICK_REPLY")} disabled={buttons.length >= 3} className="bg-orange-500 hover:bg-orange-600 text-white border-0">
                                        + Hızlı Yanıt
                                    </Button>
                                    <Button size="sm" onClick={() => addButton("URL")} disabled={buttons.length >= 3} className="bg-orange-500 hover:bg-orange-600 text-white border-0">
                                        + URL Bağlantısı
                                    </Button>
                                </div>
                            </div>

                            {buttons.map((btn, index) => (
                                <div key={index} className="flex gap-2 items-start bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-500 uppercase">{btn.type === "URL" ? "URL BAĞLANTISI" : "HIZLI YANIT"}</span>
                                        </div>
                                        <Input
                                            placeholder="Buton Metni"
                                            value={btn.text}
                                            onChange={(e) => updateButton(index, "text", e.target.value)}
                                            maxLength={20}
                                        />
                                        {btn.type === "URL" && (
                                            <Input
                                                placeholder="https://example.com"
                                                value={btn.url}
                                                onChange={(e) => updateButton(index, "url", e.target.value)}
                                            />
                                        )}
                                    </div>
                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => removeButton(index)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                            {buttons.length === 0 && (
                                <div className="text-sm text-slate-500 italic">Henüz buton eklemediniz. En fazla 3 adet ekleyebilirsiniz.</div>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter className="bg-slate-50 border-t flex justify-end py-4">
                        <Button onClick={handleSave} disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white">
                            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Şablonu Onaya Gönder
                        </Button>
                    </CardFooter>
                </Card>
            </div>

            <div className="lg:col-span-4">
                <div className="sticky top-6">
                    <Card className="border-orange-500 shadow-sm overflow-hidden bg-slate-100">
                        <CardHeader className="bg-white border-b pb-3 pt-4 px-4 sticky top-0 z-10">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Smartphone className="w-4 h-4" />
                                Önizleme
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 flex flex-col items-center bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-cover min-h-[400px]">

                            <div className="bg-white rounded-lg shadow-sm w-full max-w-[280px] mt-4 overflow-hidden text-sm">

                                {/* Header Preview */}
                                {headerType === "TEXT" && headerText && (
                                    <div className="p-3 pb-1 font-bold text-slate-900 break-words">
                                        {headerText}
                                    </div>
                                )}
                                {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType) && (
                                    <div className="w-full bg-slate-200 flex items-center justify-center text-slate-500 border-b overflow-hidden relative" style={{ minHeight: '8rem' }}>
                                        {headerType === 'IMAGE' && headerUrl ? (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img src={headerUrl} alt="Header Preview" className="w-full h-auto max-h-48 object-cover" />
                                        ) : (
                                            <>
                                                {headerType === 'IMAGE' && <FileImage className="w-8 h-8 opacity-50 my-8" />}
                                            </>
                                        )}
                                        {headerType === 'VIDEO' && <Video className="w-8 h-8 opacity-50 my-8" />}
                                        {headerType === 'DOCUMENT' && <FileText className="w-8 h-8 opacity-50 my-8" />}
                                    </div>
                                )}

                                {/* Body Preview */}
                                <div className="p-3 text-slate-800 break-words" style={{ fontSize: '13px', lineHeight: '1.4' }}>
                                    {bodyText ? formatPreviewText(bodyText) : <span className="text-slate-400 italic">Gövde metni...</span>}
                                </div>

                                {/* Footer Preview */}
                                {footerText && (
                                    <div className="px-3 pb-2 text-slate-500 text-[11px] break-words">
                                        {footerText}
                                    </div>
                                )}

                                {/* Buttons Preview */}
                                {buttons.length > 0 && (
                                    <div className="flex flex-col border-t border-slate-100">
                                        {buttons.map((btn, idx) => (
                                            <div key={idx} className={`py-2 text-center text-orange-500 font-medium text-sm flex items-center justify-center gap-1.5 ${idx > 0 ? 'border-t border-slate-100' : ''}`}>
                                                {btn.type === "URL" && <span className="text-xs">↗</span>}
                                                {btn.text || "Buton Metni"}
                                            </div>
                                        ))}
                                    </div>
                                )}

                            </div>

                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
