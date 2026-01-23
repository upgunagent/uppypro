import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Mail, Phone, MapPin, Instagram, MessageCircle } from "lucide-react";

export function LandingHeader() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <img
                        src="/brand-logo-text.png"
                        alt="UPGUN AI Logo"
                        className="h-12 w-auto object-contain" // Adjusted height for text logo
                    />
                </Link>

                {/* Navigation */}
                <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
                    <Link href="#product" className="hover:text-primary transition-colors">Ürün</Link>
                    <Link href="#features" className="hover:text-primary transition-colors">Özellikler</Link>
                    <Link href="#pricing" className="hover:text-primary transition-colors">Paketler</Link>
                    <Link href="#faq" className="hover:text-primary transition-colors">SSS</Link>
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
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8" style={{ alignItems: 'start' }}>
                    {/* Brand */}
                    <div className="space-y-4">
                        <img src="/brand-logo-text.png" alt="UPGUN AI" className="h-10 w-auto opacity-90" />
                        <p className="text-sm text-gray-500 max-w-xs">
                            Instagram ve WhatsApp mesajlarınızı yapay zeka ile yönetin, satışlarınızı artırın.
                        </p>
                    </div>

                    {/* Quick Access */}
                    <div>
                        <h4 className="font-bold text-gray-900 mb-6 text-lg">Hızlı Erişim</h4>
                        <ul className="space-y-3 text-sm text-gray-600 font-medium">
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
                        <h4 className="font-bold text-gray-900 mb-6 text-lg">Yasal</h4>
                        <ul className="space-y-3 text-sm text-gray-600 font-medium">
                            <li><Link href="/kullanici-sozlesmesi" className="hover:text-primary transition-colors">Kullanıcı Sözleşmesi</Link></li>
                            <li><Link href="/gizlilik-politikasi" className="hover:text-primary transition-colors">Gizlilik Politikası</Link></li>
                            <li><Link href="/kvkk-aydinlatma-metni" className="hover:text-primary transition-colors">KVKK Aydınlatma Metni</Link></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="font-bold text-gray-900 mb-6 text-lg">İletişim</h4>
                        <ul className="space-y-4 text-sm text-gray-600">
                            <li className="flex items-start gap-3">
                                <Mail className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                                <a href="mailto:info@upgunai.com" className="hover:text-primary transition-colors">info@upgunai.com</a>
                            </li>
                            <li className="flex items-start gap-3">
                                <Phone className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                                <a href="tel:+905332076252" className="hover:text-primary transition-colors">+90 533 207 62 52</a>
                            </li>
                            <li className="flex items-start gap-3">
                                <MapPin className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                                <span>
                                    UPGUN AI - Office İstanbul<br />
                                    Nisbetiye Mh. Gazi Güçnar Sk. No: 4<br />
                                    Zincirlikuyu, Beşiktaş, İstanbul
                                </span>
                            </li>
                        </ul>
                        <div className="flex items-center gap-4 mt-8">
                            <Link href="https://www.instagram.com/upgunai/" target="_blank" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors group">
                                <Instagram className="w-5 h-5 text-gray-600 group-hover:text-pink-600 transition-colors" />
                            </Link>
                            <Link href="#" className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center hover:bg-green-200 transition-colors group">
                                <MessageCircle className="w-5 h-5 text-green-600 group-hover:text-green-700 transition-colors" />
                            </Link>
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
