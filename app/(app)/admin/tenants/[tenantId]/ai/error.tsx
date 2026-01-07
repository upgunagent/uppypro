"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("AI Settings Page Error:", error);
    }, [error]);

    return (
        <div className="flex h-full flex-col items-center justify-center space-y-4 text-center p-8">
            <h2 className="text-2xl font-bold text-red-500">Bir Hata Oluştu!</h2>
            <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/20 max-w-lg text-left overflow-auto">
                <p className="font-mono text-sm break-all">{error.message}</p>
                {error.digest && (
                    <p className="text-xs text-gray-400 mt-2">Digest: {error.digest}</p>
                )}
            </div>
            <p className="text-gray-400 max-w-md">
                Muhtemel Sebep: "SUPABASE_SERVICE_ROLE_KEY" Vercel ortam değişkenlerinde eksik olabilir veya veritabanı bağlantısı kurulamadı.
            </p>
            <div className="flex gap-4">
                <Button onClick={() => reset()} variant="secondary">
                    Tekrar Dene
                </Button>
                <Button onClick={() => window.location.href = "/admin/tenants"} variant="outline">
                    Geri Dön
                </Button>
            </div>
        </div>
    );
}
