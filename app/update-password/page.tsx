"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

// Supabase client'ı component dışında stabilize et
const supabase = createClient();

export default function UpdatePasswordPage() {
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    const [sessionError, setSessionError] = useState("");
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        // URL hash'inden access_token ve refresh_token değerlerini çıkart
        // (Supabase recovery / magic link implicit flow)
        const hash = window.location.hash.substring(1); // '#' karakterini at
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken && refreshToken) {
            // Hash bulundu, oturumu manuel olarak aç
            supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
                .then(({ data, error }) => {
                    if (error) {
                        console.error("setSession error:", error);
                        setSessionError("Oturum açılamadı: " + error.message);
                    } else if (data.session) {
                        setSessionReady(true);
                        // Hash'i URL'den temizle (güvenlik)
                        window.history.replaceState(null, "", window.location.pathname);
                    }
                });
        } else {
            // Hash yoksa mevcut oturumu kontrol et (zaten giriş yapılmış olabilir)
            supabase.auth.getSession().then(({ data: { session } }) => {
                if (session) {
                    setSessionReady(true);
                } else {
                    setSessionError("Geçersiz veya süresi dolmuş link. Lütfen yeni bir davet isteyin.");
                }
            });
        }
    }, []);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password.length < 6) {
            toast({ variant: "destructive", title: "Hata", description: "Şifre en az 6 karakter olmalıdır." });
            return;
        }

        if (password !== confirm) {
            toast({ variant: "destructive", title: "Hata", description: "Şifreler uyuşmuyor." });
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({ password });

            if (error) throw error;

            toast({ title: "Başarılı", description: "Şifreniz belirlendi. Panele yönlendiriliyorsunuz..." });

            setTimeout(() => {
                router.push("/panel/inbox");
            }, 1000);

        } catch (error: any) {
            toast({ variant: "destructive", title: "Hata", description: error.message });
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
                <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Şifrenizi Belirleyin</h1>
                    <p className="text-slate-500 mt-2">
                        Hesabınıza güvenli giriş yapabilmek için lütfen kalıcı bir şifre belirleyiniz.
                    </p>
                </div>

                {sessionError ? (
                    <div className="text-center text-red-600 bg-red-50 border border-red-200 rounded-lg p-4 text-sm">
                        {sessionError}
                    </div>
                ) : (
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Yeni Şifre</Label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="******"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Şifre Tekrar</Label>
                            <Input
                                type="password"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                placeholder="******"
                                required
                            />
                        </div>

                        <Button type="submit" disabled={loading || !sessionReady} className="w-full mt-4 bg-slate-900 hover:bg-slate-800">
                            {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                            {!sessionReady && !loading ? "Oturum Açılıyor..." : "Şifreyi Kaydet ve Giriş Yap"}
                        </Button>
                    </form>
                )}
            </div>
        </div>
    );
}
