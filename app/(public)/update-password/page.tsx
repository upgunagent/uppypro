"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, Lock } from "lucide-react";

export default function UpdatePasswordPage() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [verifyingSession, setVerifyingSession] = useState(true);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        let mounted = true;

        const verifySession = async () => {
            try {
                // First check if we already have a session
                const { data: { session } } = await supabase.auth.getSession();

                if (mounted && session) {
                    setVerifyingSession(false);
                    return;
                }

                // If no session, wait for onAuthStateChange
                const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                    // console.log("Auth Event:", event);
                    if (mounted) {
                        if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY' || (session && event === 'INITIAL_SESSION')) {
                            setVerifyingSession(false);
                        } else if (event === 'SIGNED_OUT') {
                            // User signed out, keep verifying or show error?
                            // usually stays in verifying until redirect
                        }
                    }
                });

                // Safety timeout: If after 10 seconds we still don't have a session, show error
                setTimeout(() => {
                    if (mounted) {
                        // Check one last time
                        supabase.auth.getSession().then(({ data }) => {
                            if (!data.session) {
                                setError("Bağlantı geçersiz veya süresi dolmuş. Lütfen tekrar giriş yapmayı deneyin.");
                                setVerifyingSession(false);
                            }
                        });
                    }
                }, 10000);

                return () => subscription.unsubscribe();
            } catch (err) {
                if (mounted) {
                    setError("Oturum kontrolü sırasında hata oluştu.");
                    setVerifyingSession(false);
                }
            }
        };

        verifySession();

        return () => { mounted = false; };
    }, [supabase.auth]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError("Şifreler eşleşmiyor");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Double check session before update
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setError("Oturum süresi dolmuş veya geçersiz link. Lütfen linke tekrar tıklayın.");
                setLoading(false);
                return;
            }

            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) {
                setError(error.message);
            } else {
                setSuccess(true);
                setTimeout(() => {
                    router.push("/panel/inbox");
                }, 3000);
            }
        } catch (err) {
            setError("Bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    if (verifyingSession) {
        return (
            <div className="flex min-h-screen w-full items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500">Oturum doğrulanıyor...</p>
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
                                <h1 className="text-2xl font-bold text-slate-900">Yeni Şifre Belirle</h1>
                                <p className="text-slate-500">
                                    Lütfen hesabınız için yeni bir güvenli şifre girin.
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
                                    {loading ? "Güncelleniyor..." : "Şifreyi Güncelle"}
                                </Button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 size={32} />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 mb-2">Şifre Güncellendi!</h2>
                            <p className="text-slate-500 mb-8">
                                Hesabınızın şifresi başarıyla değiştirildi. Panele yönlendiriliyorsunuz...
                            </p>
                            <Button disabled className="w-full h-11 opacity-50">
                                Yönlendiriliyor...
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
