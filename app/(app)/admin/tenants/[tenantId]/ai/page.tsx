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

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceKey || !url) {
        return (
            <div className="p-8 text-red-500 border border-red-500 rounded bg-red-50 font-mono">
                <h1 className="text-xl font-bold">Yapılandırma Hatası (v1.1)</h1>
                <p>Ortam değişkenleri eksik:</p>
                <ul className="list-disc ml-5 mt-2">
                    {!serviceKey && <li><code>SUPABASE_SERVICE_ROLE_KEY</code> yok</li>}
                    {!url && <li><code>NEXT_PUBLIC_SUPABASE_URL</code> yok</li>}
                </ul>
                <p className="mt-4 text-sm text-gray-700">Lütfen Vercel Ayarlarından bu değişkenleri kontrol edip <b>Redeploy</b> yapın.</p>
            </div>
        );
    }

    let settings;
    let tenantName = "Bilinmeyen İşletme";

    try {
        // Use Admin Client to bypass RLS
        const supabase = createAdminClient();

        // Fetch Settings and Tenant Info in parallel
        const [settingsRes, tenantRes] = await Promise.all([
            supabase.from("agent_settings").select("*").eq("tenant_id", tenantId).maybeSingle(),
            supabase.from("tenants").select("name").eq("id", tenantId).single()
        ]);

        if (settingsRes.error) {
            return <div className="p-8 text-red-500">Ayar verisi çekme hatası: {settingsRes.error.message} (Code: {settingsRes.error.code})</div>;
        }
        if (tenantRes.error) {
            return <div className="p-8 text-red-500">Tenant verisi çekme hatası: {tenantRes.error.message}</div>;
        }

        settings = settingsRes.data;
        tenantName = tenantRes.data?.name || "Bilinmeyen İşletme";

    } catch (e: any) {
        return (
            <div className="p-8 text-red-500">
                <h1 className="text-xl font-bold">Beklenmeyen Hata</h1>
                <p>{e.message}</p>
                <pre className="mt-4 p-2 bg-gray-900 text-white rounded text-xs overflow-auto">{JSON.stringify(e, null, 2)}</pre>
            </div>
        );
    }

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
