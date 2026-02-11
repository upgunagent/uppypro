import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import Link from "next/link";

export default function SignupSuccessPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white p-8 rounded-2xl shadow-xl border border-slate-100 text-center space-y-6">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto animate-in zoom-in duration-500">
                    <Check className="w-10 h-10" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-3xl font-bold text-slate-900">Tebrikler! 🎉</h2>
                    <h3 className="text-lg font-medium text-slate-700">Ödemeniz Başarıyla Alındı</h3>
                </div>

                <p className="text-slate-500 max-w-sm mx-auto">
                    Üyeliğiniz başarıyla oluşturuldu. Şifrenizi belirlemeniz için gereken bağlantı e-posta adresinize gönderildi.
                </p>

                <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm">
                    Lütfen gelen kutunuzu (ve spam/gereksiz klasörünü) kontrol edin ve gönderilen bağlantıya tıklayarak şifrenizi oluşturun.
                </div>

                <Link href="/login" className="block">
                    <Button className="w-full h-12 text-lg bg-orange-600 hover:bg-orange-700 shadow-xl shadow-orange-500/20 mt-4">
                        Giriş Yap
                    </Button>
                </Link>

                <p className="text-xs text-slate-400 mt-4">© 2024 UppyPro</p>
            </div>
        </div>
    );
}
