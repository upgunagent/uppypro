"use client";

import { useEffect, useRef } from "react";

/**
 * Mobil Safari/Chrome'da arka plana atılan sekmeler JavaScript bağlamını
 * kaybedebiliyor. Bu bileşen, sayfa tekrar görünür olduğunda (visibilitychange)
 * bağlantıyı kontrol eder ve gerekirse otomatik olarak sayfayı yeniler.
 *
 * Ayrıca "freeze" / "resume" event'lerini de dinler (Page Lifecycle API).
 */
export function AppRecovery() {
    const lastHiddenAt = useRef<number | null>(null);

    useEffect(() => {
        // 1. Visibility Change — sekme arka plandan geri geldi
        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden") {
                lastHiddenAt.current = Date.now();
            }

            if (document.visibilityState === "visible" && lastHiddenAt.current) {
                const hiddenDuration = Date.now() - lastHiddenAt.current;
                lastHiddenAt.current = null;

                // 30 saniyeden uzun süre arka planda kaldıysa kontrol et
                if (hiddenDuration > 30_000) {
                    checkAndRecover();
                }
            }
        };

        // 2. Page Lifecycle API — "freeze" sonrası "resume"
        const handleResume = () => {
            checkAndRecover();
        };

        // 3. Online/Offline — bağlantı geri geldiğinde
        const handleOnline = () => {
            checkAndRecover();
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        document.addEventListener("resume", handleResume);
        window.addEventListener("online", handleOnline);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            document.removeEventListener("resume", handleResume);
            window.removeEventListener("online", handleOnline);
        };
    }, []);

    return null;
}

/**
 * Basit bir health check yaparak bağlantının hâlâ aktif olup olmadığını kontrol eder.
 * Sunucuya küçük bir fetch atar; başarısız olursa veya JS context bozuksa
 * sayfayı yeniler.
 */
async function checkAndRecover() {
    try {
        // Basit bir endpoint'e ping at (Next.js her zaman root'a 200 döner)
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const res = await fetch("/api/health", {
            method: "HEAD",
            cache: "no-store",
            signal: controller.signal,
        }).catch(() => null);

        clearTimeout(timeout);

        // Eğer fetch tamamen başarısız olduysa veya 500+ hata gelirse yenile
        if (!res || !res.ok) {
            console.warn("[AppRecovery] Health check failed, reloading...");
            window.location.reload();
        }
    } catch {
        // JS context bozuksa buraya düşer
        console.warn("[AppRecovery] Recovery check crashed, reloading...");
        window.location.reload();
    }
}
