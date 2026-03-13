import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: membership } = await supabase
            .from("tenant_members")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "agency_admin")
            .maybeSingle();

        if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const body = await req.json();
        const { leads, listName, sectorId, sectorName } = body;

        if (!leads || !Array.isArray(leads) || leads.length === 0) {
            return NextResponse.json({ error: "Geçerli lead verisi gerekli" }, { status: 400 });
        }

        const adminDb = createAdminClient();
        let savedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        const errorDetails: string[] = [];

        // Create list if name provided
        let listId: string | null = null;
        if (listName) {
            const { data: newList, error: listError } = await adminDb
                .from("lead_lists")
                .insert({
                    name: listName,
                    sector_id: sectorId || null,
                    sector_name: sectorName || null,
                    lead_count: 0,
                    created_by: user.id
                })
                .select("id")
                .single();

            if (listError) return NextResponse.json({ error: `Liste oluşturulamadı: ${listError.message}` }, { status: 500 });
            listId = newList.id;
        }

        for (const lead of leads) {
            // Skip if no business name
            if (!lead.business_name?.trim()) {
                errorCount++;
                continue;
            }

            // Duplicate check by email or phone+business_name
            if (lead.email) {
                const { data: existing } = await adminDb
                    .from("leads")
                    .select("id")
                    .eq("email", lead.email.trim().toLowerCase())
                    .maybeSingle();

                if (existing) {
                    // Update list_id if needed
                    if (listId) await adminDb.from("leads").update({ list_id: listId }).eq("id", existing.id);
                    skippedCount++;
                    continue;
                }
            } else if (lead.phone && lead.business_name) {
                const { data: existing } = await adminDb
                    .from("leads")
                    .select("id")
                    .eq("phone", lead.phone.trim())
                    .eq("business_name", lead.business_name.trim())
                    .maybeSingle();

                if (existing) {
                    if (listId) await adminDb.from("leads").update({ list_id: listId }).eq("id", existing.id);
                    skippedCount++;
                    continue;
                }
            }

            const email = lead.email?.trim().toLowerCase() || null;

            // Build insert object with only non-null fields
            const insertData: Record<string, any> = {
                business_name: lead.business_name.trim(),
                email_missing: !email,
            };

            if (email) insertData.email = email;
            if (lead.contact_name?.trim()) insertData.contact_name = lead.contact_name.trim();
            if (lead.sector_id || sectorId) insertData.sector_id = lead.sector_id || sectorId;
            if (lead.sector_name || sectorName) insertData.sector_name = lead.sector_name || sectorName;
            if (lead.city?.trim()) insertData.city = lead.city.trim();
            if (lead.district?.trim()) insertData.district = lead.district.trim();
            if (lead.address?.trim()) insertData.address = lead.address.trim();
            if (lead.phone?.trim()) insertData.phone = lead.phone.trim();
            if (lead.website?.trim()) insertData.website = lead.website.trim();
            if (lead.google_rating) insertData.google_rating = parseFloat(lead.google_rating);
            if (lead.google_review_count) insertData.google_review_count = parseInt(lead.google_review_count);
            if (lead.tags) insertData.tags = typeof lead.tags === "string" ? lead.tags.split(",").map((t: string) => t.trim()) : lead.tags;
            if (listId) insertData.list_id = listId;

            insertData.status = "new";

            const { error } = await adminDb.from("leads").insert(insertData);

            if (error) {
                console.error("Import insert error:", error.message, "| Lead:", JSON.stringify(lead));
                errorDetails.push(`${lead.business_name}: ${error.message}`);
                errorCount++;
            } else {
                savedCount++;
            }
        }

        // Update list count
        if (listId) {
            await adminDb.from("lead_lists").update({ lead_count: savedCount + skippedCount }).eq("id", listId);
        }

        // Audit log
        await adminDb.from("lead_audit_logs").insert({
            action: "import",
            entity_type: "lead",
            details: { total: leads.length, saved: savedCount, skipped: skippedCount, errors: errorCount, list_id: listId, source: "csv_import" },
            performed_by: user.id
        });

        return NextResponse.json({
            success: true,
            total: leads.length,
            saved: savedCount,
            skipped: skippedCount,
            errors: errorCount,
            listId,
            errorDetails: errorDetails.length > 0 ? errorDetails.slice(0, 10) : undefined
        });

    } catch (error: any) {
        console.error("Import error:", error);
        return NextResponse.json({ error: error.message || "Beklenmeyen hata" }, { status: 500 });
    }
}
