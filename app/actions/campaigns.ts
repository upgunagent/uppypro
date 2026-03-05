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

    // 4. Arka plan worker'ı doğrudan (inline) tetikle
    // NOT: fetch() ile kendi sunucumuza istek atmak Next.js Server Actions'da güvenilir değil.
    // Bu yüzden processing mantığını doğrudan burada çalıştırıyoruz.
    processCampaignInBackground(
        campaign.id,
        data.variableMappings,
        data.audienceType
    ).catch(err => console.error("Background processing error:", err));

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

    // Get tenant WABA settings
    const { data: tenantSetting } = await sb
        .from('tenant_settings')
        .select('whatsapp_phone_number_id, whatsapp_access_token')
        .eq('tenant_id', tenantId)
        .single();

    if (!tenantSetting?.whatsapp_access_token || !tenantSetting?.whatsapp_phone_number_id) {
        await sb.from('campaigns').update({ status: 'FAILED' }).eq('id', campaignId);
        console.error("[CampaignProcessor] Tenant WhatsApp Settings Missing");
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
        const mappingKeys = Object.keys(mappings);
        let maxNumeric = 0;
        mappingKeys.forEach(k => {
            const num = parseInt(k);
            if (!isNaN(num) && num > maxNumeric) maxNumeric = num;
        });

        const expectedKeys = [...mappingKeys];
        for (let i = 1; i <= maxNumeric; i++) {
            if (!expectedKeys.includes(String(i))) expectedKeys.push(String(i));
        }

        expectedKeys.sort((a, b) => {
            const numA = parseInt(a); const numB = parseInt(b);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            if (!isNaN(numA)) return -1;
            if (!isNaN(numB)) return 1;
            return a.localeCompare(b);
        });

        if (expectedKeys.length > 0) {
            const parameters = [];
            for (const key of expectedKeys) {
                const mapping = mappings[key];
                let textValue = "";

                if (!mapping) {
                    textValue = rowContext['name'] || rowContext['Ad'] || rowContext['Adı Soyadı'] || rowContext['full_name'] || "";
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

                parameters.push({ type: "text", text: String(textValue).trim() || " " });
            }
            components.push({ type: "body", parameters });
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
            const url = `https://graph.facebook.com/v19.0/${tenantSetting.whatsapp_phone_number_id}/messages`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${tenantSetting.whatsapp_access_token}`,
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
