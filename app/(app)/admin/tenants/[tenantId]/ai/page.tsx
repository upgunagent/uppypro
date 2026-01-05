import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";
import { updateAiSettings } from "@/app/actions/admin";
import { Check, Info } from "lucide-react";

export default async function AiSettingsPage({ params }: { params: { tenantId: string } }) {
    const supabase = await createClient();
    const { data: settings } = await supabase
        .from("agent_settings")
        .select("*")
        .eq("tenant_id", params.tenantId)
        .single();

    const updateAction = updateAiSettings.bind(null, params.tenantId);

    return (
        <div className="max-w-2xl space-y-8">
            <div>
                <h1 className="text-3xl font-bold">AI Ayarları</h1>
                <p className="text-gray-400">Bu işletme için n8n workflow ve AI durumunu yönetin.</p>
            </div>

            <div className="p-6 border border-primary/20 bg-primary/5 rounded-xl">
                <div className="flex items-start gap-4">
                    <Info className="text-primary mt-1" />
                    <div className="text-sm text-gray-300">
                        Bu ayarlar sadece Ajans Yöneticisi tarafından değiştirilebilir. <br />
                        Müşteri "AI operational" açık olsa bile konuşmayı manuel moda alabilir.
                    </div>
                </div>
            </div>

            <form action={updateAction} className="space-y-6 glass p-8 rounded-xl border border-white/10">
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
                        defaultChecked={settings?.ai_operational_enabled}
                    />
                </div>

                <div className="space-y-2">
                    <label className="font-medium">n8n Webhook URL</label>
                    <Input
                        name="n8n_webhook_url"
                        placeholder="https://your-n8n-instance.com/webhook/..."
                        defaultValue={settings?.n8n_webhook_url || ""}
                    />
                    <p className="text-xs text-gray-500">Müşteriye özel oluşturulan n8n workflow webhook adresi.</p>
                </div>

                <div className="pt-4 border-t border-white/10">
                    <Button type="submit">Ayarları Kaydet</Button>
                </div>
            </form>
        </div>
    );
}
