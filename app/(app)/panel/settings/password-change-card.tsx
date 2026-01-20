
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, LockKeyhole } from "lucide-react";
import { updateUserPassword } from "@/app/actions/auth";
import { useToast } from "@/components/ui/use-toast";

export function PasswordChangeCard() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast({
                variant: "destructive",
                title: "Hata",
                description: "Şifreler eşleşmiyor.",
            });
            return;
        }

        if (password.length < 6) {
            toast({
                variant: "destructive",
                title: "Hata",
                description: "Şifre en az 6 karakter olmalıdır.",
            });
            return;
        }

        startTransition(async () => {
            try {
                const result = await updateUserPassword(password);
                if (result.error) {
                    toast({
                        variant: "destructive",
                        title: "Hata",
                        description: result.error,
                    });
                } else {
                    toast({
                        title: "Başarılı",
                        description: "Şifreniz başarıyla güncellendi.",
                    });
                    setPassword("");
                    setConfirmPassword("");
                }
            } catch (error) {
                toast({
                    variant: "destructive",
                    title: "Hata",
                    description: "Bir hata oluştu.",
                });
            }
        });
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <div className="bg-orange-100 p-2 rounded-lg">
                        <LockKeyhole className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                        <CardTitle>Şifre Değiştir</CardTitle>
                        <CardDescription>Hesabınızın giriş şifresini buradan güncelleyebilirsiniz.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-password">Yeni Şifre</Label>
                            <Input
                                id="new-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="******"
                                disabled={isPending}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">Yeni Şifre (Tekrar)</Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="******"
                                disabled={isPending}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end pt-2">
                        <Button type="submit" disabled={isPending || !password} className="bg-orange-600 hover:bg-orange-700">
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Güncelleniyor...
                                </>
                            ) : (
                                "Şifreyi Güncelle"
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
