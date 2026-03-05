import { NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase with Service Role Key to bypass RLS in background jobs
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Telefon numarasını WhatsApp formatına normalize eder
function normalizePhone(raw: string, defaultCountryCode = "90"): string {
    let digits = raw.replace(/\D/g, "");
    if (!digits || digits.length < 7) return digits;
    if (digits.startsWith("0") && digits.length <= 11) {
        digits = defaultCountryCode + digits.slice(1);
    }
    return digits;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { campaignId, variableMappings, audienceType } = body;

        console.log(`Starting processing for campaign: ${campaignId}`);

        // Update campaign to RUNNING
        await supabase.from('campaigns').update({ status: 'RUNNING' }).eq('id', campaignId);

        // Fetch Campaign Info - no more FK join to whatsapp_templates
        const { data: campaign } = await supabase
            .from('campaigns')
            .select('*')
            .eq('id', campaignId)
            .single();

        if (!campaign) {
            console.error("Campaign not found!");
            return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
        }

        const templateName = campaign.template_name || campaign.template_id;
        const templateLanguage = campaign.template_language || 'tr';
        const tenantId = campaign.tenant_id;
        // Use variable mappings from campaign record (saved at creation time)
        const mappings = variableMappings || campaign.variable_mappings || {};

        // Get tenant WABA settings
        const { data: tenantSetting } = await supabase
            .from('tenant_settings')
            .select('whatsapp_phone_number_id, whatsapp_access_token')
            .eq('tenant_id', tenantId)
            .single();

        if (!tenantSetting?.whatsapp_access_token || !tenantSetting?.whatsapp_phone_number_id) {
            await supabase.from('campaigns').update({ status: 'FAILED' }).eq('id', campaignId);
            return NextResponse.json({ error: "Tenant WhatsApp Settings Missing" }, { status: 400 });
        }

        // Fetch pending logs for this campaign
        const { data: logs } = await supabase
            .from('customer_campaign_logs')
            .select('*')
            .eq('campaign_id', campaignId)
            .eq('status', 'pending');

        if (!logs || logs.length === 0) {
            await supabase.from('campaigns').update({ status: 'COMPLETED' }).eq('id', campaignId);
            return NextResponse.json({ success: true, message: "No pending targets." });
        }

        let successCount = 0;
        let failCount = 0;

        // Process each target
        for (let i = 0; i < logs.length; i++) {
            const log = logs[i];

            // Normalize phone
            const phoneNumber = normalizePhone(log.phone_number);

            // Row context: from row_metadata (stored at campaign creation time)
            // Fallback: fetch from customers table if customer_id exists
            let rowContext: Record<string, any> = log.row_metadata || {};

            if ((!rowContext || Object.keys(rowContext).length === 0) && log.customer_id && audienceType === 'customers') {
                const { data: customerData } = await supabase
                    .from('customers')
                    .select('*')
                    .eq('id', log.customer_id)
                    .single();
                rowContext = customerData || {};
            }

            // Build parameters for BODY component
            let components: any[] = [];

            // Gather all mapped keys
            const mappingKeys = Object.keys(mappings);
            let maxNumeric = 0;
            mappingKeys.forEach(k => {
                const num = parseInt(k);
                if (!isNaN(num) && num > maxNumeric) maxNumeric = num;
            });

            // Ensure we have all numeric keys 1..maxNumeric even if they were skipped in mappings
            const expectedKeys = [...mappingKeys];
            for (let i = 1; i <= maxNumeric; i++) {
                if (!expectedKeys.includes(String(i))) {
                    expectedKeys.push(String(i));
                }
            }

            // Sort: numerics first in order, then text alphabetical
            expectedKeys.sort((a, b) => {
                const numA = parseInt(a);
                const numB = parseInt(b);
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

                    parameters.push({
                        type: "text",
                        text: String(textValue).trim() || " " // meta api fails on empty string
                    });
                }

                components.push({
                    type: "body",
                    parameters: parameters
                });
            }

            // Add header media component if campaign has uploaded media
            // (Media handle would need to be stored - for now we skip header component if no handle)
            // Meta requires a media "handle" ID for image headers; URL upload is separate
            // The image URL from our storage won't work directly - need to upload to Meta first
            // This is an advanced step - for now body/text variables will work

            const payload = {
                messaging_product: "whatsapp",
                to: phoneNumber,
                type: "template",
                template: {
                    name: templateName,
                    language: {
                        code: templateLanguage
                    },
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
                    await supabase.from('customer_campaign_logs').update({
                        status: 'sent',
                        meta_message_id: messageId,
                        sent_at: new Date().toISOString()
                    }).eq('id', log.id);
                    successCount++;
                } else {
                    console.error("Meta API Error:", result);
                    await supabase.from('customer_campaign_logs').update({
                        status: 'failed',
                        error_message: result.error?.message || JSON.stringify(result.error) || "Unknown error",
                        failed_at: new Date().toISOString()
                    }).eq('id', log.id);
                    failCount++;
                }
            } catch (err: any) {
                await supabase.from('customer_campaign_logs').update({
                    status: 'failed',
                    error_message: err.message,
                    failed_at: new Date().toISOString()
                }).eq('id', log.id);
                failCount++;
            }

            // Rate limit (100ms gap between sends)
            await new Promise(r => setTimeout(r, 100));
        }

        // Update campaign final status
        await supabase.from('campaigns').update({
            status: failCount === logs.length ? 'FAILED' : 'COMPLETED',
            successful_sent: successCount,
            failed_count: failCount
        }).eq('id', campaignId);

        console.log(`Campaign ${campaignId} finished. Success: ${successCount}, Fail: ${failCount}`);
        return NextResponse.json({ success: true, successCount, failCount });

    } catch (e: any) {
        console.error("Background processing error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
