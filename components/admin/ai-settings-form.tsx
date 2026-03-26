"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateTenantAiSettings } from "@/app/(app)/admin/actions";
import { Bot, Webhook, Power, Cpu } from "lucide-react";

interface AiSettingsFormProps {
    tenantId: string;
    initialSettings: {
        n8n_webhook_url?: string;
        ai_operational_enabled?: boolean;
        ai_mode?: string;
        ai_model?: string;
        system_message?: string;
    } | null;
}

const AI_MODELS = [
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Hızlı & Ucuz)" },
    { value: "gemini-2.5-pro-preview-05-06", label: "Gemini 2.5 Pro (Güçlü)" },
    { value: "gemini-3-flash-preview", label: "Gemini 3 Flash (Yeni)" },
    { value: "gemini-3-pro-preview", label: "Gemini 3 Pro (Yeni & Güçlü)" },
];

export function AiSettingsForm({ tenantId, initialSettings }: AiSettingsFormProps) {
    const [isPending, startTransition] = useTransition();
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [aiMode, setAiMode] = useState(initialSettings?.ai_mode || 'disabled');

    async function handleSubmit(formData: FormData) {
        setMessage(null);
        formData.append("tenantId", tenantId);
        startTransition(async () => {
            try {
                const result = await updateTenantAiSettings(formData);
                if (result?.error) {
                    setMessage({ type: 'error', text: result.error });
                } else {
                    setMessage({ type: 'success', text: 'Ayarlar başarıyla kaydedildi! 🎉' });
                    setTimeout(() => setMessage(null), 3000);
                }
            } catch (e: any) {
                console.error(e);
                setMessage({ type: 'error', text: 'Hata: ' + e.message });
            }
        });
    }

    return (
        <form action={handleSubmit} className="space-y-6 glass p-8 rounded-xl border border-white/10">
            {/* AI Mode Selection */}
            <div className="space-y-2">
                <label className="font-medium flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-primary" /> AI Modu
                </label>
                <select
                    name="ai_mode"
                    value={aiMode}
                    onChange={(e) => setAiMode(e.target.value)}
                    className="w-full p-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    disabled={isPending}
                >
                    <option value="disabled">❌ Kapalı</option>
                    <option value="built_in">🤖 Built-in (Gemini API)</option>
                    <option value="webhook">🔗 Webhook (n8n)</option>
                </select>
                <p className="text-xs text-gray-500">
                    {aiMode === 'built_in' && "Gemini API ile doğrudan sunucu üzerinde çalışır. n8n gerekmez."}
                    {aiMode === 'webhook' && "Mesajlar n8n webhook'una iletilir. Mevcut yapı."}
                    {aiMode === 'disabled' && "AI asistan kapalı. Mesajlar sadece panele düşer."}
                </p>
            </div>

            {/* AI Operational Toggle */}
            <div className="flex items-center justify-between p-4 border border-white/10 rounded-lg bg-white/5">
                <label htmlFor="ai_operational_enabled" className="font-medium cursor-pointer select-none">
                    <div className="flex items-center gap-2">
                        <Power className="w-4 h-4 text-green-400" /> AI Aktif (Operational)
                    </div>
                    <div className="text-xs text-gray-400 font-normal">
                        Açık olduğunda gelen mesajlar AI tarafından işlenecektir.
                    </div>
                </label>
                <input
                    type="checkbox"
                    name="ai_operational_enabled"
                    id="ai_operational_enabled"
                    className="h-5 w-5 accent-primary"
                    defaultChecked={initialSettings?.ai_operational_enabled}
                    disabled={aiMode === 'disabled'}
                />
            </div>

            {/* AI Model (only for built_in) */}
            {aiMode === 'built_in' && (
                <div className="space-y-2">
                    <label className="font-medium flex items-center gap-2">
                        <Bot className="w-4 h-4 text-purple-400" /> AI Modeli
                    </label>
                    <select
                        name="ai_model"
                        defaultValue={initialSettings?.ai_model || 'gemini-2.5-flash'}
                        className="w-full p-2 bg-white/5 border border-white/10 rounded-lg text-white"
                        disabled={isPending}
                    >
                        {AI_MODELS.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500">Flash modelleri hızlı ve ucuz, Pro modelleri daha güçlü.</p>
                </div>
            )}

            {/* Webhook URL (only for webhook mode) */}
            {aiMode === 'webhook' && (
                <div className="space-y-2">
                    <label className="font-medium flex items-center gap-2">
                        <Webhook className="w-4 h-4 text-blue-400" /> n8n Webhook URL
                    </label>
                    <Input
                        name="n8n_webhook_url"
                        placeholder="https://your-n8n-instance.com/webhook/..."
                        defaultValue={initialSettings?.n8n_webhook_url || ""}
                        disabled={isPending}
                    />
                    <p className="text-xs text-gray-500">Müşteriye özel oluşturulan n8n workflow webhook adresi.</p>
                </div>
            )}

            {/* System Message (for both modes) */}
            {aiMode !== 'disabled' && (
                <div className="space-y-2">
                    <label className="font-medium">Sistem Mesajı & Firma Bilgi Tabanı</label>
                    <Textarea
                        name="systemMessage"
                        className="min-h-[250px] bg-white/5 border-white/10 text-white"
                        placeholder="Firmanın hizmetleri, çalışma saatleri, fiyat politikası..."
                        defaultValue={initialSettings?.system_message || ""}
                        disabled={isPending}
                    />
                    <p className="text-xs text-gray-500">Bu metin AI asistanın "beyni" olarak kullanılır.</p>
                </div>
            )}

            {message && (
                <div className={`p-4 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                    {message.text}
                </div>
            )}

            <div className="pt-4 border-t border-white/10">
                <Button type="submit" disabled={isPending}>
                    {isPending ? "Kaydediliyor..." : "Ayarları Kaydet"}
                </Button>
            </div>
        </form>
    );
}
