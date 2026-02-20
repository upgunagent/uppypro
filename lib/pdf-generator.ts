import path from 'path';
import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';

export type AgreementPdfData = {
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
    };
    plan: {
        name: string;
        price: number; // KDV hariç TL
        total: number; // KDV dahil TL
    };
    date: string;
};

/**
 * Generates an agreement PDF buffer using pdfmake (pure JS, no Puppeteer/Chromium).
 */
export async function generatePdfBuffer(data: AgreementPdfData): Promise<Buffer | null> {
    try {
        // Lazy-load pdfmake inside function to avoid Turbopack bundling issues
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const PdfPrinter = require('pdfmake');
        const pdfmakeDir = path.dirname(require.resolve('pdfmake/package.json'));
        const getFontPath = (f: string) => path.join(pdfmakeDir, 'fonts', 'Roboto', f);

        const fonts = {
            Roboto: {
                normal: getFontPath('Roboto-Regular.ttf'),
                bold: getFontPath('Roboto-Medium.ttf'),
                italics: getFontPath('Roboto-Italic.ttf'),
                bolditalics: getFontPath('Roboto-MediumItalic.ttf'),
            },
        };

        console.log('[PDF Generator] Font dir:', pdfmakeDir);
        const printer = new PdfPrinter(fonts);

        const priceTL = data.plan.price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const totalTL = data.plan.total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        // Build buyer info lines
        const buyerLines: Content[] = [
            { text: [{ text: 'Alıcı Adresi: ', bold: true }, `${data.buyer.address} ${data.buyer.district}/${data.buyer.city}`] },
            { text: [{ text: 'Alıcı Telefonu: ', bold: true }, data.buyer.phone] },
            { text: [{ text: 'Alıcı E-postası: ', bold: true }, data.buyer.email] },
        ];
        if (data.buyer.taxNumber) {
            buyerLines.push({ text: [{ text: 'Vergi Dairesi: ', bold: true }, data.buyer.taxOffice || ''] });
            buyerLines.push({ text: [{ text: 'Vergi Numarası: ', bold: true }, data.buyer.taxNumber] });
        }
        if (data.buyer.tckn) {
            buyerLines.push({ text: [{ text: 'TC Kimlik No: ', bold: true }, data.buyer.tckn] });
        }

        const docDefinition: TDocumentDefinitions = {
            pageSize: 'A4',
            pageMargins: [40, 40, 40, 40],
            defaultStyle: {
                font: 'Roboto',
                fontSize: 10,
                lineHeight: 1.4,
            },
            content: [
                { text: 'MESAFELİ SATIŞ SÖZLEŞMESİ', style: 'header' },
                { text: [{ text: 'Sürüm/Tarih: ', bold: true }, `v1.2 – [${data.date}]`], margin: [0, 0, 0, 4] },
                { text: [{ text: 'Platform (UppyPro): ', bold: true }, 'www.upgunai.com (alt alan adları dahil)'], margin: [0, 0, 0, 4] },
                { text: [{ text: 'İletişim: ', bold: true }, 'info@upgunai.com'], margin: [0, 0, 0, 10] },

                // 1. Taraflar
                { text: '1. Taraflar', style: 'sectionHeader' },
                { text: 'İşbu Mesafeli Satış Sözleşmesi ("Sözleşme");', margin: [0, 0, 0, 6] },
                {
                    text: [
                        { text: 'Satıcı / Hizmet Sağlayıcı:\n', bold: true },
                        'UPGUN AI UPGUN PRODÜKSİYON TEKSTİL PAZARLAMA SANAYİ VE TİCARET LİMİTED ŞİRKETİ ("UPGUN AI")\n',
                        'Adres: UPGUN AI - Office İstanbul, Nisbetiye Mh. Gazi Güçnar Sk. No: 4, Zincirlikuyu, Beşiktaş, İstanbul\n',
                        'E-posta: info@upgunai.com',
                    ],
                    margin: [0, 0, 0, 6],
                },
                {
                    text: [
                        'ile Platform üzerinden abonelik satın alan ',
                        { text: data.buyer.name, bold: true },
                        ' ("Alıcı/Kullanıcı") arasında elektronik ortamda kurulmuştur.',
                    ],
                    margin: [0, 0, 0, 6],
                },
                // Buyer info box
                {
                    table: {
                        widths: ['*'],
                        body: [[{ stack: buyerLines, margin: [6, 6, 6, 6] }]],
                    },
                    layout: {
                        hLineColor: () => '#cccccc',
                        vLineColor: () => '#cccccc',
                    },
                    margin: [0, 0, 0, 12],
                },

                // 2. Tanımlar
                { text: '2. Tanımlar', style: 'sectionHeader' },
                { text: [{ text: 'Platform: ', bold: true }, 'UPGUN AI tarafından sunulan web tabanlı uygulama.'], margin: [0, 0, 0, 4] },
                { text: [{ text: 'Hizmet(ler): ', bold: true }, 'Platform\'daki mesaj yönetimi, entegrasyonlar, AI özellikleri, raporlar ve benzeri modüller.'], margin: [0, 0, 0, 4] },
                { text: [{ text: 'Abonelik / Paket: ', bold: true }, 'Hizmetlerin aylık dönemlerle sunulduğu plan(lar).'], margin: [0, 0, 0, 4] },
                { text: [{ text: 'Ödeme Altyapısı: ', bold: true }, 'iyzico ve/veya UPGUN AI\'nın belirlediği diğer altyapılar.'], margin: [0, 0, 0, 10] },

                // 3. Sözleşmenin Konusu
                { text: '3. Sözleşmenin Konusu', style: 'sectionHeader' },
                {
                    text: [
                        'Sözleşme\'nin konusu; Alıcı\'nın seçtiği ',
                        { text: data.plan.name, bold: true },
                        ' paketi kapsamında dijital hizmet aboneliğinin ifası ve bunun karşılığında abonelik bedelinin tahsili ile tarafların hak ve yükümlülüklerinin düzenlenmesidir.',
                    ],
                    margin: [0, 0, 0, 10],
                },

                // 4. Hizmetin İfası
                { text: '4. Hizmetin İfası', style: 'sectionHeader' },
                { text: '4.1. Hizmet dijital olarak sunulur. Ödeme tamamlandıktan sonra abonelik Alıcı hesabına tanımlanır.', margin: [0, 0, 0, 4] },
                { text: '4.2. Hizmetin kapsamı, satın alma anında seçilen pakete göre belirlenir.', margin: [0, 0, 0, 10] },

                // 5. Fiyatlandırma ve Ödeme
                { text: '5. Fiyatlandırma ve Ödeme', style: 'sectionHeader' },
                { text: '5.1. Alıcı, ödeme adımına geçmeden önce gösterilen toplam bedeli onayladığını kabul eder.', margin: [0, 0, 0, 4] },
                { text: ['5.2. Hizmet bedeli ', { text: `${priceTL} TL/Ay + KDV`, bold: true }, ' olarak belirlenmiştir.'], margin: [0, 0, 0, 4] },
                { text: [{ text: '5.3. İlk Dönem Tahsil Edilecek Toplam Tutar (KDV Dahil): ', bold: true }, `${totalTL} TL`], margin: [0, 0, 0, 10] },

                // 6. Ödeme, Aylık Otomatik Yenileme ve Tahsilat
                { text: '6. Ödeme, Aylık Otomatik Yenileme ve Tahsilat', style: 'sectionHeader' },
                { text: '6.1. Ödeme iyzico güvencesi ile (veya seçilen altyapı) üzerinden alınır.', margin: [0, 0, 0, 4] },
                { text: [{ text: '6.2. Aylık Otomatik Yenileme: ', bold: true }, 'Abonelik, Alıcı iptal edene kadar her ay otomatik yenilenir.'], margin: [0, 0, 0, 4] },
                { text: [{ text: '6.3. Yenileme Dönemlerinde Fiyatlandırma: ', bold: true }, 'Sonraki aylarda yapılacak yenilemelerde tahsilatlar, ilgili dönemdeki geçerli TL paket bedeli (artı yürürlükteki KDV oranı) üzerinden gerçekleştirilir.'], margin: [0, 0, 0, 10] },

                // 7. Kurumsal Paket
                { text: '7. Kurumsal Paket / Özel Abonelik Linki ile Satın Alma', style: 'sectionHeader' },
                { text: '7.1. Kurumsal paketlerde ücret, UPGUN AI tarafından Alıcı\'ya özel olarak belirlenebilir ve Alıcı\'ya e-posta ile "abonelik linki" gönderilebilir.', margin: [0, 0, 0, 4] },
                { text: '7.2. Bu link üzerinden Alıcı\'ya; paket adı, periyot, ücret ve KDV dahil toplam tahsilat tutarı gösterilir ve onay alınır.', margin: [0, 0, 0, 4] },
                { text: '7.3. Linkin güvenliği ve yetkisiz kişilerce paylaşılmaması Alıcı\'nın sorumluluğundadır. UPGUN AI, makul şüphe halinde ek doğrulama isteyebilir.', margin: [0, 0, 0, 4] },
                { text: '7.4. Alıcı, linkte belirtilen teklif şartlarını onaylayıp ödemeyi tamamladığında abonelik başlar.', margin: [0, 0, 0, 10] },

                // 8. Faturalandırma
                { text: '8. Faturalandırma', style: 'sectionHeader' },
                { text: '8.1. Ödeme sonrasında UPGUN AI, e-arşiv faturayı düzenleyerek en geç 3 (üç) iş günü içinde Alıcı\'ya iletir (e-posta ve/veya Platform üzerinden).', margin: [0, 0, 0, 4] },
                { text: '8.2. Alıcı fatura bilgilerini doğru girmekle yükümlüdür.', margin: [0, 0, 0, 10] },

                // 9. İptal
                { text: '9. İptal, Dönem Sonu ve İade', style: 'sectionHeader' },
                { text: '9.1. Alıcı aboneliğini Platform üzerinden iptal edebilir. İptal, bir sonraki dönem yenilenmemesi sonucunu doğurur.', margin: [0, 0, 0, 4] },
                { text: '9.2. Alıcı, iptal etse dahi son ödeme yaptığı dönemin sonuna kadar hizmeti kullanabilir.', margin: [0, 0, 0, 4] },
                { text: '9.3. İade Politikası: Abonelik iptalinde kural olarak iade yapılmaz. (Mevzuattan doğan zorunlu haller saklıdır.)', margin: [0, 0, 0, 10] },

                // 10. Cayma Hakkı
                { text: '10. Cayma Hakkı (Dijital Hizmet)', style: 'sectionHeader' },
                { text: '10.1. Alıcı, mevzuat kapsamındaki şartlara göre 14 gün içinde cayma hakkına sahip olabilir.', margin: [0, 0, 0, 4] },
                { text: '10.2. Dijital hizmetlerde; Alıcı\'nın açık onayıyla ifaya başlanması ve cayma hakkı konusunda bilgilendirme yapılması halinde mevzuattaki istisnalar uygulanabilir.', margin: [0, 0, 0, 10] },

                // 11. Genel Hükümler
                { text: '11. Genel Hükümler', style: 'sectionHeader' },
                { text: 'İşbu sözleşme elektronik ortamda Alıcı tarafından onaylanmakla yürürlüğe girmiştir.', margin: [0, 0, 0, 10] },
            ],
            styles: {
                header: {
                    fontSize: 14,
                    bold: true,
                    alignment: 'center' as const,
                    margin: [0, 0, 0, 16] as [number, number, number, number],
                },
                sectionHeader: {
                    fontSize: 11,
                    bold: true,
                    margin: [0, 8, 0, 6] as [number, number, number, number],
                },
            },
        };

        const pdfDoc = printer.createPdfKitDocument(docDefinition);

        return new Promise<Buffer>((resolve, reject) => {
            const chunks: Uint8Array[] = [];
            pdfDoc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
            pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
            pdfDoc.on('error', (err: Error) => reject(err));
            pdfDoc.end();
        });
    } catch (error) {
        console.error('[PDF Generator] Error (Non-Fatal):', error);
        return null;
    }
}
