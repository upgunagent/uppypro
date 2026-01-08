import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";

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
                        <Button variant="ghost" className="text-gray-600 hover:text-primary hover:bg-orange-50">Giriş Yap</Button>
                    </Link>
                    <Link href="#pricing">
                        <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-orange-500/20 rounded-full px-6">
                            Paketi Seç
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    {/* Brand */}
                    <div className="space-y-4">
                        <img src="/brand-logo-text.png" alt="UPGUN AI" className="h-10 w-auto opacity-90" />
                        <p className="text-sm text-gray-500 max-w-xs">
                            Instagram ve WhatsApp mesajlarınızı yapay zeka ile yönetin, satışlarınızı artırın.
                        </p>
                    </div>

                    {/* Links */}
                    <div>
                        <h4 className="font-semibold text-gray-900 mb-4">Ürün</h4>
                        <ul className="space-y-2 text-sm text-gray-500">
                            <li><Link href="#" className="hover:text-primary">Özellikler</Link></li>
                            <li><Link href="#" className="hover:text-primary">Fiyatlandırma</Link></li>
                            <li><Link href="#" className="hover:text-primary">Entegrasyonlar</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold text-gray-900 mb-4">Kurumsal</h4>
                        <ul className="space-y-2 text-sm text-gray-500">
                            <li><Link href="#" className="hover:text-primary">Hakkımızda</Link></li>
                            <li><Link href="#" className="hover:text-primary">İletişim</Link></li>
                            <li><Link href="#" className="hover:text-primary">Kariyer</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold text-gray-900 mb-4">Yasal</h4>
                        <ul className="space-y-2 text-sm text-gray-500">
                            <li><Link href="#" className="hover:text-primary">Gizlilik Politikası</Link></li>
                            <li><Link href="#" className="hover:text-primary">Kullanım Şartları</Link></li>
                            <li><Link href="#" className="hover:text-primary">KVKK</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
                    <p>© 2024 UPGUN AI. Tüm hakları saklıdır.</p>
                </div>
            </div>
        </footer>
    );
}
