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
                    <h1 className="text-3xl md:text-4xl font-bold mb-8">Kişisel Verilerin İşlenmesi Aydınlatma Metni</h1>

                    <p className="font-bold">UPGUN AI UPGUN PRODÜKSİYON TEKSTİL PAZARLAMA SANAYİ VE TİCARET LİMİTED ŞİRKETİ ("UPGUN AI")</p>

                    <p>
                        İşbu "Aydınlatma Metni" ile, 6698 sayılı Kişisel Verilerin Korunması Kanunu'nun ("KVKK") md. 10 uyarınca sizi; kişisel verilerinizin işlenmesi, aktarılması, toplanma yöntemi ve hukuki sebebi ile KVKK md. 11'de sayılan diğer haklarınız hususunda bilgilendirmek ve aydınlatmak isteriz.
                    </p>

                    <h3>1. Veri Sorumlusu Sıfatı</h3>
                    <p>
                        KVKK uyarınca UPGUN AI, "veri sorumlusu" sıfatıyla; kişisel verilerinizi aşağıda belirtilen amaçlar kapsamında, hukuka ve dürüstlük kurallarına uygun şekilde kaydedeceğini, saklayacağını, işleyeceğini, sınıflandıracağını, güncelleyeceğini ve KVKK ile ilgili mevzuatın müsaade ettiği ölçüde ve hallerde, işlendikleri amaca uygun olarak üçüncü kişilere açıklayıp aktarabileceğini bildirir.
                    </p>

                    <hr className="my-8 border-slate-100" />

                    <h3>2. Kişisel Verilerinizin İşlenme Amacı</h3>
                    <p>
                        Kişisel verileriniz, UPGUN AI tarafından sunulan yapay zeka, yazılım geliştirme, otomasyon, entegrasyon ve buna bağlı danışmanlık hizmetlerinden yararlanabilmeniz amacıyla; KVKK ve ilgili mevzuatta düzenlenen temel prensiplere uygun olarak işlenmektedir.
                    </p>
                    <p>Bu kapsamda kişisel verileriniz:</p>
                    <ul>
                        <li>Müşteri, tedarikçi ve iş ortaklığı ilişkilerinin kurulması ve yürütülmesi</li>
                        <li>Yapay zeka ve otomasyon projelerinin planlanması, geliştirilmesi, test edilmesi</li>
                        <li>Dijital platformlar, yazılımlar ve otomasyon sistemleri üzerinden hizmet sağlanması</li>
                        <li>Sözleşmesel ve ticari ilişkilere ilişkin süreçlerin yürütülmesi</li>
                        <li>Finans, muhasebe ve faturalama süreçlerinin yönetilmesi</li>
                        <li>Bilgi güvenliği süreçlerinin yürütülmesi ve erişim yetkilerinin yönetilmesi</li>
                        <li>Talep ve şikâyetlerinizin alınması, değerlendirilmesi ve sonuçlandırılması</li>
                        <li>Pazarlama, tanıtım ve bilgilendirme çalışmalarının gerçekleştirilmesi (açık rıza ile)</li>
                        <li>Hukuki süreçlerin takibi ve mevzuattan doğan yükümlülüklerin yerine getirilmesi</li>
                    </ul>
                    <p>amaçlarıyla; işlenme amacına uygun süre zarfında, fiziksel ve elektronik ortamda güvenli bir biçimde saklanmaktadır.</p>

                    <hr className="my-8 border-slate-100" />

                    <h3>3. Kişisel Verilerinizin Toplanma Yöntemi ve Hukuki Sebebi</h3>
                    <p>Kişisel verileriniz, UPGUN AI tarafından aşağıda belirtilen kanallar vasıtasıyla toplanmaktadır:</p>
                    <ul>
                        <li><strong>Tarafınızca doğrudan sağlanan kişisel veriler:</strong> Web sitemiz, iletişim formlarımız, çevrim içi platformlarımız, teklif ve sözleşme süreçleri, telefon, e-posta ve çevrim içi toplantı araçları.</li>
                        <li><strong>Üçüncü kişilerden toplanan kişisel veriler:</strong> İş ortaklarımız ve hizmet sağlayıcıları, entegrasyon sağladığımız platformlar, resmi kurum ve kuruluşlar.</li>
                        <li><strong>Çerezler ve benzeri teknolojiler:</strong> Web sitemiz ve dijital platformlarımızı ziyaretiniz sırasında, çerezler (cookies) vasıtasıyla kullanım alışkanlıklarınıza, tercihlerinize ve oturum bilgilerinize ilişkin veriler toplanabilmektedir.</li>
                    </ul>
                    <p>Kişisel verileriniz, KVKK md. 4/2'de öngörülen ilkeler ışığında:</p>
                    <ul>
                        <li>Açık rızanızın bulunduğu hallerde açık rızanıza dayanılarak,</li>
                        <li>KVKK md. 5/2 ve md. 6/3'te öngörülen durumların varlığı halinde açık rızanız aranmaksızın</li>
                    </ul>
                    <p>işlenebilmekte ve aktarılabilmektedir.</p>

                    <hr className="my-8 border-slate-100" />

                    <h3>4. Kişisel Verilerinizin Aktarılması</h3>
                    <p>
                        Şirketimiz, yukarıda sayılan işlenme amaçları kapsamında elde ettiği kişisel verilerinizi: grup şirketlerimiz, hissedarlarımız, iş ortaklarımız, çözüm ortaklarımız, teknoloji tedarikçilerimiz, müşterilerimiz, hukuk büroları ve yetkili kamu kurumları ile KVKK md. 8 ve md. 9'a uygun olarak paylaşabilecektir.
                    </p>

                    <hr className="my-8 border-slate-100" />

                    <h3>5. Yurt Dışına Kişisel Veri Aktarımı</h3>
                    <p>
                        Kişisel verileriniz, KVKK md. 9 uyarınca; yeterli korumaya sahip ülkelere veya yeterli korumanın taahhüt edildiği hallerde Kurul izniyle yurt dışına aktarılabilir.
                    </p>

                    <hr className="my-8 border-slate-100" />

                    <h3>6. KVKK Md. 11 Uyarınca Haklarınız</h3>
                    <p>
                        Kişisel veri sahibi olarak; verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, amacını öğrenme, aktarılan kişileri bilme, düzeltme isteme, silme/yok etme talep etme ve itiraz etme haklarına sahipsiniz.
                    </p>

                    <hr className="my-8 border-slate-100" />

                    <h3>7. Haklarınızı Kullanma ve Başvuru Yöntemi</h3>
                    <p>
                        Taleplerinizi yazılı olarak (Nisbetiye Mah. Gazi Güçnar Sk. Uygur İş Merkezi No: 4 İç Kapı No: 2 Beşiktaş/İstanbul) veya elektronik ortamda (upgun@hs01.kep.tr) iletebilirsiniz.
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
