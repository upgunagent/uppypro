"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // Assuming Textarea component exists, if not I will use just 'textarea' with classes
import { Switch } from "@/components/ui/switch";
import { updateAiSettings } from "./actions";
import { Bot, Save, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";

import { getPackageName } from "@/lib/subscription-utils";

export function AiSettingsForm({ settings, subscription }: { settings: any, subscription: any }) {
    const [loading, setLoading] = useState(false);
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

    return (
        <form action={handleSubmit} className="space-y-6">
            <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-50 rounded-lg">
                        <Bot className="text-purple-600 w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-lg text-slate-900">AI Asistan Ayarları</h3>
                        <p className="text-sm text-slate-500">Asistanınızın davranışlarını ve firma bilgilerinizi yapılandırın.</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        {isAiAllowed ? (
                            settings?.ai_operational_enabled ? (
                                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200">
                                    Aktif
                                </span>
                            ) : (
                                <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-bold border border-slate-200">
                                    Pasif
                                </span>
                            )
                        ) : (
                            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold border border-red-200">
                                Kapalı
                            </span>
                        )}
                    </div>
                </div>

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
                        <Button type="submit" disabled={loading || !isAiAllowed}>
                            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            {loading ? "Kaydediliyor..." : "Ayarları Kaydet"}
                        </Button>
                    </div>
                </div>
            </div>
        </form>
    );
}
