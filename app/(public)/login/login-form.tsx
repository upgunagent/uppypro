"use client";

import { useActionState } from "react";
import { signInAction } from "@/app/actions/login";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Turnstile } from "@marsidev/react-turnstile";
import { useState, useEffect } from "react";

const initialState = {
    error: "",
};

export function LoginForm() {
    const searchParams = useSearchParams();
    const urlMessage = searchParams.get("message");
    const [state, formAction, isPending] = useActionState(signInAction, initialState);

    // Güvenlik: Başarısız giriş denemesini zorla tetiklemek için ek bir state
    const [submitCount, setSubmitCount] = useState(0);
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [turnstileToken, setTurnstileToken] = useState("");
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Form her hata döndürdüğünde veya submit tetiklendiğinde kontrol et
    useEffect(() => {
        if (state?.error && !isPending) {
            setFailedAttempts(prev => prev + 1);
            setTurnstileToken("");
            console.log("Failed attempt detected. Total:", failedAttempts + 1);
        }
    }, [state?.error, submitCount]);

    const handleAction = (formData: FormData) => {
        setSubmitCount(prev => prev + 1);
        formAction(formData);
    };

    const showTurnstile = failedAttempts >= 2;
    // Eğer Turnstile ekrandaysa ancak henüz token alınmamışsa formu göndermeyi engelle
    const isReadyToSubmit = !showTurnstile || turnstileToken !== "";

    return (
        <form className="space-y-5" action={handleAction}>
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="email">
                    E-posta Adresi
                </label>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="isim@sirketiniz.com"
                    required
                    className="h-12 bg-white border-slate-200 focus:border-orange-500 transition-all text-base"
                />
            </div>
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700" htmlFor="password">
                        Şifre
                    </label>
                    <Link
                        href="/forgot-password"
                        className="text-sm font-medium text-orange-600 hover:text-orange-700"
                    >
                        Şifremi unuttum
                    </Link>
                </div>
                <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    className="h-12 bg-white border-slate-200 focus:border-orange-500 transition-all text-base"
                />
            </div>

            {(state?.error || urlMessage) && (
                <div className="p-4 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    {state?.error || urlMessage}
                </div>
            )}

            {isMounted && showTurnstile && (
                <div className="flex justify-center w-full py-2">
                    <Turnstile
                        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
                        onSuccess={(token) => setTurnstileToken(token)}
                        onError={() => setTurnstileToken("")}
                        onExpire={() => setTurnstileToken("")}
                    />
                    {/* Token'ı form datası olarak arka uca göndermek için gizli input */}
                    <input type="hidden" name="cf-turnstile-response" value={turnstileToken} />
                </div>
            )}

            <Button disabled={isPending || !isReadyToSubmit} type="submit" className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white font-medium text-base shadow-lg shadow-orange-500/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed">
                {isPending ? "Giriş Yapılıyor..." : "Giriş Yap"}
            </Button>
        </form>
    );
}
