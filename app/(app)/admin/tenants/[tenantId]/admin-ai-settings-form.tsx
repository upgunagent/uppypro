"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { updateTenantAiSettings } from "../../actions";
import { Bot, Save, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";

export function AdminAiSettingsForm({ settings, tenantId }: { settings: any, tenantId: string }) {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        try {
            const result = await updateTenantAiSettings(formData);
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
            <input type="hidden" name="tenantId" value={tenantId} />
            <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-50 rounded-lg">
                        <Bot className="text-purple-600 w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-lg text-slate-900">AI Asistan Ayarları (Admin)</h3>
                        <p className="text-sm text-slate-500">İşletme için AI asistan davranışlarını yapılandırın.</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Label htmlFor="ai-mode" className="text-slate-700">Aktif</Label>
                        <Switch id="ai-mode" name="aiEnabled" defaultChecked={settings?.ai_operational_enabled} />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Sistem Mesajı & Firma Bilgi Tabanı</Label>
                        <p className="text-xs text-slate-500">
                            Bu alan işletmenin asistanı için yapılandırılmış sistem mesajını içerir.
                        </p>
                        <Textarea
                            name="systemMessage"
                            className="min-h-[300px]"
                            placeholder="Sistem mesajı..."
                            defaultValue={settings?.system_message || ""}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>n8n Webhook URL</Label>
                        <p className="text-xs text-slate-500">
                            AI asistanın tetikleyeceği n8n iş akışı adresi.
                        </p>
                        <div className="flex items-center gap-2">
                            <input
                                name="n8nWebhookUrl"
                                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="https://primary.uppypro.com/webhook/..."
                                defaultValue={settings?.n8n_webhook_url || ""}
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <Button type="submit" disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        {loading ? "Kaydediliyor..." : "Ayarları Kaydet"}
                    </Button>
                </div>
            </div>
        </form>
    );
}
