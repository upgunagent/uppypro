"use client";

import { LandingHeader, LandingFooter } from "@/components/landing/layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-orange-100 selection:text-orange-900">
            <LandingHeader />
            <main className="container mx-auto px-4 py-12">
                <div className="mb-8">
                    <Link href="/">
                        <Button variant="ghost" className="gap-2 text-slate-600 hover:text-slate-900">
                            <ArrowLeft className="w-4 h-4" />
                            Ana Sayfaya Dön
                        </Button>
                    </Link>
                </div>

                <article className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-600 prose-li:text-slate-600 prose-strong:text-slate-800">
                    <h1 className="text-3xl md:text-4xl font-bold mb-8">GİZLİLİK POLİTİKASI (UPPYPRO / UPGUN AI)</h1>

                    <p><strong>Son Güncelleme:</strong> [09/01/2026]</p>

                    <p>
                        Bu Gizlilik Politikası, UPGUN AI’nın Platform (UppyPro) üzerinden sunduğu hizmetlerde kullanıcı gizliliğine ilişkin esasları açıklar. Kişisel verilerle ilgili detaylı hukuki bilgilendirme için ayrıca KVKK Aydınlatma Metni geçerlidir.
                    </p>

                    <hr className="my-8 border-slate-100" />

                    <h3>1. Topladığımız Bilgiler</h3>
                    <p>Platform kullanımı sırasında şu tür veriler işlenebilir:</p>
                    <ul>
                        <li>Hesap/üyelik bilgileri (ad-soyad, e-posta, şifrelenmiş kimlik doğrulama verileri)</li>
                        <li>Şirket/fatura bilgileri</li>
                        <li>Instagram/WhatsApp entegrasyon verileri ve mesajlaşma kayıtları</li>
                        <li>CRM alanına girilen müşteri kayıtları (Kullanıcı’nın kendi girdiği bilgiler)</li>
                        <li>Teknik veriler (log, IP, cihaz/oturum bilgileri)</li>
                    </ul>

                    <hr className="my-8 border-slate-100" />

                    <h3>2. Mesaj İçeriklerinin Saklanması (60 Gün)</h3>
                    <p>
                        Platform üzerinden gelen/giden mesaj içerikleri, hizmetin sunulması amacıyla 60 gün süreyle saklanır. Bu süre, platform içi operasyonel ihtiyaçlar ve hizmetin niteliği gereği belirlenmiştir. Süre sonunda mesaj içerikleri silinebilir/anonimleştirilebilir.
                    </p>

                    <hr className="my-8 border-slate-100" />

                    <h3>3. Üçüncü Taraf Hizmetler ve Entegrasyonlar</h3>
                    <p>Platform aşağıdaki hizmet sağlayıcılarla çalışabilir:</p>
                    <ul>
                        <li><strong>Meta (Instagram/WhatsApp):</strong> Mesajlaşma entegrasyonu</li>
                        <li><strong>Supabase:</strong> Veritabanı ve altyapı barındırma</li>
                        <li><strong>iyzico:</strong> Ödeme alma altyapısı (kart bilgileri UPGUN AI tarafından saklanmaz)</li>
                        <li><strong>Natro:</strong> E-posta altyapısı (hesap/abonelik bilgilendirmeleri gibi)</li>
                    </ul>
                    <p>Bu sağlayıcıların kendi gizlilik ve güvenlik politikaları da uygulanabilir.</p>

                    <hr className="my-8 border-slate-100" />

                    <h3>4. Ödeme Güvenliği</h3>
                    <p>
                        Ödeme işlemleri iyzico üzerinden yürütülür. Kredi kartı bilgileriniz UPGUN AI tarafından tutulmaz; ödeme sağlayıcısı altyapısı tarafından işlenir. Platform, yalnızca ödeme sonucu/durum bilgisi gibi sınırlı ödeme kayıtlarını tutabilir.
                    </p>

                    <hr className="my-8 border-slate-100" />

                    <h3>5. Bilgi Güvenliği</h3>
                    <p>
                        UPGUN AI; erişim kontrolü, yetkilendirme, şifreleme, loglama, ağ güvenliği ve benzeri teknik/idarî tedbirler ile verilerin güvenliğini sağlamayı hedefler. Buna rağmen internet tabanlı sistemlerin doğası gereği %100 güvenlik garanti edilemez.
                    </p>

                    <hr className="my-8 border-slate-100" />

                    <h3>6. Kullanıcının Sorumluluğu (CRM ve Müşteri Verileri)</h3>
                    <p>Platform üzerinde CRM alanına girilen müşteri verileri, Kullanıcı tarafından sağlanır. Kullanıcı;</p>
                    <ul>
                        <li>Kendi müşterilerine ait verileri hukuka uygun şekilde toplamak ve işlemekten,</li>
                        <li>Gerekli aydınlatma/izin süreçlerini yürütmekten</li>
                    </ul>
                    <p>sorumludur.</p>

                    <hr className="my-8 border-slate-100" />

                    <h3>7. Çerezler (Cookies)</h3>
                    <p>
                        Platform, kullanıcı deneyimini geliştirmek ve güvenliği sağlamak için çerezler ve benzeri teknolojiler kullanabilir. Zorunlu çerezler dışında kalan çerezler için ayrıca çerez tercih ekranı ve/veya çerez politikası sunulabilir.
                    </p>

                    <hr className="my-8 border-slate-100" />

                    <h3>8. E-Posta İletişimi</h3>
                    <p>
                        Hesap aktivasyonu, ödeme/abonelik bildirimleri ve güvenlik bildirimleri gibi operasyonel e-postalar Natro altyapısı üzerinden iletilebilir. Pazarlama amaçlı e-postalar için (varsa) ayrıca onay mekanizması uygulanır.
                    </p>

                    <hr className="my-8 border-slate-100" />

                    <h3>9. Politika Değişiklikleri</h3>
                    <p>
                        Bu politika zaman zaman güncellenebilir. Güncellemeler Platform’da yayımlandığı tarihte yürürlüğe girer.
                    </p>

                    <hr className="my-8 border-slate-100" />

                    <h3>10. İletişim</h3>
                    <p>
                        <strong>UPGUN AI UPGUN PRODÜKSİYON TEKSTİL PAZARLAMA SANAYİ VE TİCARET LİMİTED ŞİRKETİ</strong><br />
                        <strong>Adres:</strong> UPGUN AI - Office İstanbul, Nisbetiye Mh. Gazi Güçnar Sk. No: 4, Zincirlikuyu, Beşiktaş, İstanbul<br />
                        <strong>E-posta:</strong> <a href="mailto:info@upgunai.com">info@upgunai.com</a><br />
                        <strong>KEP:</strong> <a href="mailto:upgun@hs01.kep.tr">upgun@hs01.kep.tr</a>
                    </p>

                </article>

                <div className="mt-12 mb-8 pt-8 border-t border-slate-100">
                    <Link href="/">
                        <Button variant="outline" className="gap-2">
                            <ArrowLeft className="w-4 h-4" />
                            Ana Sayfaya Dön
                        </Button>
                    </Link>
                </div>
            </main>
            <LandingFooter />
        </div>
    );
}
