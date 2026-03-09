"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // Assuming Textarea component exists, if not I will use just 'textarea' with classes
import { Switch } from "@/components/ui/switch";
import { updateAiSettings } from "./actions";
import { Bot, Save, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useState, useRef } from "react";

import { getPackageName } from "@/lib/subscription-utils";

export function AiSettingsForm({ settings, subscription }: { settings: any, subscription: any }) {
    const formRef = useRef<HTMLFormElement>(null);
    const [loading, setLoading] = useState(false);
    const [isAiEnabled, setIsAiEnabled] = useState(settings?.ai_operational_enabled || false);
    const { toast } = useToast();

    const packageName = getPackageName(subscription);

    const isAiAllowed = packageName !== 'UppyPro Inbox';

    async function handleSubmit(formData: FormData) {
        if (!isAiAllowed) return;

        setLoading(true);
        try {
            // value is injected via hidden input instead of relying on stale state
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

    return (
        <form ref={formRef} action={handleSubmit} className="space-y-6">
            <input type="hidden" name="aiOperationalEnabled" value={isAiEnabled ? "true" : "false"} />
            <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-50 rounded-lg">
                        <Bot className="text-purple-600 w-5 h-5" />
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
                                <div className="flex items-center gap-2" title={!settings?.n8n_webhook_url ? "Sistem kurulumu henüz tamamlanmadı. Lütfen bekleyin veya destekle iletişime geçin." : "AI Asistanı Aç/Kapat"}>
                                    <Switch
                                        checked={isAiEnabled}
                                        onCheckedChange={(val) => {
                                            setIsAiEnabled(val);
                                            setTimeout(() => {
                                                formRef.current?.requestSubmit();
                                            }, 50);
                                        }}
                                        disabled={!settings?.n8n_webhook_url || loading}
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

                {!settings?.n8n_webhook_url && isAiAllowed && (
                    <div className="bg-amber-50 text-amber-800 p-4 rounded-lg text-sm mb-4 border border-amber-200">
                        <strong>AI Kurulum Bekleniyor:</strong> Sistem mesajınızı kaydedebilirsiniz ancak UppyPro ekibinin arka planda asistan yapılandırmanızı tamamlaması gerekmektedir. İşlem sonrası asistanınızı aktif edebilirsiniz.
                    </div>
                )}

                {!isAiAllowed && (
                    <div className="bg-orange-50 text-orange-800 p-4 rounded-lg text-sm mb-4 border border-orange-200">
                        <strong>Bu özellik paketinizde bulunmamaktadır.</strong>
                        <br />
                        AI Asistanı kullanmak için lütfen paketinizi yükseltin.
                    </div>
                )}

                <div className={!isAiAllowed ? "opacity-50 pointer-events-none select-none grayscale" : ""}>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Sistem Mesajı & Firma Bilgi Tabanı</Label>
                            <p className="text-xs text-slate-500">
                                Buraya firmanızın hizmetleri, çalışma saatleri, fiyat politikası ve asistanın müşterilere nasıl davranması gerektiği hakkında detaylı bilgi giriniz.
                                Bu bilgi asistanın "beyni" olarak kullanılacaktır.
                            </p>
                            <Textarea
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
    );
}
