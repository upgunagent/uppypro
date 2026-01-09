"use client";

import { LandingHeader, LandingFooter } from "@/components/landing/layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function UserAgreementPage() {
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
                    <h1 className="text-3xl md:text-4xl font-bold mb-8">UPGUN AI – KULLANICI HİZMET SÖZLEŞMESİ (KULLANIM KOŞULLARI)</h1>

                    <p><strong>Sürüm/Tarih:</strong> v1.1 – [09/01/2026]</p>

                    <p>
                        <strong>Platform (UppyPro):</strong><br />
                        Test/önizleme ortamı: <a href="https://uppypro.vercel.app/" target="_blank" rel="noopener noreferrer">https://uppypro.vercel.app/</a><br />
                        Canlı yayında: <a href="http://www.upgunai.com" target="_blank" rel="noopener noreferrer">www.upgunai.com</a> alan adı üzerinden Platform’a yönlendirme yapılabilir.<br />
                        (“Platform” tanımı her iki adresi ve bunların alt alan adlarını/kapsamını içerir.)<br />
                        <strong>İletişim:</strong> <a href="mailto:info@upgunai.com">info@upgunai.com</a>
                    </p>

                    <h3>1. Taraflar</h3>
                    <p>
                        İşbu Kullanıcı Hizmet Sözleşmesi (“Sözleşme”);<br />
                        <strong>Hizmet Sağlayıcı:</strong> UPGUN AI UPGUN PRODÜKSİYON TEKSTİL PAZARLAMA SANAYİ VE TİCARET LİMİTED ŞİRKETİ (“UPGUN AI”)<br />
                        <strong>Adres:</strong> UPGUN AI - Office İstanbul, Nisbetiye Mh. Gazi Güçnar Sk. No: 4, Zincirlikuyu, Beşiktaş, İstanbul<br />
                        <strong>E-posta:</strong> <a href="mailto:info@upgunai.com">info@upgunai.com</a>
                    </p>
                    <p>
                        ile Platform’a kayıt olan ve/veya Platform’u kullanan gerçek veya tüzel kişi (“Kullanıcı”) arasında akdedilmiştir.
                    </p>
                    <p>
                        Kullanıcı, Platform’a üye olarak, bir paket satın alarak veya hizmetleri kullanarak Sözleşme’yi okuduğunu, anladığını ve kabul ettiğini beyan eder.
                    </p>

                    <hr className="my-8 border-slate-100" />

                    <h3>2. Tanımlar</h3>
                    <ul>
                        <li><strong>Platform (UppyPro):</strong> UPGUN AI tarafından sunulan; Instagram/WhatsApp işletme mesajlarının tek panelde yönetimi ve buna bağlı özellikleri içeren web tabanlı uygulama (test ve canlı alan adları dahil).</li>
                        <li><strong>Hizmet(ler):</strong> Platform üzerinden sunulan tüm modüller, paneller, entegrasyonlar, raporlar, AI asistan özellikleri, kullanıcı/ekip yönetimi, mesaj yönetimi, CRM bileşenleri vb.</li>
                        <li><strong>Paket/Abonelik:</strong> UPGUN AI’nın dönemsel (genellikle aylık) ücret karşılığında sunduğu planlar.</li>
                        <li><strong>Entegrasyon/Üçüncü Taraf Hizmetleri:</strong> Meta (Instagram/WhatsApp) ve diğer üçüncü taraf sağlayıcıların API/servisleri.</li>
                        <li><strong>AI Asistan/Agent:</strong> Mesajlara yanıt üretmeye yardımcı olan yazılım bileşeni.</li>
                        <li><strong>İçerik:</strong> Kullanıcıların Platform’a girdiği/verdiği/veri tabanında oluşan tüm veri (müşteri bilgileri, mesajlar, dosyalar, notlar vb.).</li>
                    </ul>

                    <hr className="my-8 border-slate-100" />

                    <h3>3. Sözleşmenin Konusu ve Kapsamı</h3>
                    <p>
                        Sözleşme’nin konusu; UPGUN AI’nın Platform aracılığıyla sunduğu Hizmetlerin, Kullanıcı tarafından Sözleşme koşullarına uygun şekilde kullanılmasıdır. Hizmetler abonelik/paket modeliyle sunulur.
                    </p>

                    <hr className="my-8 border-slate-100" />

                    <h3>4. Üyelik ve Hesap Güvenliği</h3>
                    <p>4.1. Kullanıcı, üyelik sırasında verdiği bilgilerin doğru ve güncel olduğunu kabul eder.</p>
                    <p>4.2. Kullanıcı, hesabının/şifresinin gizliliğinden ve hesabı üzerinden yapılan işlemlerden sorumludur.</p>
                    <p>4.3. Yetkisiz kullanım şüphesi derhal <a href="mailto:info@upgunai.com">info@upgunai.com</a> adresine bildirilir.</p>

                    <hr className="my-8 border-slate-100" />

                    <h3>5. Hizmetin İşleyişi ve Üçüncü Taraf Entegrasyonları (Meta vb.)</h3>
                    <p>5.1. Platform, Instagram/WhatsApp gibi üçüncü taraf servislerle entegre çalışır. Bu servislerin kesintisi, API değişikliği, erişim kısıtlaması, hesap/işletme doğrulama gereklilikleri, politikalar ve limitler UPGUN AI kontrolü dışındadır.</p>
                    <p>5.2. Kullanıcı, üçüncü taraf servislerin kendi koşullarına (Meta Platform/Developer/Business politikaları dahil) uymakla yükümlüdür.</p>
                    <p>5.3. UPGUN AI, üçüncü taraf servislerdeki değişiklikler nedeniyle Hizmetleri güncelleyebilir, değiştirebilir veya bazı özellikleri devre dışı bırakabilir.</p>

                    <hr className="my-8 border-slate-100" />

                    <h3>6. Paketler, Ücretlendirme, Ödeme, Otomatik Yenileme ve Faturalandırma</h3>
                    <p>6.1. Paket kapsamı, ücretler, dönem (aylık/yıllık vb.) ve vergi (KDV) bilgileri satın alma ekranında ve/ya Platform’da belirtilir.</p>
                    <p>6.2. Abonelik, Kullanıcı iptal edene kadar otomatik olarak yenilenir. Kullanıcı, aboneliğini Platform üzerinden iptal edebilir.</p>
                    <p>6.3. Ödemeler, UPGUN AI’nın belirlediği ödeme altyapısı üzerinden alınabilir. Ödeme altyapısındaki üçüncü taraf kaynaklı kesinti/arıza halleri nedeniyle gecikmeler yaşanabilir.</p>
                    <p>6.4. Kullanıcı, fatura bilgilerini doğru girmekle yükümlüdür. Yanlış bilgi nedeniyle doğabilecek uyuşmazlıklardan Kullanıcı sorumludur.</p>
                    <p>6.5. Fatura Süreci: Ödeme sonrasında UPGUN AI, e-arşiv faturayı düzenleyerek en geç 3 (üç) iş günü içinde Kullanıcı’ya iletir (e-posta ve/veya Platform üzerinden).</p>
                    <p>6.6. UPGUN AI, mevzuat gereği gerekli gördüğü hallerde faturalandırma süreçlerini güncelleyebilir.</p>

                    <hr className="my-8 border-slate-100" />

                    <h3>7. İptal ve İade Politikası</h3>
                    <p>7.1. Abonelik iptalinde iade yapılmaz.</p>
                    <p>7.2. Kullanıcı aboneliğini iptal ettiğinde, en son ödeme yaptığı dönemin sonuna kadar Platform’u kullanmaya devam eder. Dönem sonunda abonelik yenilenmez ve erişim sona erdirilebilir.</p>
                    <p>7.3. Kampanya/indirim/ek hizmet paketlerinde ayrıca belirtilen özel koşullar geçerli olabilir.</p>

                    <hr className="my-8 border-slate-100" />

                    <h3>8. Kullanıcının Yükümlülükleri ve Yasaklı Kullanım</h3>
                    <p>Kullanıcı;</p>
                    <p>8.1. Platform’u hukuka, dürüstlük kurallarına ve üçüncü taraf politikalarına uygun kullanacağını,</p>
                    <p>8.2. Spam, dolandırıcılık, aldatıcı içerik, yasa dışı ürün/hizmet tanıtımı, nefret söylemi, taciz, kişisel verileri hukuka aykırı toplama/işleme gibi eylemlerde bulunmayacağını,</p>
                    <p>8.3. Platform’un güvenliğini zedeleyecek şekilde tersine mühendislik, izinsiz erişim, sömürü, kötüye kullanım girişimi yapmayacağını,</p>
                    <p>8.4. Platform’u UPGUN AI’nın itibarını zedeleyecek şekilde kullanmayacağını kabul eder.</p>
                    <p>UPGUN AI, ihlal şüphesinde hesabı askıya alabilir, erişimi kısıtlayabilir ve/veya Sözleşme’yi feshedebilir.</p>

                    <hr className="my-8 border-slate-100" />

                    <h3>9. AI Asistanına İlişkin Özel Hükümler</h3>
                    <p>9.1. AI Asistan, Kullanıcı’ya mesaj yanıtı üretme konusunda yardımcı olur; üretilen çıktılar tavsiye/yardım niteliğindedir. Nihai sorumluluk Kullanıcı’dadır.</p>
                    <p>9.2. AI yanıtlarının her zaman hatasız, güncel veya doğru olacağı garanti edilmez.</p>
                    <p>9.3. Kullanıcı, AI Asistanı devreye alıp almama, “devral/geri devret” gibi kontrolleri Platform ayarlarından yönetir.</p>
                    <p>9.4. AI Asistan özellikleri, paket kapsamına göre sınırlı olabilir. Bazı paketlerde AI yalnızca bilgi verme/yönlendirme amaçlı çalışır; e-posta gönderimi, randevu oluşturma, harici otomasyonlar vb. özellikler paket dışında kalabilir.</p>

                    <hr className="my-8 border-slate-100" />

                    <h3>10. İçerik, Veriler ve Sorumluluk</h3>
                    <p>10.1. Kullanıcı, Platform’a yüklediği veya Platform üzerinden işlediği tüm İçerik üzerinde gerekli haklara sahip olduğunu ve İçerik’in hukuka uygun olduğunu kabul eder.</p>
                    <p>10.2. Kullanıcı, üçüncü kişilere ait kişisel verileri Platform’a aktarıyorsa; bu aktarım/işleme için gerekli aydınlatma ve açık rıza/izin süreçlerini (gerekli olduğu ölçüde) tamamladığını kabul eder.</p>
                    <p>10.3. UPGUN AI, Hizmet’i sağlamak amacıyla İçerik’i teknik olarak işleyebilir. Kişisel verilerin işlenmesine ilişkin detaylar ayrıca yayımlanacak KVKK Aydınlatma Metni/Gizlilik Politikası’nda düzenlenir.</p>

                    <hr className="my-8 border-slate-100" />

                    <h3>11. Fikri Mülkiyet Hakları</h3>
                    <p>11.1. Platform’un yazılımı, arayüzü, tasarımı, markaları, alan adı, dokümantasyonu ve tüm bileşenleri UPGUN AI’ya aittir veya lisanslıdır.</p>
                    <p>11.2. Kullanıcı, Platform’u yalnızca Sözleşme kapsamında kullanma hakkına sahiptir; kopyalama, çoğaltma, tersine mühendislik, türev çalışma üretme yapamaz.</p>
                    <p>11.3. Kullanıcı verileri/İçerikleri kural olarak Kullanıcı’ya aittir. UPGUN AI, bu verileri yalnızca Hizmet’i sunmak ve yasal yükümlülükler kapsamında işleyebilir.</p>

                    <hr className="my-8 border-slate-100" />

                    <h3>12. Hizmet Seviyesi, Bakım ve Kesintiler</h3>
                    <p>12.1. UPGUN AI, Hizmet’i makul çaba ile erişilebilir kılmayı hedefler; planlı bakım, güncelleme, güvenlik, altyapı arızaları veya üçüncü taraf kesintileri nedeniyle hizmette kesinti yaşanabilir.</p>
                    <p>12.2. UPGUN AI, planlı kesintileri mümkün olduğunca önceden duyurmaya çalışır.</p>

                    <hr className="my-8 border-slate-100" />

                    <h3>13. Destek</h3>
                    <p>13.1. Destek kanalları ve kapsamı paketlere göre değişebilir. İletişim: <a href="mailto:info@upgunai.com">info@upgunai.com</a></p>
                    <p>13.2. UPGUN AI, destek taleplerine makul süre içinde dönüş yapmayı hedefler.</p>

                    <hr className="my-8 border-slate-100" />

                    <h3>14. Sözleşmenin Süresi, Askıya Alma ve Fesih</h3>
                    <p>14.1. Sözleşme, Kullanıcı’nın Platform’a üye olmasıyla yürürlüğe girer ve abonelik devam ettiği sürece geçerlidir.</p>
                    <p>14.2. Kullanıcı, aboneliğini iptal edebilir; iptal halinde 7. maddede belirtilen kullanım süresi uygulanır.</p>
                    <p>14.3. UPGUN AI, Sözleşme ihlali, hukuka aykırı kullanım, güvenlik riski veya üçüncü taraf politikalarının ihlali halinde hesabı askıya alabilir veya feshedebilir.</p>
                    <p>14.4. Fesih halinde, Kullanıcı’nın erişimi sonlandırılabilir; yasal saklama yükümlülükleri saklıdır.</p>

                    <hr className="my-8 border-slate-100" />

                    <h3>15. Sorumluluğun Sınırlandırılması</h3>
                    <p>15.1. UPGUN AI; dolaylı zararlar, kâr kaybı, itibar kaybı, veri kaybı, üçüncü taraf kesintileri, Kullanıcı’nın yanlış yapılandırması veya üçüncü taraf platformların (Meta vb.) hesap kısıtlamaları nedeniyle doğan zararlardan sorumlu değildir.</p>
                    <p>15.2. UPGUN AI’nın Sözleşme kapsamındaki toplam sorumluluğu (kasten veya ağır ihmal halleri hariç), zarar doğuran olaydan önceki son 1 (bir) ay içinde Kullanıcı’nın UPGUN AI’ya ödediği abonelik bedeli ile sınırlıdır.</p>
                    <p>15.3. AI Asistan çıktılarının doğruluğu garanti edilmez; Kullanıcı bu çıktılara dayanarak alınan kararlardan kendisinin sorumlu olduğunu kabul eder.</p>

                    <hr className="my-8 border-slate-100" />

                    <h3>16. Mücbir Sebep</h3>
                    <p>Doğal afet, savaş, grev, mevzuat değişikliği, siber saldırı, internet/altyapı kesintisi ve üçüncü taraf servis kesintileri dahil olmak üzere tarafların kontrolü dışında gelişen mücbir sebep hallerinde taraflar sorumlu tutulamaz.</p>

                    <hr className="my-8 border-slate-100" />

                    <h3>17. Değişiklikler</h3>
                    <p>UPGUN AI, Sözleşme’de değişiklik yapabilir. Güncel metin Platform’da yayımlandığı tarihten itibaren geçerli olur. Kullanıcı’nın Hizmet’i kullanmaya devam etmesi, değişiklikleri kabul ettiği anlamına gelir.</p>

                    <hr className="my-8 border-slate-100" />

                    <h3>18. Bildirimler</h3>
                    <p>Taraflar arasındaki bildirimler; Kullanıcı’nın kayıtlı e-posta adresi ve/veya Platform içi bildirimler üzerinden yapılabilir. UPGUN AI için resmi iletişim: <a href="mailto:info@upgunai.com">info@upgunai.com</a></p>

                    <hr className="my-8 border-slate-100" />

                    <h3>19. Uygulanacak Hukuk ve Yetkili Mahkeme</h3>
                    <p>Sözleşme Türkiye Cumhuriyeti kanunlarına tabidir. Uyuşmazlıklarda İstanbul (Çağlayan) Mahkemeleri ve İcra Daireleri yetkilidir. (Tüketici işlemi sayılan hallerde tüketicinin yasal hakları saklıdır.)</p>

                    <hr className="my-8 border-slate-100" />

                    <h3>20. Yürürlük</h3>
                    <p>İşbu Sözleşme, Kullanıcı tarafından elektronik ortamda onaylandığı anda yürürlüğe girer.</p>

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
