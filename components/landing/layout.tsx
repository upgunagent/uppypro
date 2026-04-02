"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Mail, Phone, MapPin, Instagram, MessageCircle, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const SECTORS = [
    { name: "Güzellik & Kuaför", slug: "guzellik-salonu", emoji: "💇‍♀️" },
    { name: "Klinik & Sağlık", slug: "klinik-saglik", emoji: "🏥" },
    { name: "Otel & Konaklama", slug: "otel-konaklama", emoji: "🏨" },
    { name: "Restoran & Kafe", slug: "restoran-kafe", emoji: "🍽️" },
    { name: "E-Ticaret", slug: "e-ticaret", emoji: "🛒" },
    { name: "Diş Klinikleri", slug: "dis-klinigi", emoji: "🦷" },
    { name: "Eğitim Kurumları", slug: "egitim", emoji: "🎓" },
    { name: "Emlak", slug: "emlak", emoji: "🏠" },
    { name: "Otomotiv", slug: "otomotiv", emoji: "🚗" },
    { name: "Sigorta", slug: "sigorta", emoji: "🛡️" },
    { name: "Tekne & Yat Kiralama", slug: "tekne-yat-kiralama", emoji: "⛵" },
    { name: "Villa & Apart Kiralama", slug: "villa-apart-kiralama", emoji: "🏡" },
    { name: "Stüdyo Kiralama", slug: "studyo-kiralama", emoji: "🎤" },
];

export function LandingHeader() {
    const [sectorOpen, setSectorOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mobileSectorOpen, setMobileSectorOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setSectorOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Body scroll lock when mobile menu is open
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [mobileMenuOpen]);

    return (
        <>
        <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/95 backdrop-blur-md pt-4">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 flex items-center justify-between">
                {/* Hamburger Button (mobile only) */}
                <button
                    className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label="Menü"
                >
                    {mobileMenuOpen ? (
                        <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ) : (
                        <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    )}
                </button>

                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 flex-1 md:flex-none justify-center md:justify-start">
                    <img
                        src="/brand-logo-text.png"
                        alt="UPGUN AI Logo"
                        className="h-10 md:h-12 w-auto object-contain"
                    />
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
                    <Link href="/hakkimizda" className="hover:text-primary transition-colors">Hakkımızda</Link>
                    <Link href="/#features" className="hover:text-primary transition-colors">Özellikler</Link>

                    {/* Sektörler Dropdown */}
                    <div
                        ref={dropdownRef}
                        className="relative"
                        onMouseEnter={() => setSectorOpen(true)}
                        onMouseLeave={() => setSectorOpen(false)}
                    >
                        <button
                            className="flex items-center gap-1 hover:text-primary transition-colors"
                            onClick={() => setSectorOpen(!sectorOpen)}
                        >
                            Sektörler
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${sectorOpen ? "rotate-180" : ""}`} />
                        </button>

                        {sectorOpen && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50">
                                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 py-2 w-64 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {SECTORS.map((sector) => (
                                        <Link
                                            key={sector.slug}
                                            href={`/cozumler/${sector.slug}`}
                                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                                            onClick={() => setSectorOpen(false)}
                                        >
                                            <span className="font-medium">{sector.name}</span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <Link href="/#pricing" className="hover:text-primary transition-colors">Paketler</Link>
                    <Link href="/#faq" className="hover:text-primary transition-colors">SSS</Link>
                    <Link href="/#solutions" className="hover:text-primary transition-colors">Çözümlerimiz</Link>
                    <Link href="/blog" className="hover:text-primary transition-colors">Blog</Link>
                    <Link href="/#contact" className="hover:text-primary transition-colors">İletişim</Link>
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

        {/* Mobile Menu Panel — header dışında, fixed olarak çalışır */}
        {mobileMenuOpen && (
            <div className="md:hidden fixed inset-0 top-[73px] z-[60] bg-white overflow-y-auto">
                <nav className="flex flex-col px-6 py-4 space-y-1">
                    <Link href="/hakkimizda" className="py-3 px-3 text-base font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors" onClick={() => setMobileMenuOpen(false)}>
                        Hakkımızda
                    </Link>
                    <Link href="/#features" className="py-3 px-3 text-base font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors" onClick={() => setMobileMenuOpen(false)}>
                        Özellikler
                    </Link>

                    {/* Mobile Sektörler Accordion */}
                    <div>
                        <button
                            className="w-full py-3 px-3 text-base font-medium text-gray-700 hover:bg-orange-50 rounded-xl transition-colors flex items-center justify-between"
                            onClick={() => setMobileSectorOpen(!mobileSectorOpen)}
                        >
                            Sektörler
                            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${mobileSectorOpen ? "rotate-180" : ""}`} />
                        </button>
                        {mobileSectorOpen && (
                            <div className="ml-3 pl-3 border-l-2 border-orange-200 space-y-0.5 mb-1">
                                {SECTORS.map((sector) => (
                                    <Link
                                        key={sector.slug}
                                        href={`/cozumler/${sector.slug}`}
                                        className="block py-2.5 px-3 text-sm text-gray-600 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-colors"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        {sector.name}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    <Link href="/#pricing" className="py-3 px-3 text-base font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors" onClick={() => setMobileMenuOpen(false)}>
                        Paketler
                    </Link>
                    <Link href="/#faq" className="py-3 px-3 text-base font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors" onClick={() => setMobileMenuOpen(false)}>
                        SSS
                    </Link>
                    <Link href="/#solutions" className="py-3 px-3 text-base font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors" onClick={() => setMobileMenuOpen(false)}>
                        Çözümlerimiz
                    </Link>
                    <Link href="/blog" className="py-3 px-3 text-base font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors" onClick={() => setMobileMenuOpen(false)}>
                        Blog
                    </Link>
                    <Link href="/#contact" className="py-3 px-3 text-base font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors" onClick={() => setMobileMenuOpen(false)}>
                        İletişim
                    </Link>

                    {/* Mobile Login Button */}
                    <div className="pt-4 px-3">
                        <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                            <Button className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white shadow-lg rounded-full px-6 py-3 transition-colors text-base font-semibold">
                                İşletme Girişi
                            </Button>
                        </Link>
                    </div>
                </nav>
            </div>
        )}
        </>
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
                                    <a href="tel:+902122837175" className="hover:text-primary transition-colors inline-block">
                                        0212 283 71 75
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
