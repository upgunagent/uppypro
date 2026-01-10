"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { validateToken } from "@/app/actions/validate-token";
import { setUserPassword } from "@/app/actions/set-user-password";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, Lock, AlertCircle } from "lucide-react";

function SetPasswordContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token");

    const [validating, setValidating] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);
    const [email, setEmail] = useState("");
    const [error, setError] = useState<string | null>(null);

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!token) {
            setError("Geçersiz davet linki.");
            setValidating(false);
            return;
        }

        validateToken(token).then((result) => {
            if (result.valid) {
                setTokenValid(true);
                setEmail(result.email || "");
            } else {
                setError(result.error || "Token doğrulanamadı.");
            }
            setValidating(false);
        });
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError("Şifreler eşleşmiyor");
            return;
        }

        if (password.length < 6) {
            setError("Şifre en az 6 karakter olmalıdır");
            return;
        }

        setLoading(true);
        setError(null);

        const result = await setUserPassword(token!, password);

        if (result.success) {
            // Auto-login with new credentials
            const supabase = createClient();
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: result.email!,
                password: result.password!
            });

            if (signInError) {
                setError("Şifre kaydedildi ancak giriş yapılamadı. Lütfen giriş sayfasından tekrar deneyin.");
                setLoading(false);
                return;
            }

            setSuccess(true);
            setTimeout(() => {
                router.push("/panel/inbox");
            }, 2000);
        } else {
            setError(result.error || "Bir hata oluştu");
            setLoading(false);
        }
    };

    if (validating) {
        return (
            <div className="flex min-h-screen w-full items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500">Davet linki doğrulanıyor...</p>
                </div>
            </div>
        );
    }

    if (!tokenValid) {
        return (
            <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 p-4">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden text-center p-8">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Geçersiz Davet</h2>
                    <p className="text-slate-500 mb-8">{error}</p>
                    <Button onClick={() => router.push("/")} className="bg-orange-600 hover:bg-orange-700 w-full text-white">
                        Ana Sayfaya Dön
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                <div className="p-8">
                    {!success ? (
                        <>
                            <div className="space-y-2 mb-8 text-center">
                                <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Lock size={20} />
                                </div>
                                <h1 className="text-2xl font-bold text-slate-900">Şifre Belirle</h1>
                                <p className="text-slate-500">
                                    {email} için yeni bir güvenli şifre oluşturun.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700" htmlFor="password">
                                        Yeni Şifre
                                    </label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700" htmlFor="confirm">
                                        Şifre Tekrar
                                    </label>
                                    <Input
                                        id="confirm"
                                        type="password"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                    />
                                </div>

                                {error && (
                                    <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
                                        {error}
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-lg shadow-orange-500/20 transition-all"
                                    disabled={loading}
                                >
                                    {loading ? "Kaydediliyor..." : "Şifreyi Kaydet"}
                                </Button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 size={32} />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 mb-2">Başarılı!</h2>
                            <p className="text-slate-500 mb-8">
                                Şifreniz kaydedildi. Panelinize yönlendiriliyorsunuz...
                            </p>
                            <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function SetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen w-full items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500">Yükleniyor...</p>
                </div>
            </div>
        }>
            <SetPasswordContent />
        </Suspense>
    );
}
