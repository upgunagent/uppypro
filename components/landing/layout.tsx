import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Mail, Phone, MapPin, Instagram, MessageCircle } from "lucide-react";

export function LandingHeader() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/95 backdrop-blur-md pt-4">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 flex-1 md:flex-none justify-center md:justify-start">
                    <img
                        src="/brand-logo-text.png"
                        alt="UPGUN AI Logo"
                        className="h-10 md:h-12 w-auto object-contain"
                    />
                </Link>

                {/* Navigation */}
                <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
                    <Link href="#product" className="hover:text-primary transition-colors">Ürün</Link>
                    <Link href="#features" className="hover:text-primary transition-colors">Özellikler</Link>
                    <Link href="#pricing" className="hover:text-primary transition-colors">Paketler</Link>
                    <Link href="#faq" className="hover:text-primary transition-colors">SSS</Link>
                    <Link href="#solutions" className="hover:text-primary transition-colors">Çözümlerimiz</Link>
                    <Link href="#contact" className="hover:text-primary transition-colors">İletişim</Link>
                </nav>

                {/* Actions */}
                <div className="flex items-center gap-4">
                    <Link href="/login" className="hidden sm:block">
                        <Button className="bg-[#25D366] hover:bg-[#128C7E] text-white shadow-lg rounded-full px-6 transition-colors">
                            İşletme Girişi
                        </Button>
                    </Link>
                </div>
            </div>
        </header>
    );
}

export function LandingFooter() {
    return (
        <footer className="bg-gray-50 border-t border-gray-100 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row gap-6 md:gap-8 mb-8 w-full" style={{ alignItems: 'start' }}>
                    {/* Brand */}
                    <div className="space-y-3 md:space-y-4 w-full md:w-1/4">
                        <img src="/brand-logo-text.png" alt="UPGUN AI" className="h-8 md:h-10 w-auto opacity-90" />
                        <p className="text-xs md:text-sm text-gray-500 max-w-xs">
                            Instagram ve WhatsApp mesajlarınızı yapay zeka ile yönetin, satışlarınızı artırın.
                        </p>
                        <div className="pt-2 md:pt-4">
                            <img
                                src="/iyzico-footer.png"
                                alt="Iyzico ile Öde"
                                className="h-6 md:h-8 w-auto bg-transparent"
                            />
                        </div>
                    </div>

                    {/* Links Grid -> Mobile 3 cols, Desktop 3 cols (taking remaining width) */}
                    <div className="w-full md:w-3/4 grid grid-cols-3 gap-2 md:gap-8">
                        {/* Quick Access */}
                        <div>
                            <h4 className="font-bold text-gray-900 mb-3 md:mb-6 text-[11px] md:text-lg">Hızlı Erişim</h4>
                            <ul className="space-y-2 md:space-y-3 text-[9px] md:text-sm text-gray-600 font-medium">
                                <li><Link href="#" className="hover:text-primary transition-colors">Çözümler</Link></li>
                                <li><Link href="#how-it-works" className="hover:text-primary transition-colors">Nasıl Çalışıyoruz?</Link></li>
                                <li><Link href="#pricing" className="hover:text-primary transition-colors">Paketler</Link></li>
                                <li><Link href="#faq" className="hover:text-primary transition-colors">SSS</Link></li>
                                <li><Link href="#" className="hover:text-primary transition-colors">Blog</Link></li>
                                <li><Link href="#contact" className="hover:text-primary transition-colors">İletişim</Link></li>
                            </ul>
                        </div>

                        {/* Legal */}
                        <div>
                            <h4 className="font-bold text-gray-900 mb-3 md:mb-6 text-[11px] md:text-lg">Yasal</h4>
                            <ul className="space-y-2 md:space-y-3 text-[9px] md:text-sm text-gray-600 font-medium">
                                <li><Link href="/kullanici-sozlesmesi" className="hover:text-primary transition-colors">Kullanıcı Sözleşmesi</Link></li>
                                <li><Link href="/gizlilik-politikasi" className="hover:text-primary transition-colors">Gizlilik Politikası</Link></li>
                                <li><Link href="/kvkk-aydinlatma-metni" className="hover:text-primary transition-colors">KVKK Aydınlatma</Link></li>
                            </ul>
                        </div>

                        {/* Contact */}
                        <div className="break-words">
                            <h4 className="font-bold text-gray-900 mb-3 md:mb-6 text-[11px] md:text-lg">İletişim</h4>
                            <ul className="space-y-3 md:space-y-4 text-[9px] md:text-sm text-gray-600">
                                <li className="flex items-start gap-1.5 md:gap-3">
                                    <Mail className="w-3 h-3 md:w-5 md:h-5 text-gray-400 mt-0.5 shrink-0 hidden sm:block" />
                                    <a href="mailto:info@upgunai.com" className="hover:text-primary transition-colors break-all">info@upgunai.com</a>
                                </li>
                                <li className="flex items-start gap-1.5 md:gap-3">
                                    <Phone className="w-3 h-3 md:w-5 md:h-5 text-gray-400 mt-0.5 shrink-0 hidden sm:block" />
                                    <a href="tel:+905334906252" className="hover:text-primary transition-colors inline-block">
                                        +90 533 490 6252 <span className="text-slate-400 text-[8px] md:text-sm ml-0.5 md:ml-1 block xl:inline">(WA Destek)</span>
                                    </a>
                                </li>
                                <li className="flex items-start gap-1.5 md:gap-3">
                                    <MapPin className="w-3 h-3 md:w-5 md:h-5 text-gray-400 mt-0.5 shrink-0 hidden sm:block" />
                                    <span className="leading-tight md:leading-normal">
                                        UPGUN AI - Office İst.<br />
                                        Nisbetiye Mh. Gazi Güçnar Sk. No: 4<br />
                                        Zincirlikuyu, Beşiktaş
                                    </span>
                                </li>
                            </ul>
                            <div className="flex items-center gap-2 md:gap-4 mt-4 md:mt-8">
                                <Link href="https://www.instagram.com/upgunai/" target="_blank" className="w-6 h-6 md:w-10 md:h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors group">
                                    <Instagram className="w-3 h-3 md:w-5 md:h-5 text-gray-600 group-hover:text-pink-600 transition-colors" />
                                </Link>
                                <Link href="https://wa.me/905334906252" target="_blank" className="w-6 h-6 md:w-10 md:h-10 rounded-full bg-green-100 flex items-center justify-center hover:bg-green-200 transition-colors group">
                                    <MessageCircle className="w-3 h-3 md:w-5 md:h-5 text-green-600 group-hover:text-green-700 transition-colors" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
                    <p>© 2024 UPGUN AI. Tüm hakları saklıdır.</p>
                </div>
            </div>
        </footer>
    );
}
