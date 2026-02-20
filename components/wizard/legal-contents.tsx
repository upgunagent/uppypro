

import React from 'react';

// Types for Agreement Data
export type AgreementData = {
    buyer: {
        name: string;
        email: string;
        phone: string;
        address: string;
        city: string;
        district: string;
        taxOffice?: string;
        taxNumber?: string;
        tckn?: string;
    },
    plan: {
        name: string;
        price: number; // KDV hariç TL
        total: number; // KDV dahil TL
    },
    date: string;
};

export const DistanceSalesAgreement = ({ data }: { data: AgreementData }) => {
    return (
        <article className="prose prose-sm max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-600 prose-li:text-slate-600 prose-strong:text-slate-800">
            <h1 className="text-xl font-bold mb-4">MESAFELİ SATIŞ SÖZLEŞMESİ</h1>
            <p><strong>Sürüm/Tarih:</strong> v1.2 – [{data.date}]</p>
            <p><strong>Platform (UppyPro):</strong> www.upgunai.com (alt alan adları dahil)</p>
            <p><strong>İletişim:</strong> info@upgunai.com</p>

            <h3 className="font-bold text-lg">1. Taraflar</h3>
            <p>İşbu Mesafeli Satış Sözleşmesi (“Sözleşme”);</p>

            <p><strong>Satıcı / Hizmet Sağlayıcı:</strong><br />
                UPGUN AI UPGUN PRODÜKSİYON TEKSTİL PAZARLAMA SANAYİ VE TİCARET LİMİTED ŞİRKETİ (“UPGUN AI”)<br />
                Adres: UPGUN AI - Office İstanbul, Nisbetiye Mh. Gazi Güçnar Sk. No: 4, Zincirlikuyu, Beşiktaş, İstanbul<br />
                E-posta: info@upgunai.com</p>

            <p>ile Platform üzerinden abonelik satın alan <strong>{data.buyer.name}</strong> (“Alıcı/Kullanıcı”) arasında elektronik ortamda kurulmuştur.</p>
            <p><strong>Alıcı Adresi:</strong> {data.buyer.address} {data.buyer.district}/{data.buyer.city}<br />
                <strong>Alıcı Telefonu:</strong> {data.buyer.phone}<br />
                <strong>Alıcı E-postası:</strong> {data.buyer.email}
                {data.buyer.taxNumber && (
                    <>
                        <br /><strong>Vergi Dairesi:</strong> {data.buyer.taxOffice}
                        <br /><strong>Vergi Numarası:</strong> {data.buyer.taxNumber}
                    </>
                )}
                {data.buyer.tckn && (
                    <>
                        <br /><strong>TC Kimlik No:</strong> {data.buyer.tckn}
                    </>
                )}</p>

            <h3 className="font-bold text-lg">2. Tanımlar</h3>
            <p><strong>Platform:</strong> UPGUN AI tarafından sunulan web tabanlı uygulama.</p>
            <p><strong>Hizmet(ler):</strong> Platform’daki mesaj yönetimi, entegrasyonlar, AI özellikleri, raporlar ve benzeri modüller.</p>
            <p><strong>Abonelik / Paket:</strong> Hizmetlerin aylık dönemlerle sunulduğu plan(lar).</p>
            <p><strong>Ödeme Altyapısı:</strong> iyzico ve/veya UPGUN AI’nın belirlediği diğer altyapılar.</p>

            <h3 className="font-bold text-lg">3. Sözleşmenin Konusu</h3>
            <p>Sözleşme’nin konusu; Alıcı’nın seçtiği <strong>{data.plan.name}</strong> paketi kapsamında dijital hizmet aboneliğinin ifası ve bunun karşılığında abonelik bedelinin tahsili ile tarafların hak ve yükümlülüklerinin düzenlenmesidir.</p>

            <h3 className="font-bold text-lg">4. Hizmetin İfası</h3>
            <p>4.1. Hizmet dijital olarak sunulur. Ödeme tamamlandıktan sonra abonelik Alıcı hesabına tanımlanır.</p>
            <p>4.2. Hizmetin kapsamı, satın alma anında seçilen pakete göre belirlenir.</p>

            <h3 className="font-bold text-lg">5. Fiyatlandırma ve Ödeme</h3>
            <p>5.1. Alıcı, ödeme adımına geçmeden önce gösterilen toplam bedeli onayladığını kabul eder.</p>
            <p>5.2. Hizmet bedeli, seçilen pakete göre Türk Lirası (TL) cinsinden belirlenmiştir ve ödeme anında gösterilen tutar üzerinden tahsil edilir.</p>
            <p><strong>İlk Dönem Paket Bedeli (KDV Hariç):</strong> {data.plan.price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL</p>
            <p><strong>İlk Dönem Tahsil Edilecek Tutar (KDV Dahil):</strong> {data.plan.total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL</p>

            <h3 className="font-bold text-lg">6. Ödeme, Aylık Otomatik Yenileme ve Tahsilat</h3>
            <p>6.1. Ödeme iyzico güvencesi ile (veya seçilen altyapı) üzerinden alınır.</p>
            <p>6.2. <strong>Aylık Otomatik Yenileme:</strong> Abonelik, Alıcı iptal edene kadar her ay otomatik yenilenir.</p>
            <p>6.3. <strong>Yenileme Dönemlerinde Fiyatlandırma:</strong> Sonraki aylarda yapılacak tahsilatlarda, o dönemin güncel liste fiyatı üzerinden tahsilat yapılır. Fiyat değişiklikleri makul bir süre önceden Kullanıcı'ya bildirilir.</p>

            <h3 className="font-bold text-lg">7. Kurumsal Paket / Özel Abonelik Linki ile Satın Alma</h3>
            <p>7.1. Kurumsal paketlerde ücret, UPGUN AI tarafından Alıcı’ya özel olarak belirlenebilir ve Alıcı’ya e-posta ile “abonelik linki” gönderilebilir.</p>
            <p>7.2. Bu link üzerinden Alıcı’ya; paket adı, dönem (aylık), ücret ve KDV dahil toplam tahsilat tutarı gösterilir ve onay alınır.</p>
            <p>7.3. Linkin güvenliği ve yetkisiz kişilerce paylaşılmaması Alıcı’nın sorumluluğundadır. UPGUN AI, makul şüphe halinde ek doğrulama isteyebilir.</p>
            <p>7.4. Alıcı, linkte belirtilen teklif şartlarını onaylayıp ödemeyi tamamladığında abonelik başlar.</p>

            <h3 className="font-bold text-lg">8. Faturalandırma</h3>
            <p>8.1. Ödeme sonrasında UPGUN AI, e-arşiv faturayı düzenleyerek en geç 3 (üç) iş günü içinde Alıcı’ya iletir (e-posta ve/veya Platform üzerinden).</p>
            <p>8.2. Alıcı fatura bilgilerini doğru girmekle yükümlüdür.</p>

            <h3 className="font-bold text-lg">9. İptal, Dönem Sonu ve İade</h3>
            <p>9.1. Alıcı aboneliğini Platform üzerinden iptal edebilir. İptal, bir sonraki dönem yenilenmemesi sonucunu doğurur.</p>
            <p>9.2. Alıcı, iptal etse dahi son ödeme yaptığı dönemin sonuna kadar hizmeti kullanabilir.</p>
            <p>9.3. İade Politikası: Abonelik iptalinde kural olarak iade yapılmaz. (Mevzuattan doğan zorunlu haller saklıdır.)</p>

            <h3 className="font-bold text-lg">10. Cayma Hakkı (Dijital Hizmet)</h3>
            <p>10.1. Alıcı, mevzuat kapsamındaki şartlara göre 14 gün içinde cayma hakkına sahip olabilir.</p>
            <p>10.2. Dijital hizmetlerde; Alıcı’nın açık onayıyla ifaya başlanması ve cayma hakkı konusunda bilgilendirme yapılması halinde mevzuattaki istisnalar uygulanabilir.</p>

            <h3 className="font-bold text-lg">11. Genel Hükümler</h3>
            <p>İşbu sözleşme elektronik ortamda Alıcı tarafından onaylanmakla yürürlüğe girmiştir.</p>
        </article>
    );
};

export const PreliminaryInformationForm = ({ data }: { data: AgreementData }) => {
    return (
        <article className="prose prose-sm max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-600 prose-li:text-slate-600 prose-strong:text-slate-800">
            <h1 className="text-xl font-bold mb-4">ÖN BİLGİLENDİRME FORMU</h1>

            <h3 className="font-bold text-lg">1. Satıcı Bilgileri</h3>
            <p><strong>Unvan:</strong> UPGUN AI UPGUN PRODÜKSİYON TEKSTİL PAZARLAMA SANAYİ VE TİCARET LİMİTED ŞİRKETİ<br />
                <strong>Adres:</strong> UPGUN AI - Office İstanbul, Nisbetiye Mh. Gazi Güçnar Sk. No: 4, Zincirlikuyu, Beşiktaş, İstanbul<br />
                <strong>E-posta:</strong> info@upgunai.com</p>

            <h3 className="font-bold text-lg">2. Alıcı Bilgileri</h3>
            <p><strong>Ad Soyad:</strong> {data.buyer.name}<br />
                <strong>Telefon:</strong> {data.buyer.phone}<br />
                <strong>E-posta:</strong> {data.buyer.email}
                {data.buyer.taxNumber && (
                    <>
                        <br /><strong>Vergi Dairesi:</strong> {data.buyer.taxOffice}
                        <br /><strong>Vergi Numarası:</strong> {data.buyer.taxNumber}
                    </>
                )}
                {data.buyer.tckn && (
                    <>
                        <br /><strong>TC Kimlik No:</strong> {data.buyer.tckn}
                    </>
                )}
            </p>

            <h3 className="font-bold text-lg">3. Sözleşme Konusu Hizmetin Temel Nitelikleri ve Bedeli</h3>
            <p><strong>Hizmet Adı:</strong> {data.plan.name} (Aylık Abonelik)</p>
            <p><strong>Paket Bedeli:</strong> {data.plan.price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL + KDV / Ay</p>
            <p><strong>Tahsilat Para Birimi:</strong> Türk Lirası (TL)</p>
            <p><strong>Ödeme Yöntemi:</strong> Kredi Kartı ile Otomatik Yenileme</p>
            <p>
                <strong>Fiyatlandırma Politikası:</strong> Hizmet bedeli Türk Lirası (TL) cinsinden belirlenmiştir. İlk ödeme ve sonraki aylık yenilemelerde, ilgili dönemin güncel liste fiyatı üzerinden tahsilat yapılır.
            </p>
            <p><strong>İlk Dönem Toplam Tahsilat Tutarı:</strong> {data.plan.total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL</p>

            <h3 className="font-bold text-lg">4. Cayma Hakkı</h3>
            <p>Alıcı, 14 gün içinde cayma hakkına sahiptir. Ancak, dijital içeriklerin sunulmasına ilişkin sözleşmelerde, hizmetin ifasına başlanmışsa cayma hakkı kullanılamayabilir. Alıcı, satın alma işlemini tamamlayarak hizmetin ifasının hemen başlamasını talep ettiğini ve bu nedenle cayma hakkını kaybedebileceğini kabul eder.</p>

        </article>
    );
};


export const KvkkContent = () => {
    return (
        <article className="prose prose-sm max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-600 prose-li:text-slate-600 prose-strong:text-slate-800">
            <h1 className="text-xl font-bold mb-4">KVKK AYDINLATMA METNİ</h1>
            <p><strong>Son Güncelleme:</strong> [09/01/2026]</p>
            <p>
                <strong>Veri Sorumlusu:</strong> UPGUN AI UPGUN PRODÜKSİYON TEKSTİL PAZARLAMA SANAYİ VE TİCARET LİMİTED ŞİRKETİ (“UPGUN AI”)<br />
                <strong>Adres:</strong> UPGUN AI - Office İstanbul, Nisbetiye Mh. Gazi Güçnar Sk. No: 4, Zincirlikuyu, Beşiktaş, İstanbul<br />
                <strong>E-posta:</strong> info@upgunai.com<br />
                <strong>KEP:</strong> upgun@hs01.kep.tr
            </p>

            <p>
                Bu Aydınlatma Metni, UPGUN AI tarafından sunulan “UppyPro” Platformu (test ve canlı alan adları ve alt alan adları dahil) üzerinden yürütülen kişisel veri işleme faaliyetleri hakkında 6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) uyarınca hazırlanmıştır.
            </p>

            <hr className="my-4 border-slate-100" />

            <h3 className="font-bold text-lg">1. İşlenen Kişisel Veri Kategorileri</h3>
            <p>Platform’u kullanmanız sırasında aşağıdaki veri kategorileri işlenebilir:</p>

            <h4 className="font-bold">A) Kimlik/İletişim Verileri</h4>
            <ul className="list-disc pl-5">
                <li>Ad, soyad</li>
                <li>E-posta adresi, telefon (varsa)</li>
                <li>Şirket unvanı, şirket iletişim bilgileri (iş hesabı bilgileri)</li>
            </ul>

            <h4 className="font-bold mt-4">B) Müşteri/CRM Verileri (Kullanıcının kendi müşterilerine ilişkin)</h4>
            <ul className="list-disc pl-5">
                <li>Kullanıcı’nın Platform’a kaydettiği müşteri kayıtları ve notlar</li>
                <li>Müşteri etiketleri, müşteri listeleri ve ilişkili işlem kayıtları</li>
            </ul>

            <h4 className="font-bold mt-4">C) Mesajlaşma Verileri</h4>
            <ul className="list-disc pl-5">
                <li>Instagram/WhatsApp işletme hesaplarına gelen/giden mesaj içerikleri</li>
                <li>Mesaj meta verileri (tarih/saat, gönderici/alıcının platform içi kimlikleri vb.)</li>
                <li>Sistem içi konuşma akışları ve destek kayıtları</li>
            </ul>

            <h4 className="font-bold mt-4">D) Hesap/İşlem Güvenliği Verileri</h4>
            <ul className="list-disc pl-5">
                <li>IP adresi, cihaz/oturum bilgileri, log kayıtları</li>
                <li>Yetkilendirme, doğrulama, güvenlik olay kayıtları</li>
            </ul>

            <h4 className="font-bold mt-4">E) Finans/Ödeme Verileri</h4>
            <ul className="list-disc pl-5">
                <li>Abonelik planı, ödeme durum bilgileri, fatura bilgileri</li>
                <li>Ödeme işlemlerine ilişkin kayıtlar (kart bilgileri UPGUN AI tarafından saklanmaz; ödeme altyapısı tarafından işlenir)</li>
            </ul>

            <hr className="my-4 border-slate-100" />

            <h3 className="font-bold text-lg">2. Kişisel Verilerin İşlenme Amaçları</h3>
            <p>Kişisel verileriniz aşağıdaki amaçlarla işlenir:</p>
            <ul className="list-disc pl-5">
                <li>Üyelik oluşturma, hesabın yönetimi, kimlik doğrulama ve kullanıcı işlemlerinin yürütülmesi</li>
                <li>Platform hizmetlerinin sunulması (tek panelden mesaj yönetimi, CRM alanı, raporlama vb.)</li>
                <li>Instagram/WhatsApp entegrasyonlarının sağlanması ve mesaj akışının yönetimi</li>
                <li>Abonelik/ödeme süreçlerinin yürütülmesi, faturalandırma ve muhasebe süreçleri</li>
                <li>Talep/şikâyet yönetimi ve müşteri destek süreçleri</li>
                <li>Bilgi güvenliği süreçleri, loglama, suistimal ve yetkisiz erişimin önlenmesi</li>
                <li>İlgili mevzuattan kaynaklanan yükümlülüklerin yerine getirilmesi (hukuki taleplere yanıt, saklama yükümlülükleri vb.)</li>
            </ul>

            <hr className="my-4 border-slate-100" />

            <h3 className="font-bold text-lg">3. Kişisel Verilerin İşlenmesinin Hukuki Sebepleri</h3>
            <p>KVKK m.5 ve ilgili düzenlemeler uyarınca;</p>
            <ul className="list-disc pl-5">
                <li>Sözleşmenin kurulması/ifası (Platform üyeliği ve hizmet sunumu)</li>
                <li>Hukuki yükümlülüklerin yerine getirilmesi (fatura, mali kayıtlar, resmi talepler)</li>
                <li>Veri sorumlusunun meşru menfaati (güvenlik, altyapı, dolandırıcılık önleme, hizmet kalitesi)</li>
                <li>Gerekli hallerde açık rıza (ör. ticari elektronik ileti gönderimi, bazı çerezler, pazarlama)</li>
            </ul>
            <p>hukuki sebeplerine dayanılarak işlenebilir.</p>

            <hr className="my-4 border-slate-100" />

            <h3 className="font-bold text-lg">4. Kişisel Verilerin Aktarılması (Alıcı Grupları)</h3>
            <p>Kişisel verileriniz, amaçlarla sınırlı olarak ve gerekli güvenlik tedbirleri alınarak aşağıdaki alıcılara aktarılabilir:</p>
            <ul className="list-disc pl-5">
                <li><strong>Meta (Instagram / WhatsApp):</strong> Mesajlaşma entegrasyonlarının yürütülmesi amacıyla</li>
                <li><strong>Supabase (Veritabanı/altyapı hizmeti):</strong> Platform verilerinin barındırılması ve işletilmesi amacıyla</li>
                <li><strong>iyzico (Ödeme hizmet sağlayıcısı):</strong> Ödeme tahsilatı ve ödeme işlemlerinin yürütülmesi amacıyla</li>
                <li><strong>Natro (E-posta sunucu/altyapısı):</strong> Platform bildirimleri ve hesap e-postalarının iletilmesi amacıyla</li>
                <li><strong>Yetkili kamu kurum ve kuruluşları:</strong> Yasal zorunluluk halinde</li>
            </ul>
            <p>
                <strong>Yurt dışına aktarım:</strong> Meta ve/veya altyapı sağlayıcıların veri merkezleri yurt dışında bulunabilir. Bu durumda aktarım, KVKK’nın ilgili hükümleri ve Kurul düzenlemeleri çerçevesinde gerekli teknik/idarî tedbirler alınarak yapılır.
            </p>

            <hr className="my-4 border-slate-100" />

            <h3 className="font-bold text-lg">5. Saklama Süreleri</h3>
            <ul className="list-disc pl-5">
                <li><strong>Mesajlaşma verileri (Platform içi saklama):</strong> 60 gün saklanır. Süre sonunda sistemden silinebilir/anonim hale getirilebilir.</li>
                <li><strong>Faturalandırma ve mali kayıtlar,</strong> ilgili mevzuatta öngörülen süreler boyunca saklanır.</li>
                <li><strong>Güvenlik logları ve işlem kayıtları,</strong> amaçla sınırlı ve makul sürelerle saklanır.</li>
            </ul>

            <hr className="my-4 border-slate-100" />

            <h3 className="font-bold text-lg">6. Kişisel Verilerin Toplanma Yöntemi</h3>
            <p>Kişisel verileriniz;</p>
            <ul className="list-disc pl-5">
                <li>Platform’a kayıt olurken ve kullanım sırasında elektronik ortamda,</li>
                <li>Entegrasyonlar üzerinden (Meta API’leri gibi),</li>
                <li>Destek talepleri ve iletişim kanalları üzerinden</li>
            </ul>
            <p>otomatik veya kısmen otomatik yollarla toplanır.</p>

            <hr className="my-4 border-slate-100" />

            <h3 className="font-bold text-lg">7. KVKK Kapsamındaki Haklarınız (KVKK m.11)</h3>
            <p>Kişisel verilerinize ilişkin olarak;</p>
            <ul className="list-disc pl-5">
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

            <hr className="my-4 border-slate-100" />

            <h3 className="font-bold text-lg">8. Başvuru Yöntemi</h3>
            <p>Haklarınıza ilişkin taleplerinizi, KVKK’ya uygun şekilde:</p>
            <ul className="list-disc pl-5">
                <li><strong>E-posta:</strong> info@upgunai.com</li>
                <li><strong>KEP:</strong> upgun@hs01.kep.tr</li>
            </ul>
        </article>
    );
};

export const TermsContent = () => {
    return (
        <article className="prose prose-sm max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-600 prose-li:text-slate-600 prose-strong:text-slate-800">
            <h1 className="text-xl font-bold mb-4">KULLANICI HİZMET SÖZLEŞMESİ</h1>
            <p><strong>Sürüm/Tarih:</strong> v1.1 – [09/01/2026]</p>

            <p>
                <strong>Platform (UppyPro):</strong><br />
                Test/önizleme ortamı: https://uppypro.vercel.app/<br />
                Canlı yayında: www.upgunai.com<br />
                <strong>İletişim:</strong> info@upgunai.com
            </p>

            <h3 className="font-bold text-lg">1. Taraflar</h3>
            <p>
                İşbu Kullanıcı Hizmet Sözleşmesi (“Sözleşme”);<br />
                <strong>Hizmet Sağlayıcı:</strong> UPGUN AI UPGUN PRODÜKSİYON TEKSTİL PAZARLAMA SANAYİ VE TİCARET LİMİTED ŞİRKETİ (“UPGUN AI”)<br />
                <strong>Adres:</strong> UPGUN AI - Office İstanbul, Nisbetiye Mh. Gazi Güçnar Sk. No: 4, Zincirlikuyu, Beşiktaş, İstanbul<br />
                <strong>E-posta:</strong> info@upgunai.com
            </p>
            <p>
                ile Platform’a kayıt olan ve/veya Platform’u kullanan gerçek veya tüzel kişi (“Kullanıcı”) arasında akdedilmiştir.
            </p>
            <p>
                Kullanıcı, Platform’a üye olarak, bir paket satın alarak veya hizmetleri kullanarak Sözleşme’yi okuduğunu, anladığını ve kabul ettiğini beyan eder.
            </p>

            <hr className="my-4 border-slate-100" />

            <h3 className="font-bold text-lg">2. Tanımlar</h3>
            <ul className="list-disc pl-5">
                <li><strong>Platform (UppyPro):</strong> UPGUN AI tarafından sunulan; Instagram/WhatsApp işletme mesajlarının tek panelde yönetimi ve buna bağlı özellikleri içeren web tabanlı uygulama.</li>
                <li><strong>Hizmet(ler):</strong> Platform üzerinden sunulan tüm modüller, paneller, entegrasyonlar, raporlar, AI asistan özellikleri vb.</li>
                <li><strong>Paket/Abonelik:</strong> UPGUN AI’nın dönemsel ücret karşılığında sunduğu planlar.</li>
                <li><strong>Entegrasyon/Üçüncü Taraf Hizmetleri:</strong> Meta (Instagram/WhatsApp) ve diğer üçüncü taraf sağlayıcıların API/servisleri.</li>
            </ul>

            <hr className="my-4 border-slate-100" />

            <h3 className="font-bold text-lg">3. Sözleşmenin Konusu ve Kapsamı</h3>
            <p>
                Sözleşme’nin konusu; UPGUN AI’nın Platform aracılığıyla sunduğu Hizmetlerin, Kullanıcı tarafından Sözleşme koşullarına uygun şekilde kullanılmasıdır.
            </p>

            <hr className="my-4 border-slate-100" />

            <h3 className="font-bold text-lg">4. Üyelik ve Hesap Güvenliği</h3>
            <p>4.1. Kullanıcı, üyelik sırasında verdiği bilgilerin doğru ve güncel olduğunu kabul eder.</p>
            <p>4.2. Kullanıcı, hesabının/şifresinin gizliliğinden ve hesabı üzerinden yapılan işlemlerden sorumludur.</p>
            <p>4.3. Yetkisiz kullanım şüphesi derhal info@upgunai.com adresine bildirilir.</p>

            <hr className="my-4 border-slate-100" />

            <h3 className="font-bold text-lg">5. Hizmetin İşleyişi ve Entegrasyonlar</h3>
            <p>5.1. Platform, Instagram/WhatsApp gibi üçüncü taraf servislerle entegre çalışır. Bu servislerin kesintisi UPGUN AI kontrolü dışındadır.</p>
            <p>5.2. Kullanıcı, üçüncü taraf servislerin kendi koşullarına uymakla yükümlüdür.</p>

            <hr className="my-4 border-slate-100" />

            <h3 className="font-bold text-lg">6. Paketler ve Ücretlendirme</h3>
            <p>6.1. Paket kapsamı ve ücretler satın alma ekranında belirtilir.</p>
            <p>6.2. Abonelik, Kullanıcı iptal edene kadar otomatik olarak yenilenir.</p>
            <p>6.3. İptal ve iade koşulları Madde 7'de, diğer yükümlülükler ilgili maddelerde düzenlenmiştir.</p>

            <hr className="my-4 border-slate-100" />

            <h3 className="font-bold text-lg">7. İptal ve İade Politikası</h3>
            <p>7.1. Abonelik iptalinde iade yapılmaz.</p>
            <p>7.2. Kullanıcı aboneliğini iptal ettiğinde, en son ödeme yaptığı dönemin sonuna kadar Platform’u kullanmaya devam eder.</p>

            <h3 className="font-bold text-lg mt-4">8. Kullanıcının Yükümlülükleri</h3>
            <ul className="list-disc pl-5">
                <li>Platform’u hukuka uygun kullanacağını,</li>
                <li>Spam veya zararlı eylemlerde bulunmayacağını kabul eder.</li>
            </ul>

            <h3 className="font-bold text-lg mt-4">9. Diğer Hükümler</h3>
            <p>Fikri mülkiyet hakları UPGUN AI'ya aittir. Kullanıcı verileri gizlilik politikası çerçevesinde işlenir.</p>
            <p>Sözleşme Türkiye Cumhuriyeti kanunlarına tabidir. Uyuşmazlıklarda İstanbul Mahkemeleri yetkilidir.</p>
        </article>
    );
};
