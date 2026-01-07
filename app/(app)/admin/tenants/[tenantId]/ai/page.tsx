import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AiSettingsPage({ params: paramsPromise }: { params: Promise<{ tenantId: string }> }) {
    // 1. Safe Param Handling
    const params = await paramsPromise;
    const { tenantId } = params;

    let debugStatus = "Başlangıç";
    let errorMsg = null;

    try {
        debugStatus = "Admin Client Oluşturuluyor...";
        const supabase = createAdminClient();
        debugStatus = "Admin Client Başarılı! Veri Çekiliyor...";

        const { data, error } = await supabase.from('tenants').select('name').eq('id', tenantId).maybeSingle();

        if (error) throw error;
        debugStatus = `Veri Çekildi: ${data?.name || 'Bulunamadı'}`;

    } catch (e: any) {
        debugStatus = "HATA OLUŞTU";
        errorMsg = e.message || JSON.stringify(e);
    }

    return (
        <div className="p-8">
            <Link href="/admin/tenants" className="flex items-center text-gray-400 mb-4">
                <ArrowLeft className="mr-2" /> Geri Dön
            </Link>
            <h1 className="text-2xl font-bold mb-4">Debug Modu v3 (Admin Client)</h1>
            <p>Tenant ID: {tenantId}</p>

            <div className={`mt-4 p-4 rounded border ${errorMsg ? 'border-red-500 bg-red-900/20 text-red-500' : 'border-green-500 bg-green-900/20 text-green-500'}`}>
                <p className="font-bold">Durum: {debugStatus}</p>
                {errorMsg && <p className="mt-2 text-sm">{errorMsg}</p>}
            </div>

            <div className="mt-4 text-xs text-gray-500">
                <p>SUPABASE_URL Var mı: {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'EVET' : 'HAYIR'}</p>
                <p>SERVICE_KEY Var mı: {process.env.SUPABASE_SERVICE_ROLE_KEY ? 'EVET' : 'HAYIR'}</p>
            </div>
        </div>
    );
}
