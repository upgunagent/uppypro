"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Telefon numarasını WhatsApp formatına normalize eder (uluslararası, başında + olmadan)
// Desteklenen formatlar:
//   0533 207 6252   → 905332076252
//   +90 533 207 0000 → 905332070000
//   905332076252    → 905332076252  (zaten doğru)
//   533 207 6252    → 905332076252  (Türkiye varsayımı)
function normalizePhoneForWhatsApp(raw: string, defaultCountryCode = "90"): string {
    if (!raw) return "";
    // Sadece rakamları al
    let digits = raw.replace(/\D/g, "");

    if (!digits || digits.length < 7) return digits;

    // Zaten tam uluslararası format: 905XXXXXXXXX (12 rakam, Türkiye)
    if (digits.startsWith("90") && digits.length === 12) return digits;

    // 0 ile başlayan yerel format: 05332076252 → 905332076252
    if (digits.startsWith("0")) {
        digits = defaultCountryCode + digits.slice(1);
    }
    // 10 haneli (90'sız): 5332076252 → 905332076252
    else if (digits.length === 10 && digits.startsWith("5")) {
        digits = defaultCountryCode + digits;
    }

    return digits;
}

export async function createCampaign(data: {
    tenantId: string;
    campaignName: string;
    templateId: string;       // Meta template name (e.g. "hosgeldin_mesaji")
    templateName?: string;    // Human readable name
    templateLanguage?: string;
    audienceType: "customers" | "excel" | "saved_list";
    customerFilters?: any;
    excelData?: any[];
    savedListData?: any[];   // rows from a saved customer_list
    variableMappings: Record<string, { column: string, customValue: string }>;
    phoneColumn?: string;
}) {
    const supabase = await createClient();

    // Seçilen şablon bilgisini al (template_id artık şablon adı / meta ID)
    const templateName = data.templateName || data.templateId;
    const templateLanguage = data.templateLanguage || "tr";

    // 1. Kampanya kaydı oluştur
    const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
            tenant_id: data.tenantId,
            template_id: templateName,          // Artık text (şablon adı)
            template_name: templateName,
            template_language: templateLanguage,
            variable_mappings: data.variableMappings,
            name: data.campaignName || 'İsimsiz Kampanya',
            status: 'SCHEDULED',
            total_target: data.audienceType === 'excel' ? (data.excelData?.length || 0) : 0
        })
        .select()
        .single();

    if (campaignError) {
        console.error("Error creating campaign:", campaignError);
        return { success: false, error: campaignError.message };
    }

    let logsToInsert: any[] = [];

    // 2. Kitleyi hazırla
    if (data.audienceType === 'excel' && data.excelData) {
        logsToInsert = data.excelData.map((row: any) => {
            const rawPhone = String(
                row[data.phoneColumn || 'Phone'] ||
                row['phone'] ||
                row['Telefon'] ||
                row['telefon'] ||
                ''
            );
            const phoneNumber = normalizePhoneForWhatsApp(rawPhone);
            return {
                tenant_id: data.tenantId,
                campaign_id: campaign.id,
                phone_number: phoneNumber,
                row_metadata: row,  // Tüm satır verisi saklanıyor (değişken eşleştirme için)
                status: 'pending' as const,
            };
        }).filter(log => log.phone_number.length >= 10);

        await supabase.from('campaigns').update({ total_target: logsToInsert.length }).eq('id', campaign.id);

    } else if (data.audienceType === 'customers') {
        // Önce sadece temel alanlarla dene (segment/tags henüz DB'de olmayabilir)
        const { data: customers, error: customerError } = await supabase
            .from('customers')
            .select('id, phone, full_name')
            .eq('tenant_id', data.tenantId);

        if (customerError) {
            console.error("Customer fetch error:", customerError);
            return { success: false, error: `Müşteriler yüklenemedi: ${customerError.message}` };
        }

        if (!customers || customers.length === 0) {
            return { success: false, error: "Bu tenant'a ait kayıtlı müşteri bulunamadı." };
        }

        console.log(`Fetched ${customers.length} customers for tenant ${data.tenantId}`);

        logsToInsert = customers.map(c => {
            const normalized = normalizePhoneForWhatsApp(c.phone || '');
            console.log(`Customer ${c.full_name}: raw phone="${c.phone}" → normalized="${normalized}"`);
            return {
                tenant_id: data.tenantId,
                campaign_id: campaign.id,
                customer_id: c.id,
                phone_number: normalized,
                row_metadata: { name: c.full_name, full_name: c.full_name, phone: c.phone },
                status: 'pending' as const
            };
        }).filter(log => {
            const valid = log.phone_number.length >= 7;
            if (!valid) console.warn(`Skipping invalid phone: "${log.phone_number}"`);
            return valid;
        });

        await supabase.from('campaigns').update({ total_target: logsToInsert.length }).eq('id', campaign.id);
    } else if (data.audienceType === 'saved_list' && data.savedListData) {
        // Kayıtlı liste satırlarını işle (Excel gibi)
        logsToInsert = data.savedListData.map((row: any) => {
            let rawPhone = "";
            if (data.phoneColumn && row[data.phoneColumn]) {
                rawPhone = String(row[data.phoneColumn]);
            } else {
                rawPhone = String(row.phone || row.Telefon || row.telefon || row.Phone || '');
            }

            const normalizedPhone = row._normalized_phone || normalizePhoneForWhatsApp(rawPhone);
            const name = row.full_name || row['Ad Soyad'] || row.name || '';
            return {
                tenant_id: data.tenantId,
                campaign_id: campaign.id,
                phone_number: normalizedPhone,
                row_metadata: { ...row, name, full_name: name },
                status: 'pending' as const,
            };
        }).filter(log => log.phone_number.length >= 7);

        await supabase.from('campaigns').update({ total_target: logsToInsert.length }).eq('id', campaign.id);
    }

    // 3. Logları kaydet
    if (logsToInsert.length > 0) {
        const { error: logsError } = await supabase
            .from('customer_campaign_logs')
            .insert(logsToInsert);

        if (logsError) {
            console.error("Error inserting logs:", logsError);
            return { success: false, error: `Hedef kitle kaydedilemedi: ${logsError.message}` };
        }
    } else {
        // Gönderilecek kimse yok
        return { success: false, error: "Geçerli telefon numarası olan hedef müşteri bulunamadı." };
    }

    revalidatePath('/panel/settings');

    // 4. Kampanyayı DOĞRUDAN işle (await ile)
    // ÖNEMLI: Vercel serverless fonksiyonlar response döndüğünde ölür.
    // Fire-and-forget (promise.catch) Vercel'de ÇALIŞMAZ.
    // Bu yüzden processing'i await ile bekliyoruz.
    try {
        await processCampaignInBackground(
            campaign.id,
            data.variableMappings,
            data.audienceType
        );
    } catch (err: any) {
        console.error("Campaign processing error:", err);
        // İşleme hatası olsa bile kampanya oluşturuldu, kullanıcıya bildiriyoruz
    }

    return { success: true, campaignId: campaign.id };
}

// =====================================================================
// INLINE CAMPAIGN PROCESSOR
// Service Role Key ile çalışır, RLS'yi bypass eder
// =====================================================================
async function processCampaignInBackground(
    campaignId: string,
    variableMappings: Record<string, any>,
    audienceType: string
) {
    const { createClient: createServiceClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const sb = createServiceClient(supabaseUrl, supabaseKey);

    console.log(`[CampaignProcessor] Starting campaign: ${campaignId}`);

    // Update campaign to RUNNING
    await sb.from('campaigns').update({ status: 'RUNNING' }).eq('id', campaignId);

    // Fetch campaign
    const { data: campaign } = await sb.from('campaigns').select('*').eq('id', campaignId).single();
    if (!campaign) {
        console.error("[CampaignProcessor] Campaign not found!");
        return;
    }

    const templateName = campaign.template_name || campaign.template_id;
    const templateLanguage = campaign.template_language || 'tr';
    const tenantId = campaign.tenant_id;
    const mappings = variableMappings || campaign.variable_mappings || {};

    // Get tenant WABA settings from channel_connections (same source as single send)
    const { data: connection } = await sb
        .from('channel_connections')
        .select('access_token_encrypted, meta_identifiers')
        .eq('tenant_id', tenantId)
        .eq('channel', 'whatsapp')
        .eq('status', 'connected')
        .single();

    const waAccessToken = connection?.access_token_encrypted;
    const waPhoneNumberId = (connection?.meta_identifiers as any)?.phone_number_id;

    if (!waAccessToken || !waPhoneNumberId) {
        await sb.from('campaigns').update({ status: 'FAILED' }).eq('id', campaignId);
        console.error("[CampaignProcessor] Tenant WhatsApp Connection Missing (channel_connections)");
        return;
    }

    // Fetch pending logs
    const { data: logs } = await sb
        .from('customer_campaign_logs')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('status', 'pending');

    if (!logs || logs.length === 0) {
        await sb.from('campaigns').update({ status: 'COMPLETED' }).eq('id', campaignId);
        console.log("[CampaignProcessor] No pending targets.");
        return;
    }

    // Şablonun medya (header image/video/document) bilgisini çek
    const { data: templateAttachment } = await sb
        .from('whatsapp_template_attachments')
        .select('file_url, file_type')
        .eq('tenant_id', tenantId)
        .eq('template_name', templateName)
        .eq('language', templateLanguage)
        .single();

    // Medya varsa WhatsApp'a yükle — bir kez yükleme yap, tüm mesajlarda kullan
    let headerMediaId: string | null = null;
    let headerMediaType: string | null = null;

    if (templateAttachment?.file_url) {
        headerMediaType = (templateAttachment.file_type || 'IMAGE').toLowerCase(); // image, video, document
        console.log(`[CampaignProcessor] Template has media header: ${headerMediaType}, URL: ${templateAttachment.file_url}`);
        try {
            // 1. Dosyayı indir
            const mediaResponse = await fetch(templateAttachment.file_url);
            if (mediaResponse.ok) {
                const blob = await mediaResponse.blob();
                const formData = new FormData();
                formData.append("messaging_product", "whatsapp");
                formData.append("file", blob, templateAttachment.file_url.split('/').pop() || "media_file");

                // 2. WhatsApp'a yükle
                const uploadRes = await fetch(`https://graph.facebook.com/v21.0/${waPhoneNumberId}/media`, {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${waAccessToken}` },
                    body: formData
                });
                const uploadData = await uploadRes.json();

                if (uploadData.id) {
                    headerMediaId = uploadData.id;
                    console.log(`[CampaignProcessor] Media uploaded to WA, ID: ${headerMediaId}`);
                } else {
                    console.error("[CampaignProcessor] Media upload failed:", uploadData.error);
                }
            } else {
                console.error(`[CampaignProcessor] Failed to fetch media: HTTP ${mediaResponse.status}`);
            }
        } catch (mediaErr: any) {
            console.error("[CampaignProcessor] Media upload exception:", mediaErr.message);
        }
    }

    // Template'in body değişkenlerini Meta API'den tespit et (mappings boş olabilir!)
    let templateBodyVars: string[] = []; // ["adsoyad"] veya ["1", "2", "3"]
    try {
        const { data: conn } = await sb.from('channel_connections')
            .select('access_token_encrypted, meta_identifiers')
            .eq('tenant_id', tenantId).eq('channel', 'whatsapp').eq('status', 'connected').single();

        const wabaId = (conn?.meta_identifiers as any)?.waba_id;
        if (wabaId && conn?.access_token_encrypted) {
            const tplRes = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/message_templates?name=${templateName}`, {
                headers: { "Authorization": `Bearer ${conn.access_token_encrypted}` }
            });
            const tplData = await tplRes.json();
            const tpl = tplData.data?.find((t: any) => t.name === templateName && t.language === templateLanguage);
            if (tpl) {
                const bodyComp = tpl.components?.find((c: any) => c.type === "BODY");
                if (bodyComp?.text) {
                    const matches = bodyComp.text.match(/\{\{([^}]+)\}\}/g);
                    if (matches) {
                        templateBodyVars = [...new Set(matches.map((m: string) => m.replace(/[{}]/g, "")))] as string[];
                    }
                }
                console.log(`[CampaignProcessor] Template body vars: ${JSON.stringify(templateBodyVars)}`);
            }
        }
    } catch (e: any) {
        console.error("[CampaignProcessor] Template structure fetch error:", e.message);
    }

    let successCount = 0;
    let failCount = 0;

    for (const log of logs) {
        const phoneNumber = normalizePhoneForWhatsApp(log.phone_number);
        let rowContext: Record<string, any> = log.row_metadata || {};

        if ((!rowContext || Object.keys(rowContext).length === 0) && log.customer_id && audienceType === 'customers') {
            const { data: custData } = await sb.from('customers').select('*').eq('id', log.customer_id).single();
            rowContext = custData || {};
        }

        // Build components
        let components: any[] = [];

        // Body parametrelerini oluştur
        // Öncelik: mappings > templateBodyVars (Meta API'den)
        const mappingKeys = Object.keys(mappings);

        // Kullanılacak değişken listesini belirle
        let varsToSend: string[] = [];

        if (mappingKeys.length > 0) {
            // Mappings varsa onları kullan
            let maxNumeric = 0;
            mappingKeys.forEach(k => {
                const num = parseInt(k);
                if (!isNaN(num) && num > maxNumeric) maxNumeric = num;
            });
            varsToSend = [...mappingKeys];
            for (let i = 1; i <= maxNumeric; i++) {
                if (!varsToSend.includes(String(i))) varsToSend.push(String(i));
            }
        } else if (templateBodyVars.length > 0) {
            // Mappings boş ama template değişkenleri var → fallback
            varsToSend = [...templateBodyVars];
        }

        // Sırala
        varsToSend.sort((a, b) => {
            const numA = parseInt(a); const numB = parseInt(b);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            if (!isNaN(numA)) return -1;
            if (!isNaN(numB)) return 1;
            return a.localeCompare(b);
        });

        if (varsToSend.length > 0) {
            const parameters = [];
            for (const key of varsToSend) {
                const mapping = mappings[key];
                let textValue = "";

                if (!mapping) {
                    // Mapping yoksa rowContext'ten akıllı fallback
                    textValue = rowContext['name'] || rowContext['full_name'] || rowContext['Ad'] || rowContext['Ad Soyad'] || rowContext['Adı Soyadı'] || "";
                } else if (mapping.column === "name") {
                    textValue = rowContext['name'] || rowContext['Ad'] || rowContext['Adı Soyadı'] || rowContext['full_name'] || "";
                } else if (mapping.column === "phone") {
                    textValue = phoneNumber;
                } else if (mapping.column === "custom") {
                    textValue = mapping.customValue || "";
                } else {
                    textValue = rowContext[mapping.column] ||
                        Object.entries(rowContext).find(([k]) => k.toLowerCase() === mapping.column.toLowerCase())?.[1] ||
                        "";
                }

                const param: any = { type: "text", text: String(textValue).trim() || " " };
                // Meta API: named variable ise parameter_name zorunlu
                const isNumeric = !isNaN(parseInt(key));
                if (!isNumeric) {
                    param.parameter_name = key;
                }
                parameters.push(param);
            }
            components.push({ type: "body", parameters });
        }

        // Header medya component'i ekle (varsa) — components array'inin BAŞINA
        if (headerMediaId && headerMediaType) {
            const mediaParam: any = { type: headerMediaType };
            mediaParam[headerMediaType] = { id: headerMediaId };
            components.unshift({
                type: "header",
                parameters: [mediaParam]
            });
        } else if (templateAttachment?.file_url && headerMediaType) {
            // Media ID alınamadıysa link ile dene (fallback)
            const mediaParam: any = { type: headerMediaType };
            mediaParam[headerMediaType] = { link: templateAttachment.file_url };
            components.unshift({
                type: "header",
                parameters: [mediaParam]
            });
        }

        const payload = {
            messaging_product: "whatsapp",
            to: phoneNumber,
            type: "template",
            template: {
                name: templateName,
                language: { code: templateLanguage },
                components: components.length > 0 ? components : undefined
            }
        };

        try {
            const url = `https://graph.facebook.com/v21.0/${waPhoneNumberId}/messages`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${waAccessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (response.ok) {
                const messageId = result.messages?.[0]?.id;
                await sb.from('customer_campaign_logs').update({
                    status: 'sent', meta_message_id: messageId, sent_at: new Date().toISOString()
                }).eq('id', log.id);
                successCount++;
                console.log(`[CampaignProcessor] Sent to ${phoneNumber}, msgId: ${messageId}`);
            } else {
                console.error("[CampaignProcessor] Meta API Error:", JSON.stringify(result.error));
                await sb.from('customer_campaign_logs').update({
                    status: 'failed',
                    error_message: result.error?.message || JSON.stringify(result.error) || "Unknown error",
                    failed_at: new Date().toISOString()
                }).eq('id', log.id);
                failCount++;
            }
        } catch (err: any) {
            await sb.from('customer_campaign_logs').update({
                status: 'failed', error_message: err.message, failed_at: new Date().toISOString()
            }).eq('id', log.id);
            failCount++;
        }

        await new Promise(r => setTimeout(r, 100)); // Rate limit
    }

    // Final status
    await sb.from('campaigns').update({
        status: failCount === logs.length ? 'FAILED' : 'COMPLETED',
        successful_sent: successCount,
        failed_count: failCount
    }).eq('id', campaignId);

    console.log(`[CampaignProcessor] Campaign ${campaignId} done. Success: ${successCount}, Fail: ${failCount}`);
}
