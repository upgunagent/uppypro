"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { repairTenantAction } from "@/app/actions/repair";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function RepairTenantButton() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleRepair = async () => {
        setLoading(true);
        try {
            const res = await repairTenantAction();
            if (res.success) {
                router.refresh(); // Force refresh to pick up new tenant
            } else {
                alert("Hata: " + res.error);
            }
        } catch (e) {
            console.error(e);
            alert("Bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-8 bg-red-500/10 border border-red-500/20 rounded-xl space-y-4">
            <h3 className="text-xl font-bold text-white">İşletme Hesabı Bulunamadı</h3>
            <p className="text-gray-400 text-center max-w-md">
                Hesabınız oluşturulmuş ancak bir işletme ile ilişkilendirilmemiş.
                Aşağıdaki butona tıklayarak otomatik olarak düzeltebilirsiniz.
            </p>
            <Button
                onClick={handleRepair}
                disabled={loading}
                className="bg-primary hover:bg-primary/90 text-white font-bold"
            >
                {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                İşletme Hesabını Oluştur ve Onar
            </Button>
        </div>
    );
}
