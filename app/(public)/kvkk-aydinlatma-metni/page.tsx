"use client";

import { LandingHeader, LandingFooter } from "@/components/landing/layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function KVKKPage() {
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
                    <h1 className="text-3xl md:text-4xl font-bold mb-8">KVKK AYDINLATMA METNİ (UPPYPRO / UPGUN AI)</h1>

                    <p><strong>Son Güncelleme:</strong> [09/01/2026]</p>
                    <p>
                        <strong>Veri Sorumlusu:</strong> UPGUN AI UPGUN PRODÜKSİYON TEKSTİL PAZARLAMA SANAYİ VE TİCARET LİMİTED ŞİRKETİ (“UPGUN AI”)<br />
                        <strong>Adres:</strong> UPGUN AI - Office İstanbul, Nisbetiye Mh. Gazi Güçnar Sk. No: 4, Zincirlikuyu, Beşiktaş, İstanbul<br />
                        <strong>E-posta:</strong> <a href="mailto:info@upgunai.com">info@upgunai.com</a><br />
                        <strong>KEP:</strong> <a href="mailto:upgun@hs01.kep.tr">upgun@hs01.kep.tr</a>
                    </p>

                    <p>
                        Bu Aydınlatma Metni, UPGUN AI tarafından sunulan “UppyPro” Platformu (test ve canlı alan adları ve alt alan adları dahil) üzerinden yürütülen kişisel veri işleme faaliyetleri hakkında 6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) uyarınca hazırlanmıştır.
                    </p>

                    <hr className="my-8 border-slate-100" />

                    <h3>1. İşlenen Kişisel Veri Kategorileri</h3>
                    <p>Platform’u kullanmanız sırasında aşağıdaki veri kategorileri işlenebilir:</p>

                    <h4>A) Kimlik/İletişim Verileri</h4>
                    <ul>
                        <li>Ad, soyad</li>
                        <li>E-posta adresi, telefon (varsa)</li>
                        <li>Şirket unvanı, şirket iletişim bilgileri (iş hesabı bilgileri)</li>
                    </ul>

                    <h4>B) Müşteri/CRM Verileri (Kullanıcının kendi müşterilerine ilişkin)</h4>
                    <ul>
                        <li>Kullanıcı’nın Platform’a kaydettiği müşteri kayıtları ve notlar</li>
                        <li>Müşteri etiketleri, müşteri listeleri ve ilişkili işlem kayıtları</li>
                    </ul>

                    <h4>C) Mesajlaşma Verileri</h4>
                    <ul>
                        <li>Instagram/WhatsApp işletme hesaplarına gelen/giden mesaj içerikleri</li>
                        <li>Mesaj meta verileri (tarih/saat, gönderici/alıcının platform içi kimlikleri vb.)</li>
                        <li>Sistem içi konuşma akışları ve destek kayıtları</li>
                    </ul>

                    <h4>D) Hesap/İşlem Güvenliği Verileri</h4>
                    <ul>
                        <li>IP adresi, cihaz/oturum bilgileri, log kayıtları</li>
                        <li>Yetkilendirme, doğrulama, güvenlik olay kayıtları</li>
                    </ul>

                    <h4>E) Finans/Ödeme Verileri</h4>
                    <ul>
                        <li>Abonelik planı, ödeme durum bilgileri, fatura bilgileri</li>
                        <li>Ödeme işlemlerine ilişkin kayıtlar (kart bilgileri UPGUN AI tarafından saklanmaz; ödeme altyapısı tarafından işlenir)</li>
                    </ul>

                    <hr className="my-8 border-slate-100" />

                    <h3>2. Kişisel Verilerin İşlenme Amaçları</h3>
                    <p>Kişisel verileriniz aşağıdaki amaçlarla işlenir:</p>
                    <ul>
                        <li>Üyelik oluşturma, hesabın yönetimi, kimlik doğrulama ve kullanıcı işlemlerinin yürütülmesi</li>
                        <li>Platform hizmetlerinin sunulması (tek panelden mesaj yönetimi, CRM alanı, raporlama vb.)</li>
                        <li>Instagram/WhatsApp entegrasyonlarının sağlanması ve mesaj akışının yönetimi</li>
                        <li>Abonelik/ödeme süreçlerinin yürütülmesi, faturalandırma ve muhasebe süreçleri</li>
                        <li>Talep/şikâyet yönetimi ve müşteri destek süreçleri</li>
                        <li>Bilgi güvenliği süreçleri, loglama, suistimal ve yetkisiz erişimin önlenmesi</li>
                        <li>İlgili mevzuattan kaynaklanan yükümlülüklerin yerine getirilmesi (hukuki taleplere yanıt, saklama yükümlülükleri vb.)</li>
                    </ul>

                    <hr className="my-8 border-slate-100" />

                    <h3>3. Kişisel Verilerin İşlenmesinin Hukuki Sebepleri</h3>
                    <p>KVKK m.5 ve ilgili düzenlemeler uyarınca;</p>
                    <ul>
                        <li>Sözleşmenin kurulması/ifası (Platform üyeliği ve hizmet sunumu)</li>
                        <li>Hukuki yükümlülüklerin yerine getirilmesi (fatura, mali kayıtlar, resmi talepler)</li>
                        <li>Veri sorumlusunun meşru menfaati (güvenlik, altyapı, dolandırıcılık önleme, hizmet kalitesi)</li>
                        <li>Gerekli hallerde açık rıza (ör. ticari elektronik ileti gönderimi, bazı çerezler, pazarlama)</li>
                    </ul>
                    <p>hukuki sebeplerine dayanılarak işlenebilir.</p>

                    <hr className="my-8 border-slate-100" />

                    <h3>4. Kişisel Verilerin Aktarılması (Alıcı Grupları)</h3>
                    <p>Kişisel verileriniz, amaçlarla sınırlı olarak ve gerekli güvenlik tedbirleri alınarak aşağıdaki alıcılara aktarılabilir:</p>
                    <ul>
                        <li><strong>Meta (Instagram / WhatsApp):</strong> Mesajlaşma entegrasyonlarının yürütülmesi amacıyla</li>
                        <li><strong>Supabase (Veritabanı/altyapı hizmeti):</strong> Platform verilerinin barındırılması ve işletilmesi amacıyla</li>
                        <li><strong>iyzico (Ödeme hizmet sağlayıcısı):</strong> Ödeme tahsilatı ve ödeme işlemlerinin yürütülmesi amacıyla</li>
                        <li><strong>Natro (E-posta sunucu/altyapısı):</strong> Platform bildirimleri ve hesap e-postalarının iletilmesi amacıyla</li>
                        <li><strong>Yetkili kamu kurum ve kuruluşları:</strong> Yasal zorunluluk halinde</li>
                    </ul>
                    <p>
                        <strong>Yurt dışına aktarım:</strong> Meta ve/veya altyapı sağlayıcıların veri merkezleri yurt dışında bulunabilir. Bu durumda aktarım, KVKK’nın ilgili hükümleri ve Kurul düzenlemeleri çerçevesinde gerekli teknik/idarî tedbirler alınarak yapılır.
                    </p>

                    <hr className="my-8 border-slate-100" />

                    <h3>5. Saklama Süreleri</h3>
                    <ul>
                        <li><strong>Mesajlaşma verileri (Platform içi saklama):</strong> 60 gün saklanır. Süre sonunda sistemden silinebilir/anonim hale getirilebilir.</li>
                        <li><strong>Faturalandırma ve mali kayıtlar,</strong> ilgili mevzuatta öngörülen süreler boyunca saklanır.</li>
                        <li><strong>Güvenlik logları ve işlem kayıtları,</strong> amaçla sınırlı ve makul sürelerle saklanır.</li>
                    </ul>

                    <hr className="my-8 border-slate-100" />

                    <h3>6. Kişisel Verilerin Toplanma Yöntemi</h3>
                    <p>Kişisel verileriniz;</p>
                    <ul>
                        <li>Platform’a kayıt olurken ve kullanım sırasında elektronik ortamda,</li>
                        <li>Entegrasyonlar üzerinden (Meta API’leri gibi),</li>
                        <li>Destek talepleri ve iletişim kanalları üzerinden</li>
                    </ul>
                    <p>otomatik veya kısmen otomatik yollarla toplanır.</p>

                    <hr className="my-8 border-slate-100" />

                    <h3>7. KVKK Kapsamındaki Haklarınız (KVKK m.11)</h3>
                    <p>Kişisel verilerinize ilişkin olarak;</p>
                    <ul>
                        <li>İşlenip işlenmediğini öğrenme,</li>
                        <li>İşlenmişse bilgi talep etme,</li>
                        <li>Amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
                        <li>Yurt içi/yurt dışı aktarılan üçüncü kişileri bilme,</li>
                        <li>Eksik/yanlış işlenmişse düzeltilmesini isteme,</li>
                        <li>Kanuni şartlar çerçevesinde silinmesini/yok edilmesini isteme,</li>
                        <li>Bu işlemlerin aktarılan üçüncü kişilere bildirilmesini isteme,</li>
                        <li>Otomatik sistemler ile analiz sonucu aleyhe bir sonuca itiraz etme,</li>
                        <li>Zarara uğramanız halinde zararın giderilmesini talep etme</li>
                    </ul>
                    <p>haklarına sahipsiniz.</p>

                    <hr className="my-8 border-slate-100" />

                    <h3>8. Başvuru Yöntemi</h3>
                    <p>Haklarınıza ilişkin taleplerinizi, KVKK’ya uygun şekilde:</p>
                    <ul>
                        <li><strong>E-posta:</strong> <a href="mailto:info@upgunai.com">info@upgunai.com</a></li>
                        <li><strong>KEP:</strong> <a href="mailto:upgun@hs01.kep.tr">upgun@hs01.kep.tr</a></li>
                    </ul>
                    <p>kanallarından iletebilirsiniz.</p>

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
