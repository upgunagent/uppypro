"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { CheckCircle2, Mail } from "lucide-react";

export default function EnterprisePaymentSuccessPage() {
    const router = useRouter();

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={32} />
                    </div>

                    <h1 className="text-2xl font-bold text-slate-900 mb-2">
                        Ödemeniz Başarıyla Alındı! 🎉
                    </h1>

                    <p className="text-slate-600 mb-8">
                        Kurumsal hesabınız aktifleştirildi.
                    </p>

                    <div className="bg-orange-50 border border-orange-100 rounded-lg p-6 mb-8">
                        <div className="flex items-start gap-4 text-left">
                            <div className="w-10 h-10 bg-orange-600 text-white rounded-full flex items-center justify-center flex-shrink-0">
                                <Mail size={20} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900 mb-1">
                                    E-posta Adresinizi Kontrol Edin
                                </h3>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    Panelinize erişmek için <strong>şifrenizi belirlemeniz</strong> gerekmektedir.
                                    E-posta adresinize gönderilen <strong>"Şifremi Belirle"</strong> linkine tıklayarak
                                    şifrenizi oluşturun ve sisteme giriş yapın.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <Button
                            onClick={() => router.push("/login")}
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white h-11"
                        >
                            Giriş Sayfasına Git
                        </Button>
                        <Button
                            onClick={() => router.push("/")}
                            variant="outline"
                            className="w-full h-11"
                        >
                            Ana Sayfaya Dön
                        </Button>
                    </div>

                    <p className="text-xs text-slate-400 mt-6">
                        E-posta gelmedi mi? Spam klasörünüzü kontrol edin veya birkaç dakika bekleyin.
                    </p>
                </div>
            </div>
        </div>
    );
}
