"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { updateTenantAiSettings } from "../../actions";
import { Bot, Save, Loader2, Cpu, Webhook } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";

const AI_MODELS = [
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Hızlı & Ucuz)" },
    { value: "gemini-2.5-pro-preview-05-06", label: "Gemini 2.5 Pro (Güçlü)" },
    { value: "gemini-3-flash-preview", label: "Gemini 3 Flash (Yeni)" },
    { value: "gemini-3-pro-preview", label: "Gemini 3 Pro (Yeni & Güçlü)" },
];

export function AdminAiSettingsForm({ settings, tenantId }: { settings: any, tenantId: string }) {
    const [loading, setLoading] = useState(false);
    const [enabled, setEnabled] = useState(settings?.ai_operational_enabled || false);
    const [aiMode, setAiMode] = useState(settings?.ai_mode || 'disabled');
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
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tenant ID:</span>
                            <code
                                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-mono cursor-pointer transition-colors active:scale-95"
                                title="Kopyalamak için tıklayın"
                                onClick={() => {
                                    navigator.clipboard.writeText(tenantId);
                                    toast({
                                        title: "Kopyalandı",
                                        description: "Tenant ID panoya kopyalandı.",
                                    });
                                }}
                            >
                                {tenantId}
                            </code>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Label htmlFor="ai-mode-toggle" className="text-slate-700 min-w-[3rem] text-right">
                            {enabled ? "Aktif" : "Kapalı"}
                        </Label>
                        <Switch
                            id="ai-mode-toggle"
                            name="ai_operational_enabled"
                            checked={enabled}
                            onCheckedChange={setEnabled}
                            disabled={aiMode === 'disabled'}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    {/* AI Mode Selection */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-blue-500" /> AI Modu
                        </Label>
                        <select
                            name="ai_mode"
                            value={aiMode}
                            onChange={(e) => setAiMode(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
                            disabled={loading}
                        >
                            <option value="disabled">❌ Kapalı</option>
                            <option value="built_in">🤖 Built-in (Gemini API)</option>
                            <option value="webhook">🔗 Webhook (n8n)</option>
                        </select>
                        <p className="text-xs text-slate-500">
                            {aiMode === 'built_in' && "Gemini API ile doğrudan sunucu üzerinde çalışır. n8n gerekmez."}
                            {aiMode === 'webhook' && "Mesajlar n8n webhook'una iletilir. Mevcut yapı."}
                            {aiMode === 'disabled' && "AI asistan kapalı. Mesajlar sadece panele düşer."}
                        </p>
                    </div>

                    {/* AI Model (only for built_in) */}
                    {aiMode === 'built_in' && (
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Bot className="w-4 h-4 text-purple-500" /> AI Modeli
                            </Label>
                            <select
                                name="ai_model"
                                defaultValue={settings?.ai_model || 'gemini-2.5-flash'}
                                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
                                disabled={loading}
                            >
                                {AI_MODELS.map(m => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-500">Flash modelleri hızlı ve ucuz, Pro modelleri daha güçlü.</p>
                        </div>
                    )}

                    {/* System Message */}
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

                    {/* Webhook URL (only for webhook mode) */}
                    {aiMode === 'webhook' && (
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Webhook className="w-4 h-4 text-orange-500" /> n8n Webhook URL
                            </Label>
                            <p className="text-xs text-slate-500">
                                AI asistanın tetikleyeceği n8n iş akışı adresi.
                            </p>
                            <input
                                name="n8n_webhook_url"
                                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="https://primary.uppypro.com/webhook/..."
                                defaultValue={settings?.n8n_webhook_url || ""}
                            />
                        </div>
                    )}
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
