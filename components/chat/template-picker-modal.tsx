"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getWhatsAppTemplates } from "@/app/actions/whatsapp-templates";
import { Input } from "@/components/ui/input";
import { RefreshCw, MessageSquare, Send, Link as LinkIcon, Phone, MousePointerClick } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TemplatePickerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tenantId: string;
    onSelectTemplate: (name: string, language: string, components: any[], fullTemplate?: any, variables?: any) => void;
}

export function TemplatePickerModal({ open, onOpenChange, tenantId, onSelectTemplate }: TemplatePickerModalProps) {
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
    const [variables, setVariables] = useState<{ [key: string]: string }>({}); // e.g. "body_1": "değer", "header_image": "url"

    useEffect(() => {
        if (open) {
            fetchTemplates();
            setSelectedTemplate(null);
            setVariables({});
        }
    }, [open, tenantId]);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const res = await getWhatsAppTemplates(tenantId);
            if (res.success) {
                // Sadece APPROVED statüsündekileri göster
                setTemplates(res.data?.filter((t: any) => t.status === "APPROVED") || []);
            }
        } catch (error) {
            console.error("Templates fetch fail", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (tpl: any) => {
        setSelectedTemplate(tpl);

        const newVars: { [key: string]: string } = {};

        tpl.components?.forEach((comp: any) => {
            if (comp.type === "HEADER") {
                if (comp.format === "TEXT" && comp.text) {
                    const matches = comp.text.match(/\{\{([^}]+)\}\}/g);
                    if (matches) {
                        const uniqueVars = new Set(matches.map((m: string) => m.replace(/[{}]/g, "")));
                        uniqueVars.forEach(v => { newVars[`header_text_${v}`] = ""; });
                    }
                } else if (comp.format === "IMAGE") {
                    newVars["header_image"] = tpl.uppypro_media ? tpl.uppypro_media.file_url : "";
                } else if (comp.format === "DOCUMENT") {
                    newVars["header_document"] = tpl.uppypro_media ? tpl.uppypro_media.file_url : "";
                } else if (comp.format === "VIDEO") {
                    newVars["header_video"] = tpl.uppypro_media ? tpl.uppypro_media.file_url : "";
                }
            } else if (comp.type === "BODY" && comp.text) {
                const matches = comp.text.match(/\{\{([^}]+)\}\}/g);
                if (matches) {
                    const uniqueVars = new Set(matches.map((m: string) => m.replace(/[{}]/g, "")));
                    uniqueVars.forEach(v => { newVars[`body_${v}`] = ""; });
                }
            } else if (comp.type === "BUTTONS") {
                comp.buttons?.forEach((btn: any, idx: number) => {
                    if (btn.type === "URL" && btn.url?.includes("{{1}}")) {
                        newVars[`button_url_${idx}`] = "";
                    }
                });
            }
        });

        setVariables(newVars);
    };

    const handleVariableChange = (key: string, val: string) => {
        setVariables(prev => ({ ...prev, [key]: val }));
    };

    const handleSend = () => {
        if (!selectedTemplate) return;

        // Meta API'nin beklediği payload formatı
        const payloadComponent: any[] = [];

        const headerMediaTypes = ["image", "document", "video"];
        let hasHeaderParam = false;
        let headerParams: any[] = [];

        // Check Header variables
        Object.keys(variables).forEach(k => {
            if (k.startsWith("header_text_")) {
                hasHeaderParam = true;
                headerParams.push({ type: "text", text: variables[k]?.trim() || " " });
            } else if (k === "header_image" && variables[k]) {
                hasHeaderParam = true;
                headerParams.push({ type: "image", image: { link: variables[k] } });
            } else if (k === "header_document" && variables[k]) {
                hasHeaderParam = true;
                headerParams.push({ type: "document", document: { link: variables[k] } });
            } else if (k === "header_video" && variables[k]) {
                hasHeaderParam = true;
                headerParams.push({ type: "video", video: { link: variables[k] } });
            }
        });

        if (hasHeaderParam) {
            payloadComponent.push({
                type: "header",
                parameters: headerParams
            });
        }

        // Check Body variables (Sort numerically to match {{1}}, {{2}} order)
        const bodyKeys = Object.keys(variables).filter(k => k.startsWith("body_")).sort((a, b) => {
            const numA = parseInt(a.slice(5));
            const numB = parseInt(b.slice(5));
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.localeCompare(b);
        });
        if (bodyKeys.length > 0) {
            payloadComponent.push({
                type: "body",
                parameters: bodyKeys.map(k => ({ type: "text", text: variables[k]?.trim() || " " }))
            });
        }

        // Check Button variables
        const buttonKeys = Object.keys(variables).filter(k => k.startsWith("button_url_"));
        buttonKeys.forEach(k => {
            const idx = parseInt(k.split("_")[2]);
            let buttonLinkValue = variables[k]?.trim();

            // Eğer butona da statik bir değer atamak isteniyorsa ve UppyPro medyasından geliyorsa (İleride genişletilebilir)
            // Şimdilik sadece formdan gelen veya boş olan değeri atıyoruz
            if (!buttonLinkValue && selectedTemplate?.components?.find((c: any) => c.type === "BUTTONS")?.buttons[idx]?.url) {
                buttonLinkValue = selectedTemplate.components.find((c: any) => c.type === "BUTTONS").buttons[idx].url;
            }

            payloadComponent.push({
                type: "button",
                sub_type: "url",
                index: idx.toString(),
                parameters: [
                    { type: "text", text: buttonLinkValue || " " }
                ]
            });
        });

        onSelectTemplate(selectedTemplate.name, selectedTemplate.language, payloadComponent, selectedTemplate, variables);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>WhatsApp Şablonu Gönder</DialogTitle>
                    <DialogDescription>
                        Müşteriye 24 saati geçmiş bir konuşmayı başlatmak veya onaylı özel bir mesaj şablonu atmak için seçim yapın.
                    </DialogDescription>
                </DialogHeader>

                {!selectedTemplate ? (
                    <div className="py-4">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center p-8 text-slate-500">
                                <RefreshCw className="w-6 h-6 animate-spin mb-2" />
                                <span>Onaylı şablonlarınız yükleniyor...</span>
                            </div>
                        ) : templates.length === 0 ? (
                            <div className="text-center p-6 border border-dashed rounded-lg text-slate-500 bg-slate-50">
                                Hazırda onaylanmış bir şablonunuz bulunamadı. Lütfen "İşletme Ayarları" sayfasından ekleyin.
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2">
                                {templates.map(tpl => (
                                    <div
                                        key={tpl.id}
                                        onClick={() => handleSelect(tpl)}
                                        className="border border-slate-200 p-3 rounded-lg cursor-pointer hover:border-primary hover:bg-slate-50 transition-all text-left"
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-semibold text-slate-900">{tpl.name}</span>
                                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">{tpl.language}</Badge>
                                        </div>
                                        <p className="text-xs text-slate-600 line-clamp-2">
                                            {tpl.components?.find((c: any) => c.type === "BODY")?.text || ""}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-2 flex flex-col gap-4">
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 space-y-3">
                            <strong>Önizleme:</strong>

                            {/* Medya Önizlemesi */}
                            {selectedTemplate.uppypro_media && (
                                <div className="w-full relative rounded-md overflow-hidden bg-slate-200 flex items-center justify-center">
                                    {selectedTemplate.uppypro_media.file_type === "IMAGE" && (
                                        <img src={selectedTemplate.uppypro_media.file_url} alt="Şablon Görseli" className="max-h-[200px] object-contain w-full" />
                                    )}
                                    {selectedTemplate.uppypro_media.file_type === "VIDEO" && (
                                        <video src={selectedTemplate.uppypro_media.file_url} controls className="max-h-[200px] w-full" />
                                    )}
                                    {selectedTemplate.uppypro_media.file_type === "DOCUMENT" && (
                                        <div className="py-4 px-2 text-center text-slate-600 bg-slate-100 w-full">
                                            📄 Eklentili Belge/PDF
                                            <a href={selectedTemplate.uppypro_media.file_url} target="_blank" className="block text-xs text-blue-500 mt-1 underline truncate">Görüntüle</a>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="whitespace-pre-wrap mt-2">
                                {selectedTemplate.components?.find((c: any) => c.type === "BODY")?.text}
                            </div>

                            {/* Buton Önizlemesi */}
                            {selectedTemplate.components?.find((c: any) => c.type === "BUTTONS") && (
                                <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-slate-200">
                                    {selectedTemplate.components.find((c: any) => c.type === "BUTTONS").buttons.map((btn: any, idx: number) => (
                                        <div key={idx} className="bg-white border rounded-lg p-2 text-center text-blue-600 font-semibold text-xs shadow-sm flex items-center justify-center gap-1">
                                            {btn.type === "URL" && <LinkIcon className="w-3.5 h-3.5" />}
                                            {btn.type === "PHONE_NUMBER" && <Phone className="w-3.5 h-3.5" />}
                                            {btn.type === "QUICK_REPLY" && <MousePointerClick className="w-3.5 h-3.5" />}
                                            {btn.text}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {Object.keys(variables).length > 0 && Object.keys(variables).some(k => !(selectedTemplate?.uppypro_media && ["header_image", "header_document", "header_video"].includes(k))) && (
                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-slate-900 border-b pb-1">Şablon Parametrelerini Doldurun</h4>
                                {Object.keys(variables).map((key) => {
                                    if (selectedTemplate?.uppypro_media && ["header_image", "header_document", "header_video"].includes(key)) {
                                        return null; // Önceden yüklenmiş medyası varsa kullanıcıya form kutusu gösterme
                                    }

                                    let label = key;
                                    let placeholder = "Değer girin...";

                                    if (key.startsWith("body_")) label = `Mesaj Metni Değişkeni {{${key.split('_')[1]}}}`;
                                    else if (key.startsWith("header_text_")) label = `Başlık Değişkeni {{${key.split('_')[2]}}}`;
                                    else if (key === "header_image") { label = "Başlık Görseli (URL)"; placeholder = "https://..."; }
                                    else if (key === "header_document") { label = "Başlık Belgesi (URL)"; placeholder = "https://..."; }
                                    else if (key === "header_video") { label = "Başlık Videosu (URL)"; placeholder = "https://..."; }
                                    else if (key.startsWith("button_url_")) { label = `Buton Link Değişkeni`; placeholder = "URL parametresi..."; }

                                    return (
                                        <div key={key}>
                                            <label className="text-xs text-slate-500 mb-1 block">{label}</label>
                                            <Input
                                                value={variables[key]}
                                                onChange={(e) => handleVariableChange(key, e.target.value)}
                                                placeholder={placeholder}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-2 mt-4">
                            <Button variant="ghost" onClick={() => setSelectedTemplate(null)}>Geri</Button>
                            <Button
                                onClick={handleSend}
                                disabled={Object.keys(variables).filter(k => !(selectedTemplate?.uppypro_media && ["header_image", "header_document", "header_video"].includes(k))).some(k => variables[k].trim() === "")}
                            >
                                <Send className="w-4 h-4 mr-2" /> Gönder
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
