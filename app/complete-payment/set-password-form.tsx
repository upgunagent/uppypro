"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ShieldCheck } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

export function SetPasswordForm() {
    const [password, setPassword] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const handleSetPassword = async () => {
        if (password.length < 6) {
            toast({ variant: "destructive", title: "Hata", description: "Şifre en az 6 karakter olmalıdır." });
            return;
        }
        if (password !== passwordConfirm) {
            toast({ variant: "destructive", title: "Hata", description: "Şifreler eşleşmiyor." });
            return;
        }

        setLoading(true);
        try {
            const { createClient } = await import("@/lib/supabase/client");
            const supabase = createClient();
            const { error } = await supabase.auth.updateUser({ password });

            if (error) {
                toast({ variant: "destructive", title: "Hata", description: error.message });
                setLoading(false);
            } else {
                // Sign out so user logs in fresh with their new password
                await supabase.auth.signOut();
                setDone(true);
                setLoading(false);
            }
        } catch (e: any) {
            toast({ variant: "destructive", title: "Hata", description: e.message || "Bir hata oluştu." });
            setLoading(false);
        }
    };

    if (done) {
        return (
            <div className="text-center space-y-6 py-4">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-600 mb-2 animate-in zoom-in duration-300">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Hesabınız Hazır! 🎉</h2>
                <p className="text-slate-600 max-w-sm mx-auto">
                    Şifreniz başarıyla oluşturuldu. Giriş yaparak panelinize erişebilirsiniz.
                </p>
                <Button
                    onClick={() => router.push("/login")}
                    className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-lg shadow-lg shadow-orange-500/20 mt-4"
                >
                    Giriş Yap
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 mb-4">
                    <ShieldCheck className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Şifrenizi Belirleyin</h2>
                <p className="text-sm text-slate-500">Hesap güvenliğiniz için şifrenizi belirleyin.</p>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Yeni Şifre</label>
                    <Input
                        type="password"
                        placeholder="En az 6 karakter"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Şifre Tekrar</label>
                    <Input
                        type="password"
                        placeholder="Şifrenizi tekrar girin"
                        value={passwordConfirm}
                        onChange={(e) => setPasswordConfirm(e.target.value)}
                    />
                </div>
            </div>

            <Button onClick={handleSetPassword} disabled={loading} className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-lg">
                {loading ? <><Loader2 className="animate-spin mr-2" /> Kaydediliyor...</> : "Şifreyi Belirle ve Tamamla"}
            </Button>
        </div>
    );
}
