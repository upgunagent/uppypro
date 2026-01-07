"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateAiSettings } from "@/app/actions/admin";

interface AiSettingsFormProps {
    tenantId: string;
    initialSettings: {
        n8n_webhook_url?: string;
        ai_operational_enabled?: boolean;
    } | null;
}

export function AiSettingsForm({ tenantId, initialSettings }: AiSettingsFormProps) {
    const [isPending, startTransition] = useTransition();
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    async function handleSubmit(formData: FormData) {
        setMessage(null);
        startTransition(async () => {
            try {
                await updateAiSettings(tenantId, formData);
                setMessage({ type: 'success', text: 'Ayarlar başarıyla kaydedildi! 🎉' });

                // Clear success message after 3 seconds
                setTimeout(() => setMessage(null), 3000);
            } catch (e: any) {
                console.error(e);
                setMessage({ type: 'error', text: 'Hata: ' + e.message });
            }
        });
    }

    return (
        <form action={handleSubmit} className="space-y-6 glass p-8 rounded-xl border border-white/10">
            <div className="flex items-center justify-between p-4 border border-white/10 rounded-lg bg-white/5">
                <label htmlFor="ai_operational_enabled" className="font-medium cursor-pointer select-none">
                    AI Aktif (Operational)
                    <div className="text-xs text-gray-400 font-normal">
                        Açık olduğunda gelen mesajlar n8n webhook'una iletilecektir.
                    </div>
                </label>
                <input
                    type="checkbox"
                    name="ai_operational_enabled"
                    id="ai_operational_enabled"
                    className="h-5 w-5 accent-primary"
                    defaultChecked={initialSettings?.ai_operational_enabled}
                />
            </div>

            <div className="space-y-2">
                <label className="font-medium">n8n Webhook URL</label>
                <Input
                    name="n8n_webhook_url"
                    placeholder="https://your-n8n-instance.com/webhook/..."
                    defaultValue={initialSettings?.n8n_webhook_url || ""}
                    disabled={isPending}
                />
                <p className="text-xs text-gray-500">Müşteriye özel oluşturulan n8n workflow webhook adresi.</p>
            </div>

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
