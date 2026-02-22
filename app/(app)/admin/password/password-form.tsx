"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

export function PasswordForm() {
    const [loading, setLoading] = useState(false);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const supabase = createClient();
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password.length < 6) {
            toast({ variant: "destructive", title: "Hata", description: "Şifre en az 6 karakter olmalıdır." });
            return;
        }

        if (password !== confirmPassword) {
            toast({ variant: "destructive", title: "Hata", description: "Şifreler eşleşmiyor." });
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.updateUser({
            password: password
        });

        if (error) {
            toast({ variant: "destructive", title: "Hata", description: "Şifre güncellenirken bir hata oluştu: " + error.message });
        } else {
            toast({ title: "Başarılı", description: "Şifreniz başarıyla güncellendi." });
            setPassword("");
            setConfirmPassword("");
        }

        setLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="password">Yeni Şifre</Label>
                <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="focus-visible:ring-orange-500"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="confirmPassword">Yeni Şifre (Tekrar)</Label>
                <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="focus-visible:ring-orange-500"
                />
            </div>

            <Button
                type="submit"
                disabled={loading}
                className="bg-orange-600 hover:bg-orange-700 text-white font-medium"
            >
                {loading ? "Güncelleniyor..." : "Şifreyi Güncelle"}
            </Button>
        </form>
    );
}
