import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AiSettingsPage({ params: paramsPromise }: { params: Promise<{ tenantId: string }> }) {
    // 1. Safe Param Handling
    const params = await paramsPromise;
    const { tenantId } = params;

    return (
        <div className="p-8">
            <Link href="/admin/tenants" className="flex items-center text-gray-400 mb-4">
                <ArrowLeft className="mr-2" /> Geri Dön
            </Link>
            <h1 className="text-2xl font-bold mb-4">Debug Modu v2</h1>
            <p>Tenant ID: {tenantId}</p>
            <p className="mt-4 text-green-500">Sayfa render edildi. Next.js routing çalışıyor.</p>
        </div>
    );
}
