import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateAiSettings } from "@/app/actions/admin";
import Link from "next/link";
import { ArrowLeft, Check, Info } from "lucide-react";

export default async function AiSettingsPage({ params: paramsPromise }: { params: Promise<{ tenantId: string }> }) {
    // Await params for Next.js 15+
    const params = await paramsPromise;
    const { tenantId } = params;

    // Use Admin Client to bypass RLS (since Agency Admin might not be a direct member of this tenant)
    const supabase = createAdminClient();

    // Check Env Var Explicitly
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("Kritik: SUPABASE_SERVICE_ROLE_KEY bulunamadı! Lütfen Vercel ayarlarını kontrol edin.");
    }

    // Fetch Settings and Tenant Info in parallel
    const [settingsRes, tenantRes] = await Promise.all([
        supabase.from("agent_settings").select("*").eq("tenant_id", tenantId).maybeSingle(),
        supabase.from("tenants").select("name").eq("id", tenantId).single()
    ]);

    if (settingsRes.error) throw new Error("Ayar verisi çekilemedi: " + settingsRes.error.message);

    const settings = settingsRes.data;
    const tenantName = tenantRes.data?.name || "Bilinmeyen İşletme";

    const updateAction = updateAiSettings.bind(null, tenantId);

    return (
        <div className="max-w-2xl space-y-8 p-8">
            <Link
                href="/admin/tenants"
                className="flex items-center text-gray-400 hover:text-white transition-colors mb-4 group"
            >
                <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                İşletmelere Dön
            </Link>

            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    AI Ayarları
                    <span className="text-gray-500 font-normal text-2xl">({tenantName})</span>
                </h1>
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
