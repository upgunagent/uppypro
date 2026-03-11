import { LoginForm } from "./login-form";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, MessageCircle, Instagram } from "lucide-react";
import { Suspense } from "react";

export default async function LoginPage() {
    return (
        <div className="flex min-h-[calc(100vh/var(--zoom-factor))] w-full bg-white">
            {/* Left Side - Hero/Visuals... same as before */}
            <div className="hidden lg:flex w-1/2 bg-slate-50 relative overflow-hidden flex-col justify-between p-12 lg:p-16 xl:p-24 2xl:px-32">

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
                        <h1 className="text-4xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight mb-4">
                            <span className="text-orange-500">Uppy</span>
                            <span className="text-black">Pro</span>
                        </h1>

                        <h2 className="text-4xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
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
                        </h2>
                        <p className="text-slate-600 text-lg xl:text-xl max-w-md xl:max-w-lg leading-relaxed mt-4">
                            Yapay Zeka Dijital Asistanınız mesajlarınızı yanıtlasın, satışlarınızı artırsın. Tüm müşteri iletişiminiz tek bir yerde.
                        </p>
                    </div>

                    {/* Chat Visual Mockup Wrapper */}
                    <div className="relative w-full max-w-[400px] xl:max-w-[500px]">

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
                                <span className="truncate">Hızlı Kurulum</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                <span className="truncate">Güvenli Veri</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                <span className="truncate">7/24 Destek</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 relative overflow-hidden">
                {/* Decorative Background Logos */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03] z-0">
                    {/* WhatsApp Logos */}
                    <MessageCircle className="absolute top-[10%] left-[15%] w-64 h-64 -rotate-12" />
                    <MessageCircle className="absolute top-[60%] left-[8%] w-48 h-48 rotate-45" />
                    <MessageCircle className="absolute top-[20%] right-[20%] w-72 h-72 rotate-12" />
                    <MessageCircle className="absolute -bottom-10 right-[35%] w-80 h-80 -rotate-45" />
                    <MessageCircle className="absolute top-[40%] left-[45%] w-56 h-56 rotate-90" />

                    {/* Instagram Logos */}
                    <Instagram className="absolute top-[15%] right-[5%] w-56 h-56 rotate-12" />
                    <Instagram className="absolute top-[55%] right-[10%] w-64 h-64 -rotate-12" />
                    <Instagram className="absolute bottom-[10%] left-[20%] w-48 h-48 -rotate-45" />
                    <Instagram className="absolute top-[5%] left-[40%] w-52 h-52 rotate-45" />
                    <Instagram className="absolute bottom-[20%] right-[50%] w-72 h-72 rotate-12" />
                </div>
                <Link href="/" className="absolute top-8 right-8 text-sm font-medium text-slate-500 hover:text-slate-900 flex items-center gap-2 transition-colors z-10">
                    Ana Sayfaya Dön
                    <ArrowLeft size={16} />
                </Link>

                <div className="w-full max-w-[480px] space-y-8 bg-white p-10 rounded-3xl border-4 border-orange-500 shadow-2xl shadow-gray-400 relative z-10">
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

                    <Suspense fallback={<div className="h-[400px] flex items-center justify-center text-slate-400">Yükleniyor...</div>}>
                        <LoginForm />
                    </Suspense>

                </div>
            </div>
        </div>
    );
}


