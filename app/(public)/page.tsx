import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Check } from "lucide-react";

export default function LandingPage() {
    return (
        <div className="flex flex-col min-h-[calc(100vh-3.5rem)]">
            {/* Hero Section */}
            <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-b from-background to-slate-900 border-b border-white/5">
                <div className="container px-4 md:px-6 mx-auto">
                    <div className="flex flex-col items-center space-y-4 text-center">
                        <div className="space-y-2">
                            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                                WhatsApp ve Instagram <br />Mesajlarınızı Tek Panelden Yönetin
                            </h1>
                            <p className="mx-auto max-w-[700px] text-gray-400 md:text-xl">
                                Tüm konuşmalar tek ekranda. İster manuel cevaplayın, isterseniz AI asistanımız sizin yerinize 7/24 konuşsun.
                            </p>
                        </div>
                        <div className="space-x-4">
                            <Link href="/signup">
                                <Button size="lg" className="h-12 px-8 text-lg">Hemen Başla</Button>
                            </Link>
                            <Link href="/login">
                                <Button variant="outline" size="lg" className="h-12 px-8">Giriş Yap</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features / How it works */}
            <section className="w-full py-12 md:py-24 lg:py-32 bg-slate-950/50">
                <div className="container px-4 md:px-6 mx-auto">
                    <div className="grid gap-10 sm:grid-cols-1 md:grid-cols-3 text-center">
                        <div className="flex flex-col items-center space-y-4 p-6 glass rounded-xl">
                            <div className="p-4 bg-primary/10 rounded-full text-primary font-bold text-2xl">1</div>
                            <h3 className="text-xl font-bold">Kanalları Bağla</h3>
                            <p className="text-gray-400">WhatsApp Business ve Instagram hesaplarınızı saniyeler içinde bağlayın.</p>
                        </div>
                        <div className="flex flex-col items-center space-y-4 p-6 glass rounded-xl">
                            <div className="p-4 bg-primary/10 rounded-full text-primary font-bold text-2xl">2</div>
                            <h3 className="text-xl font-bold">Tek Ekran Yönetimi</h3>
                            <p className="text-gray-400">Gelen tüm mesajları tek bir inbox'ta görün, konuşma geçmişine hakim olun.</p>
                        </div>
                        <div className="flex flex-col items-center space-y-4 p-6 glass rounded-xl">
                            <div className="p-4 bg-primary/10 rounded-full text-primary font-bold text-2xl">3</div>
                            <h3 className="text-xl font-bold">AI Otomasyon</h3>
                            <p className="text-gray-400">AI modülünü açın, standart soruları bot cevaplasın, satışları artırın.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing - Just a visual representation for now, Plan selection is in /signup */}
            <section id="pricing" className="w-full py-12 md:py-24 lg:py-32 border-t border-white/5 bg-background">
                <div className="container px-4 md:px-6 mx-auto">
                    <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
                        <div className="space-y-2">
                            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Uygun Fiyatlı Paketler</h2>
                            <p className="max-w-[900px] text-gray-400 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                                İhtiyacınıza uygun paketi seçin, işletmenizi büyütmeye başlayın.
                            </p>
                        </div>
                    </div>
                    <div className="grid gap-8 sm:grid-cols-1 lg:grid-cols-4 items-start">
                        {/* Base */}
                        <div className="flex flex-col p-6 glass rounded-xl border-primary/20 border-2 relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-primary/20 px-3 py-1 text-xs font-bold text-primary rounded-bl-lg">TEMEL</div>
                            <h3 className="text-2xl font-bold mb-2">Inbox</h3>
                            <div className="text-4xl font-bold mb-4">495 TL<span className="text-base font-normal text-muted-foreground">/ay</span></div>
                            <ul className="space-y-2 mb-6 text-sm text-gray-400">
                                <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-primary" /> WhatsApp Entegrasyonu</li>
                                <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-primary" /> Instagram Entegrasyonu</li>
                                <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-primary" /> Tek Panelden Yönetim</li>
                            </ul>
                            <Link href="/signup?plan=base_inbox" className="mt-auto">
                                <Button className="w-full">Seç</Button>
                            </Link>
                        </div>
                        {/* AI Starter */}
                        <div className="flex flex-col p-6 glass rounded-xl border-white/10 relative">
                            <h3 className="text-2xl font-bold mb-2">Başlangıç AI</h3>
                            <div className="text-4xl font-bold mb-4">2.499 TL<span className="text-base font-normal text-muted-foreground">/ay</span></div>
                            <ul className="space-y-2 mb-6 text-sm text-gray-400">
                                <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-primary" /> Her şey dahil (Inbox)</li>
                                <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-secondary" /> Bilgi Veren AI Bot</li>
                                <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-secondary" /> Manuel Devralma Modu</li>
                            </ul>
                            <Link href="/signup?plan=ai_starter" className="mt-auto">
                                <Button variant="outline" className="w-full">Seç</Button>
                            </Link>
                        </div>
                        {/* AI Medium */}
                        <div className="flex flex-col p-6 glass rounded-xl border-white/10 relative">
                            <h3 className="text-2xl font-bold mb-2">Edim AI</h3>
                            <div className="text-4xl font-bold mb-4">4.999 TL<span className="text-base font-normal text-muted-foreground">/ay</span></div>
                            <ul className="space-y-2 mb-6 text-sm text-gray-400">
                                <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-primary" /> Her şey dahil (Inbox)</li>
                                <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-secondary" /> +2 AI Tool Entegrasyonu</li>
                                <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-secondary" /> Gelişmiş Senaryolar</li>
                            </ul>
                            <Link href="/signup?plan=ai_medium" className="mt-auto">
                                <Button variant="outline" className="w-full">Seç</Button>
                            </Link>
                        </div>
                        {/* AI Pro */}
                        <div className="flex flex-col p-6 glass rounded-xl border-white/10 relative">
                            <h3 className="text-2xl font-bold mb-2">Pro AI</h3>
                            <div className="text-4xl font-bold mb-4">8.999 TL<span className="text-base font-normal text-muted-foreground">/ay</span></div>
                            <ul className="space-y-2 mb-6 text-sm text-gray-400">
                                <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-primary" /> Her şey dahil (Inbox)</li>
                                <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-secondary" /> +4 AI Tool Entegrasyonu</li>
                                <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-secondary" /> Premium Destek</li>
                            </ul>
                            <Link href="/signup?plan=ai_pro" className="mt-auto">
                                <Button variant="outline" className="w-full">Seç</Button>
                            </Link>
                        </div>
                    </div>
                    <p className="mt-8 text-center text-sm text-muted-foreground">Fiyatlara KDV dahil değildir. Yıllık alımlarda kurulum ücretsizdir.</p>
                </div>
            </section>
        </div>
    );
}
