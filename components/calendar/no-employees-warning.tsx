"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Users, ArrowRight, X } from "lucide-react";

export function NoEmployeesWarning() {
    const [dismissed, setDismissed] = useState(false);
    const router = useRouter();

    if (dismissed) return null;

    return (
        <div className="mb-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-orange-900 mb-1">
                        Kayıt Bulunamadı
                    </h3>
                    <p className="text-sm text-orange-700 leading-relaxed">
                        Takvimi kullanabilmek için işletmenize en az bir personel veya hizmet kaynağı (örn: Oda, Tekne) eklemeniz gerekmektedir. 
                        Eklemek için <strong>Ayarlar → Takvim & Kaynak</strong> sayfasına gidin.
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                        <button
                            onClick={() => router.push("/panel/settings?tab=employees")}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
                        >
                            <Users className="w-4 h-4" />
                            Ayarlara Git
                            <ArrowRight className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setDismissed(true)}
                            className="text-sm text-orange-600 hover:text-orange-800 font-medium transition-colors"
                        >
                            Daha sonra
                        </button>
                    </div>
                </div>
                <button
                    onClick={() => setDismissed(true)}
                    className="flex-shrink-0 p-1 rounded-md text-orange-400 hover:text-orange-600 hover:bg-orange-100 transition-colors"
                    aria-label="Kapat"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
