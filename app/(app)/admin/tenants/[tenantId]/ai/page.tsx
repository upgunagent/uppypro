import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import { AiSettingsForm } from "@/components/admin/ai-settings-form";

export const dynamic = "force-dynamic";

export default async function AiSettingsPage({ params: paramsPromise }: { params: Promise<{ tenantId: string }> }) {
    const params = await paramsPromise;
    const { tenantId } = params;

    let settings;
    let tenantName = "Bilinmeyen";
    let errorMsg = null;

    try {
        const supabase = createAdminClient();

        const [settingsRes, tenantRes] = await Promise.all([
            supabase.from("agent_settings").select("*").eq("tenant_id", tenantId).maybeSingle(),
            supabase.from("tenants").select("name").eq("id", tenantId).maybeSingle()
        ]);

        if (settingsRes.error) throw settingsRes.error;
        if (tenantRes.error) throw tenantRes.error;

        settings = settingsRes.data;
        tenantName = tenantRes.data?.name || "Bilinmeyen İşletme";

    } catch (e: any) {
        console.error("Page Load Error:", e);
        errorMsg = e.message;
    }

    if (errorMsg) {
        return (
            <div className="p-8 text-red-500">
                <h1 className="text-xl font-bold">Hata Oluştu</h1>
                <p>Veriler yüklenirken bir sorun çıktı: {errorMsg}</p>
                <Link href="/admin/tenants" className="underline mt-4 block">Geri Dön</Link>
            </div>
        );
    }

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

            <AiSettingsForm tenantId={tenantId} initialSettings={settings} />
        </div>
    );
}
