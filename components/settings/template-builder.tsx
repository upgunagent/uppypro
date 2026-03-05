"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Smartphone, Save, AlertCircle, FileImage, Video, FileText } from "lucide-react";

interface TemplateBuilderProps {
    tenantId: string;
}

export function TemplateBuilder({ tenantId }: TemplateBuilderProps) {
    const [name, setName] = useState("");
    const [language, setLanguage] = useState("tr");
    const [category, setCategory] = useState("MARKETING");

    const [headerType, setHeaderType] = useState("NONE");
    const [headerText, setHeaderText] = useState("");

    const [bodyText, setBodyText] = useState("");
    const [footerText, setFooterText] = useState("");

    const [buttons, setButtons] = useState<any[]>([]);

    // Helpers
    const addVariable = () => {
        const varCount = (bodyText.match(/\{\{\d+\}\}/g) || []).length + 1;
        setBodyText((prev) => prev + `{{${varCount}}}`);
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
        // Replace {{1}} with a generic placeholder like [Değişken 1]
        formatted = formatted.replace(/\{\{(\d+)\}\}/g, "<span class='bg-blue-100 text-blue-800 px-1 py-0.5 rounded text-[10px]'>[$1]</span>");
        return <div dangerouslySetInnerHTML={{ __html: formatted }} />;
    };

    const handleSave = async () => {
        alert("Şablon kaydetme ve Meta onayı işlemi bu sürümde API ucu bağlanarak gerçekleştirilecek.");
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 flex flex-col gap-6">
                <Card className="border-slate-200 shadow-sm">
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

                <Card className="border-slate-200 shadow-sm">
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
                                <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-sm flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    Gönderim sırasında bu şablona uygun bir medya dosyası ekleyebileceksiniz.
                                </div>
                            )}
                        </div>

                        <div className="space-y-4 border-t pt-4">
                            <div className="flex justify-between items-end">
                                <Label className="text-base font-semibold">Gövde Metni</Label>
                                <Button variant="outline" size="sm" onClick={addVariable} type="button">
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
                                    <Button variant="outline" size="sm" onClick={() => addButton("QUICK_REPLY")} disabled={buttons.length >= 3}>
                                        + Hızlı Yanıt
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => addButton("URL")} disabled={buttons.length >= 3}>
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
                        <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white">
                            <Save className="w-4 h-4 mr-2" />
                            Şablonu Onaya Gönder
                        </Button>
                    </CardFooter>
                </Card>
            </div>

            <div className="lg:col-span-4">
                <div className="sticky top-6">
                    <Card className="border-slate-200 shadow-sm overflow-hidden bg-slate-100">
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
                                    <div className="w-full bg-slate-200 h-32 flex items-center justify-center text-slate-500 border-b">
                                        {headerType === 'IMAGE' && <FileImage className="w-8 h-8 opacity-50" />}
                                        {headerType === 'VIDEO' && <Video className="w-8 h-8 opacity-50" />}
                                        {headerType === 'DOCUMENT' && <FileText className="w-8 h-8 opacity-50" />}
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
                                            <div key={idx} className={`py-2 text-center text-blue-500 font-medium text-sm flex items-center justify-center gap-1.5 ${idx > 0 ? 'border-t border-slate-100' : ''}`}>
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
