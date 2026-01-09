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
                    <h1 className="text-3xl md:text-4xl font-bold mb-8">Gizlilik Politikası / Gizlilik Bildirimi</h1>

                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-8 text-sm text-slate-500">
                        <p className="mb-0">
                            Bu gizlilik bildirimi, UPGUN AI tarafından toplanan kişisel veriler hakkında, GDPR ve KVKK başta olmak üzere ilgili mevzuatın gerektirdiği şekilde bilgilendirme amacıyla hazırlanmıştır.
                        </p>
                    </div>

                    <h3>1. Veri Sorumlusu</h3>
                    <p>
                        UPGUN AI UPGUN PRODÜKSİYON TEKSTİL PAZARLAMA SANAYİ VE TİCARET LİMİTED ŞİRKETİ<br />
                        <strong>Adres:</strong> UPGUN AI - Office İstanbul, Nisbetiye Mh. Gazi Güçnar Sk. No: 4, Zincirlikuyu, Beşiktaş, İstanbul<br />
                        <strong>E-posta:</strong> info@upgunai.com
                    </p>

                    <hr className="my-8 border-slate-100" />

                    <h3>2. Topladığımız Bilgiler</h3>
                    <ul>
                        <li><strong>2.1. Temel Kimlik ve İletişim Bilgileri:</strong> Ad, soyad, şirket, pozisyon, adres, e-posta, telefon.</li>
                        <li><strong>2.2. Hesap ve Kullanım Bilgileri:</strong> Kullanıcı adı, şifre, erişim logları, kullanım istatistikleri.</li>
                        <li><strong>2.3. Hizmet Kapsamındaki İşlem ve İçerik Verileri:</strong> Yüklenen içerikler, otomasyon senaryoları, destek talepleri.</li>
                        <li><strong>2.4. Aday ve İnsan Kaynakları Verileri:</strong> Özgeçmiş, eğitim ve deneyim bilgileri.</li>
                        <li><strong>2.5. Teknik ve Çerez Verileri:</strong> IP adresi, tarayıcı tipi, trafik verileri.</li>
                    </ul>

                    <hr className="my-8 border-slate-100" />

                    <h3>3. Topladığımız Bilgileri Nasıl Kullanıyoruz?</h3>
                    <p>
                        Hizmet sunmak, projeleri yönetmek, güvenliği sağlamak, finansal süreçleri yürütmek, teknik destek sağlamak ve yasal gerekliliklere uymak amacıyla kullanılmaktadır.
                    </p>

                    <hr className="my-8 border-slate-100" />

                    <h3>4. Meşru Menfaat Kapsamında İşleme</h3>
                    <p>
                        Hizmet geliştirme, dolandırıcılığı önleme ve güvenlik gibi amaçlarla meşru menfaatler kapsamında veri işlenebilir.
                    </p>

                    <hr className="my-8 border-slate-100" />

                    <h3>5. Kişisel Verileri Nasıl İşliyor ve Koruyoruz?</h3>
                    <p>
                        Veri aktarımında şifreleme, güçlü kimlik doğrulama, güvenli ağ altyapısı ve personel eğitimleri ile korunmaktadır.
                    </p>

                    <hr className="my-8 border-slate-100" />

                    <h3>6. Verileri Ne Kadar Süre Saklıyoruz?</h3>
                    <p>
                        Toplanma amaçları doğrultusunda gerekli olan veya mevzuatta öngörülen zorunlu süreler boyunca saklanır.
                    </p>

                    <hr className="my-8 border-slate-100" />

                    <h3>7. Paylaştığımız Bilgiler</h3>
                    <p>
                        Verileriniz; tedarikçiler, iş ortakları, kamu kurumları ve kurumsal işlemler kapsamında yetkili kişilerle paylaşılabilir.
                    </p>

                    <hr className="my-8 border-slate-100" />

                    <h3>8. Veri Aktarımları (Yurt Dışı)</h3>
                    <p>
                        KVKK ve GDPR hükümlerine uygun olarak, gerekli güvenceler sağlanarak yurt dışına aktarım yapılabilir.
                    </p>

                    <hr className="my-8 border-slate-100" />

                    <h3>9. Veri Sahibi Olarak Haklarınız</h3>
                    <p>
                        Bilgi alma, düzeltme, silme, itiraz etme ve tazminat talep etme haklarınız bulunmaktadır.
                    </p>

                    <hr className="my-8 border-slate-100" />

                    <h3>10. Haklarınızı Nasıl Kullanabilirsiniz?</h3>
                    <p>
                        Taleplerinizi belirtilen fiziksel adrese veya <a href="mailto:info@upgunai.com" className="text-orange-600 hover:text-orange-700 font-medium">info@upgunai.com</a> adresine iletebilirsiniz.
                    </p>

                    <hr className="my-8 border-slate-100" />

                    <h3>11. Gizlilik Bildiriminde Yapılabilecek Değişiklikler</h3>
                    <p>
                        Mevzuat veya faaliyet değişikliklerine göre güncellenebilir.
                    </p>

                    <hr className="my-8 border-slate-100" />

                    <h3>12. Bize Nasıl Ulaşabilirsiniz?</h3>
                    <p>
                        <strong>Veri Gizliliği Sorumlusu:</strong> Hayri Özgür Topkan<br />
                        <strong>E-posta:</strong> info@upgunai.com
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
