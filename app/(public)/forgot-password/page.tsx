"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const supabase = createClient();
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/update-password`,
            });

            if (error) {
                setError(error.message);
            } else {
                setSuccess(true);
            }
        } catch (err) {
            setError("Bir hata oluştu. Lütfen tekrar deneyin.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                <div className="p-8">
                    <Link href="/login" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors">
                        <ArrowLeft size={16} />
                        Giriş Yap'a Dön
                    </Link>

                    {!success ? (
                        <>
                            <div className="space-y-2 mb-8">
                                <h1 className="text-2xl font-bold text-slate-900">Şifrenizi mi Unuttunuz?</h1>
                                <p className="text-slate-500">
                                    Endişelenmeyin! E-posta adresinizi girin, size şifrenizi sıfırlamanız için bir bağlantı gönderelim.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700" htmlFor="email">
                                        E-posta Adresi
                                    </label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="isim@sirketiniz.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
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
                                    {loading ? "Gönderiliyor..." : "Sıfırlama Bağlantısı Gönder"}
                                </Button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 size={32} />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 mb-2">E-posta Gönderildi!</h2>
                            <p className="text-slate-500 mb-8">
                                <strong>{email}</strong> adresine şifre sıfırlama bağlantısını gönderdik. Lütfen gelen kutunuzu (ve spam klasörünü) kontrol edin.
                            </p>
                            <Link href="/login">
                                <Button variant="outline" className="w-full h-11">
                                    Giriş Ekranına Dön
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>

                {/* Footer Brand */}
                <div className="bg-slate-50 p-4 border-t border-slate-100 text-center">
                    <img src="/brand-logo-text.png" alt="UPGUN AI" className="h-4 mx-auto opacity-50 filter grayscale" />
                </div>
            </div>
        </div>
    );
}
