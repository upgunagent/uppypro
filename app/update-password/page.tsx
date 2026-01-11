"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function UpdatePasswordPage() {
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

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
        const supabase = createClient();

        try {
            const { error } = await supabase.auth.updateUser({ password });

            if (error) throw error;

            toast({ title: "Başarılı", description: "Şifreniz belirlendi. Panele yönlendiriliyorsunuz..." });

            // Redirect to panel after short delay
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

                    <Button type="submit" disabled={loading} className="w-full mt-4 bg-slate-900 hover:bg-slate-800">
                        {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                        Şifreyi Kaydet ve Giriş Yap
                    </Button>
                </form>
            </div>
        </div>
    );
}
