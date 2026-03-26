"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { updateAiSettings } from "./actions";
import { Bot, Save, Loader2, Wand2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useState, useRef } from "react";
import { SystemMessageWizard } from "@/components/ai/system-message-wizard";

import { getPackageName } from "@/lib/subscription-utils";

export function AiSettingsForm({ settings, subscription }: { settings: any, subscription: any }) {
    const formRef = useRef<HTMLFormElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [loading, setLoading] = useState(false);
    const [isAiEnabled, setIsAiEnabled] = useState(settings?.ai_operational_enabled || false);
    const [showWizard, setShowWizard] = useState(false);
    const { toast } = useToast();

    const packageName = getPackageName(subscription);

    const isAiAllowed = packageName !== 'UppyPro Inbox';

    async function handleSubmit(formData: FormData) {
        if (!isAiAllowed) return;

        setLoading(true);
        try {
            const result = await updateAiSettings(formData);
            if (result?.error) {
                toast({
                    variant: "destructive",
                    title: "Hata",
                    description: result.error,
                });
            } else {
                toast({
                    title: "Başarılı",
                    description: "AI ayarları güncellendi.",
                });
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Hata",
                description: "Bir hata oluştu.",
            });
        } finally {
            setLoading(false);
        }
    }

    function handleWizardComplete(systemMessage: string) {
        // Set the textarea value
        if (textareaRef.current) {
            // Use native setter to trigger React's controlled input
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
            nativeInputValueSetter?.call(textareaRef.current, systemMessage);
            textareaRef.current.dispatchEvent(new Event('input', { bubbles: true }));
        }
        setShowWizard(false);
        toast({
            title: "Sistem Mesajı Oluşturuldu ✨",
            description: "Mesaj alanına eklendi. Kontrol edip 'Ayarları Kaydet' butonuna basın.",
        });
    }

    return (
        <>
        <form ref={formRef} action={handleSubmit} className="space-y-6">
            <input type="hidden" name="aiOperationalEnabled" value={isAiEnabled ? "true" : "false"} />
            <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-orange-50 rounded-lg">
                        <Bot className="text-orange-600 w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-lg text-slate-900">AI Asistan Ayarları</h3>
                        <p className="text-sm text-slate-500">Asistanınızın davranışlarını ve firma bilgilerinizi yapılandırın.</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        {isAiAllowed ? (
                            <>
                                <span className={isAiEnabled ? "bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200" : "bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-bold border border-slate-200"}>
                                    {isAiEnabled ? "Aktif" : "Pasif"}
                                </span>
                                <div className="flex items-center gap-2" title="AI Asistanı Aç/Kapat">
                                    <Switch
                                        checked={isAiEnabled}
                                        onCheckedChange={(val) => {
                                            setIsAiEnabled(val);
                                            setTimeout(() => {
                                                formRef.current?.requestSubmit();
                                            }, 50);
                                        }}
                                        disabled={loading}
                                        className="data-[state=checked]:bg-green-500"
                                    />
                                </div>
                            </>
                        ) : (
                            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold border border-red-200">
                                Kapalı
                            </span>
                        )}
                    </div>
                </div>

                {!isAiAllowed && (
                    <div className="bg-orange-50 text-orange-800 p-4 rounded-lg text-sm mb-4 border border-orange-200">
                        <strong>Mevcut aboneliğiniz UppyPro Inbox paketidir.</strong>
                        <p className="mt-1">Bu paket dahilinde AI Asistan özellikleri kapalıdır. AI asistan özelliklerinin açılması için paketinizi Abonelik sayfasından <strong>UppyPro AI</strong> ya da özel otomasyonlar için <strong>UppyPro Kurumsal</strong> paketlerinden birine yükseltmeniz gerekmektedir.</p>
                        <p className="mt-2">Kurumsal Paket&apos;e geçiş için <a href="mailto:info@upgunai.com" className="font-semibold underline">info@upgunai.com</a> adresine e-posta göndererek veya destek sayfasından talep oluşturarak UPGUN AI ekibi ile iletişime geçebilirsiniz.</p>
                    </div>
                )}

                <div className={!isAiAllowed ? "opacity-50 pointer-events-none select-none grayscale" : ""}>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Sistem Mesajı & Firma Bilgi Tabanı</Label>
                                    <p className="text-xs text-slate-500">
                                        Buraya firmanızın hizmetleri, çalışma saatleri, fiyat politikası ve asistanın müşterilere nasıl davranması gerektiği hakkında detaylı bilgi giriniz.
                                        Bu bilgi asistanın &quot;beyni&quot; olarak kullanılacaktır.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    onClick={() => setShowWizard(true)}
                                    className="shrink-0 ml-4 bg-blue-900 hover:bg-blue-950 text-orange-400 animate-shimmer"
                                >
                                    <Wand2 className="w-4 h-4 mr-2" />
                                    Sihirbaz ile Oluştur
                                </Button>
                            </div>
                            <Textarea
                                ref={textareaRef}
                                name="systemMessage"
                                className="min-h-[300px]"
                                placeholder="Örneğin: Biz X firmasıyız. Şu hizmetleri veririz... Müşteriye her zaman kibar davran..."
                                defaultValue={settings?.system_message || ""}
                                disabled={!isAiAllowed}
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                        <Button type="submit" disabled={loading || !isAiAllowed} className="bg-orange-600 hover:bg-orange-700 text-white">
                            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            {loading ? "Kaydediliyor..." : "Ayarları Kaydet"}
                        </Button>
                    </div>
                </div>
            </div>
        </form>

        {/* System Message Wizard Modal */}
        {showWizard && (
            <SystemMessageWizard
                onComplete={handleWizardComplete}
                onClose={() => setShowWizard(false)}
            />
        )}
        </>
    );
}
