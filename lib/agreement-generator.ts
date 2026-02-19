
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
        priceUsd: number; // KDV hariç USD
    },
    exchangeRate: number;
    date: string;
};

export function getDistanceSalesAgreementHtml(data: AgreementData): string {
    return `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>Mesafeli Satış Sözleşmesi</title>
    <style>
        body { font-family: 'Times New Roman', Times, serif; font-size: 12px; line-height: 1.5; color: #000; margin: 0; padding: 20px; }
        h1 { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 20px; }
        h3 { font-size: 14px; font-weight: bold; margin-top: 15px; margin-bottom: 10px; }
        p { margin-bottom: 10px; text-align: justify; }
        ul { margin-bottom: 10px; padding-left: 20px; }
        li { margin-bottom: 5px; }
        strong { font-weight: bold; }
        .section { margin-bottom: 20px; }
        .buyer-info { margin-bottom: 15px; border: 1px solid #ccc; padding: 10px; }
    </style>
</head>
<body>
    <h1>MESAFELİ SATIŞ SÖZLEŞMESİ</h1>
    <p><strong>Sürüm/Tarih:</strong> v1.2 – [${data.date}]</p>
    <p><strong>Platform (UppyPro):</strong> www.upgunai.com (alt alan adları dahil)</p>
    <p><strong>İletişim:</strong> info@upgunai.com</p>

    <h3>1. Taraflar</h3>
    <p>İşbu Mesafeli Satış Sözleşmesi (“Sözleşme”);</p>

    <p><strong>Satıcı / Hizmet Sağlayıcı:</strong><br />
    UPGUN AI UPGUN PRODÜKSİYON TEKSTİL PAZARLAMA SANAYİ VE TİCARET LİMİTED ŞİRKETİ (“UPGUN AI”)<br />
    Adres: UPGUN AI - Office İstanbul, Nisbetiye Mh. Gazi Güçnar Sk. No: 4, Zincirlikuyu, Beşiktaş, İstanbul<br />
    E-posta: info@upgunai.com</p>

    <p>ile Platform üzerinden abonelik satın alan <strong>${data.buyer.name}</strong> (“Alıcı/Kullanıcı”) arasında elektronik ortamda kurulmuştur.</p>
    
    <div class="buyer-info">
        <p><strong>Alıcı Adresi:</strong> ${data.buyer.address} ${data.buyer.district}/${data.buyer.city}<br />
        <strong>Alıcı Telefonu:</strong> ${data.buyer.phone}<br />
        <strong>Alıcı E-postası:</strong> ${data.buyer.email}
        ${data.buyer.taxNumber ? `<br /><strong>Vergi Dairesi:</strong> ${data.buyer.taxOffice}<br /><strong>Vergi Numarası:</strong> ${data.buyer.taxNumber}` : ''}
        ${data.buyer.tckn ? `<br /><strong>TC Kimlik No:</strong> ${data.buyer.tckn}` : ''}
        </p>
    </div>

    <h3>2. Tanımlar</h3>
    <p><strong>Platform:</strong> UPGUN AI tarafından sunulan web tabanlı uygulama.</p>
    <p><strong>Hizmet(ler):</strong> Platform’daki mesaj yönetimi, entegrasyonlar, AI özellikleri, raporlar ve benzeri modüller.</p>
    <p><strong>Abonelik / Paket:</strong> Hizmetlerin aylık dönemlerle sunulduğu plan(lar).</p>
    <p><strong>Ödeme Altyapısı:</strong> iyzico ve/veya UPGUN AI’nın belirlediği diğer altyapılar.</p>

    <h3>3. Sözleşmenin Konusu</h3>
    <p>Sözleşme’nin konusu; Alıcı’nın seçtiği <strong>${data.plan.name}</strong> paketi kapsamında dijital hizmet aboneliğinin ifası ve bunun karşılığında abonelik bedelinin tahsili ile tarafların hak ve yükümlülüklerinin düzenlenmesidir.</p>

    <h3>4. Hizmetin İfası</h3>
    <p>4.1. Hizmet dijital olarak sunulur. Ödeme tamamlandıktan sonra abonelik Alıcı hesabına tanımlanır.</p>
    <p>4.2. Hizmetin kapsamı, satın alma anında seçilen pakete göre belirlenir.</p>

    <h3>5. Fiyatlandırma ve Ödeme</h3>
    <p>5.1. Alıcı, ödeme adımına geçmeden önce gösterilen toplam bedeli onayladığını kabul eder.</p>
    <p>5.2. Hizmet bedeli <strong>${data.plan.priceUsd.toFixed(2)} USD/Ay + KDV</strong> olarak belirlenmiştir. Tahsilat, işlem anındaki Türkiye Cumhuriyet Merkez Bankası (TCMB) Efektif Satış kuru üzerinden Türk Lirası'na (TL) çevrilerek yapılır.</p>
    <p>5.3. İşbu sözleşmenin kurulduğu tarih itibarıyla <strong>1 USD = ${data.exchangeRate.toFixed(4)} TL</strong> kabul edilerek ilk dönem tahsilatı gerçekleştirilir.</p>
    <p><strong>İlk Dönem Paket Bedeli (KDV Hariç):</strong> ${data.plan.price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL</p>
    <p><strong>İlk Dönem Tahsil Edilecek Tutar (KDV Dahil):</strong> ${data.plan.total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL</p>

    <h3>6. Ödeme, Aylık Otomatik Yenileme ve Tahsilat</h3>
    <p>6.1. Ödeme iyzico güvencesi ile (veya seçilen altyapı) üzerinden alınır.</p>
    <p>6.2. <strong>Aylık Otomatik Yenileme:</strong> Abonelik, Alıcı iptal edene kadar her ay otomatik yenilenir.</p>
    <p>6.3. <strong>Yenileme Dönemlerinde Fiyatlandırma:</strong> Sonraki aylarda yapılacak tahsilatlarda, paket bedeli olan <strong>${data.plan.priceUsd.toFixed(2)} USD</strong> (artı yürürlükteki KDV oranı), ilgili yenileme günündeki güncel TCMB Döviz Satış kuru üzerinden TL'ye çevrilerek tahsil edilir. Alıcı, kur değişimlerinden kaynaklanabilecek fiyat farkını peşinen kabul eder.</p>

    <h3>7. Kurumsal Paket / Özel Abonelik Linki ile Satın Alma</h3>
    <p>7.1. Kurumsal paketlerde ücret, UPGUN AI tarafından Alıcı’ya özel olarak belirlenebilir ve Alıcı’ya e-posta ile “abonelik linki” gönderilebilir.</p>
    <p>7.2. Bu link üzerinden Alıcı’ya; paket adı, dönem (aylık), ücret (USD/KDV hariç gösterim olabilir), ödeme anında uygulanacak TL’ye dönüşüm ve KDV dahil toplam tahsilat tutarı gösterilir ve onay alınır.</p>
    <p>7.3. Linkin güvenliği ve yetkisiz kişilerce paylaşılmaması Alıcı’nın sorumluluğundadır. UPGUN AI, makul şüphe halinde ek doğrulama isteyebilir.</p>
    <p>7.4. Alıcı, linkte belirtilen teklif şartlarını onaylayıp ödemeyi tamamladığında abonelik başlar.</p>

    <h3>8. Faturalandırma</h3>
    <p>8.1. Ödeme sonrasında UPGUN AI, e-arşiv faturayı düzenleyerek en geç 3 (üç) iş günü içinde Alıcı’ya iletir (e-posta ve/veya Platform üzerinden).</p>
    <p>8.2. Alıcı fatura bilgilerini doğru girmekle yükümlüdür.</p>

    <h3>9. İptal, Dönem Sonu ve İade</h3>
    <p>9.1. Alıcı aboneliğini Platform üzerinden iptal edebilir. İptal, bir sonraki dönem yenilenmemesi sonucunu doğurur.</p>
    <p>9.2. Alıcı, iptal etse dahi son ödeme yaptığı dönemin sonuna kadar hizmeti kullanabilir.</p>
    <p>9.3. İade Politikası: Abonelik iptalinde kural olarak iade yapılmaz. (Mevzuattan doğan zorunlu haller saklıdır.)</p>

    <h3>10. Cayma Hakkı (Dijital Hizmet)</h3>
    <p>10.1. Alıcı, mevzuat kapsamındaki şartlara göre 14 gün içinde cayma hakkına sahip olabilir.</p>
    <p>10.2. Dijital hizmetlerde; Alıcı’nın açık onayıyla ifaya başlanması ve cayma hakkı konusunda bilgilendirme yapılması halinde mevzuattaki istisnalar uygulanabilir.</p>

    <h3>11. Genel Hükümler</h3>
    <p>İşbu sözleşme elektronik ortamda Alıcı tarafından onaylanmakla yürürlüğe girmiştir.</p>
</body>
</html>
    `;
}
