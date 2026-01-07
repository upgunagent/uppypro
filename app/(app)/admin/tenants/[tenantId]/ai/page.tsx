import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AiSettingsPage({ params: paramsPromise }: { params: Promise<{ tenantId: string }> }) {
    const params = await paramsPromise;
    const { tenantId } = params;

    let debugStatus = "Başlangıç";
    let settingsData = null;
    let errorMsg = null;

    try {
        debugStatus = "Admin Client Init...";
        const supabase = createAdminClient();

        debugStatus = "Fetching agent_settings...";
        const { data, error } = await supabase
            .from("agent_settings")
            .select("*")
            .eq("tenant_id", tenantId)
            .maybeSingle();

        if (error) throw error;

        settingsData = data;
        debugStatus = "Veri Çekme Başarılı";

    } catch (e: any) {
        debugStatus = "HATA OLUŞTU";
        errorMsg = e.message || JSON.stringify(e);
    }

    return (
        <div className="p-8 space-y-4">
            <Link href="/admin/tenants" className="flex items-center text-gray-400 mb-4">
                <ArrowLeft className="mr-2" /> Geri Dön
            </Link>
            <h1 className="text-xl font-bold">Debug Modu v5 (Agent Settings)</h1>

            <div className={`p-4 border rounded ${errorMsg ? 'border-red-500 bg-red-900/20' : 'border-green-500 bg-green-900/20'}`}>
                <p><strong>Durum:</strong> {debugStatus}</p>
                {errorMsg && <p className="text-red-400 mt-2">{errorMsg}</p>}
            </div>

            <div className="bg-gray-900 p-4 rounded text-xs font-mono overflow-auto border border-gray-700">
                <h3 className="text-gray-400 mb-2">Çekilen Veri (agent_settings):</h3>
                <pre>{JSON.stringify(settingsData, null, 2)}</pre>
            </div>
        </div>
    );
}
