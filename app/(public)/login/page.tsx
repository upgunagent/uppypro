import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ArrowLeft, MessageCircle, Instagram, CheckCircle2 } from "lucide-react";

export default async function LoginPage({
    searchParams,
}: {
    searchParams: { message: string };
}) {
    const signIn = async (formData: FormData) => {
        "use server";

        const email = formData.get("email") as string;
        const password = formData.get("password") as string;
        const supabase = await createClient();

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return redirect("/login?message=Kullanıcı adı veya şifre hatalı.");
        }

        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            // Check for agency_admin role
            const { createAdminClient } = await import("@/lib/supabase/admin"); // Dynamic import to avoid build cycle if any
            const adminDb = createAdminClient();

            const { data: membership } = await adminDb
                .from("tenant_members")
                .select("role")
                .eq("user_id", user.id)
                .eq("role", "agency_admin")
                .maybeSingle();

            if (membership) {
                return redirect("/admin/tenants");
            }
        }

        return redirect("/panel/inbox");
    };

    return (
        <div className="flex min-h-screen w-full bg-white">
            {/* Left Side - Hero/Visuals */}
            <div className="hidden lg:flex w-1/2 bg-slate-50 relative overflow-hidden flex-col justify-between p-12 lg:p-16">

                {/* Decorational Background Elements */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-orange-100/40 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3" />

                {/* Brand */}
                <Link href="/" className="relative z-10 block w-fit">
                    <img
                        src="/brand-logo-text.png"
                        alt="UPGUN AI"
                        className="h-8 w-auto opacity-90"
                    />
                </Link>

                {/* Main Visual & Content */}
                <div className="relative z-10 flex flex-col justify-center items-start flex-1 py-12 text-left">
                    <div className="space-y-8 mb-12 relative z-20">
                        <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-4">
                            <span className="text-orange-500">Uppy</span>
                            <span className="text-black">Pro</span>
                        </h1>
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 border border-orange-100 text-orange-600 text-sm font-medium">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                            </span>
                            Yapay Zeka Destekli Müşteri Paneli
                        </div>

                        <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
                            <span className="relative inline-block">
                                {/* Base Layer */}
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-800">Instagram</span>
                                {" ve "}
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-700">WhatsApp</span>

                                {/* Continuous Shine Overlay */}
                                <span className="absolute inset-0 text-transparent bg-clip-text bg-[linear-gradient(90deg,transparent_45%,rgba(255,255,255,0.8)_50%,transparent_55%)] bg-[length:200%_auto] bg-no-repeat animate-shine pointer-events-none" aria-hidden="true">
                                    Instagram ve WhatsApp
                                </span>
                            </span>
                            <br />
                            <span className="text-orange-500">Tek Panelde.</span>
                        </h1>
                        <p className="text-slate-600 text-xl max-w-lg leading-relaxed">
                            Yapay Zeka Dijital Asistanınız mesajlarınızı yanıtlasın, satışlarınızı artırsın. Tüm müşteri iletişiminiz tek bir yerde.
                        </p>
                    </div>

                    {/* Chat Visual Mockup Wrapper */}
                    <div className="relative w-full max-w-[500px]">

                        {/* Abstract Card Background */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-orange-200 to-purple-200 rounded-3xl blur-2xl opacity-30 transform rotate-6 scale-95" />

                        {/* Main Card */}
                        <div className="relative bg-white border border-slate-200/60 rounded-2xl shadow-2xl p-6 overflow-hidden transform transition-transform hover:scale-[1.02] duration-500 z-10">
                            {/* Mock Chat Header */}
                            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold">
                                        UA
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900 text-sm text-left">UPGUN Asistan</div>
                                        <div className="text-xs text-green-600 flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                            Çevrimiçi
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Mock Messages */}
                            <div className="space-y-4 text-sm text-left">
                                <div className="flex gap-2">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex-shrink-0" />
                                    <div className="bg-slate-100 rounded-2xl rounded-tl-none p-3 text-slate-700">
                                        Özel üretim takım elbiseleriniz hakkında bilgi alabilir miyim? 👔
                                    </div>
                                </div>
                                <div className="flex gap-2 flex-row-reverse">
                                    <div className="w-8 h-8 rounded-full bg-orange-100 flex-shrink-0 flex items-center justify-center text-xs text-orange-600 font-bold">AI</div>
                                    <div className="bg-orange-600 text-white rounded-2xl rounded-tr-none p-3 shadow-lg shadow-orange-500/20">
                                        Elbette! Kişiye özel dikim hizmetimizle size en uygun takımı tasarlıyoruz. Kumaş seçeneklerimizi görmek ister misiniz? ✨
                                    </div>
                                </div>
                            </div>

                            <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur border border-slate-100 px-3 py-1.5 rounded-full shadow-sm text-[10px] font-medium text-slate-400 flex items-center gap-1.5">
                                <CheckCircle2 size={12} className="text-green-500" />
                                Otomatik Yanıtlandı
                            </div>
                        </div>

                        {/* Features List - Below Card */}
                        <div className="relative z-10 text-sm font-medium text-slate-500 flex justify-start gap-6 mt-8 pl-4">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                Hızlı Kurulum
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                Güvenli Veri
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                7/24 Destek
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 relative">
                <Link href="/" className="absolute top-8 right-8 text-sm font-medium text-slate-500 hover:text-slate-900 flex items-center gap-2 transition-colors">
                    Ana Sayfaya Dön
                    <ArrowLeft size={16} />
                </Link>

                <div className="w-full max-w-[480px] space-y-8 bg-white p-10 rounded-3xl border-4 border-orange-500 shadow-2xl shadow-gray-400">
                    <div className="text-center space-y-2 lg:text-left">
                        <img
                            src="/brand-logo-text.png"
                            alt="UPGUN AI"
                            className="h-10 w-auto mx-auto lg:mx-0 lg:hidden mb-6"
                        />
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Giriş Yap</h2>
                        <p className="text-slate-500">
                            Hesabınıza giriş yaparak işletme panelinize erişin.
                        </p>
                    </div>

                    <form className="space-y-5" action={signIn}>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700" htmlFor="email">
                                E-posta Adresi
                            </label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="isim@sirketiniz.com"
                                required
                                className="h-12 bg-white border-slate-200 focus:border-orange-500 transition-all text-base"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-slate-700" htmlFor="password">
                                    Şifre
                                </label>
                                <Link
                                    href="/forgot-password"
                                    className="text-sm font-medium text-orange-600 hover:text-orange-700"
                                >
                                    Şifremi unuttum
                                </Link>
                            </div>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                required
                                className="h-12 bg-white border-slate-200 focus:border-orange-500 transition-all text-base"
                            />
                        </div>

                        {searchParams?.message && (
                            <div className="p-4 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                {searchParams.message}
                            </div>
                        )}

                        <Button type="submit" className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white font-medium text-base shadow-lg shadow-orange-500/20 transition-all hover:-translate-y-0.5">
                            Giriş Yap
                        </Button>
                    </form>


                </div>
            </div>
        </div>
    );
}
