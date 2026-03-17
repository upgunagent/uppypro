"use server";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
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

        // Parse query params for filtering
        const { searchParams } = new URL(req.url);
        const listId = searchParams.get("list_id");
        const status = searchParams.get("status");
        const sectorName = searchParams.get("sector_name");
        const emailFilter = searchParams.get("email_filter");
        const phoneFilter = searchParams.get("phone_filter");

        let query = supabase
            .from("leads")
            .select("business_name, contact_name, sector_name, city, district, address, phone, email, website, google_rating, google_review_count, score, status, source, tags, created_at")
            .order("business_name");

        if (listId) query = query.eq("list_id", listId);
        if (status && status !== "all") query = query.eq("status", status);
        if (sectorName && sectorName !== "all") query = query.eq("sector_name", sectorName);
        if (emailFilter === "has_email") query = query.eq("email_missing", false);
        if (emailFilter === "missing_email") query = query.eq("email_missing", true);
        if (phoneFilter === "mobile") query = query.like("phone", "05%");
        if (phoneFilter === "landline") query = query.not("phone", "like", "05%");

        const { data: leads, error } = await query;

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        if (!leads || leads.length === 0) return NextResponse.json({ error: "Dışa aktarılacak lead bulunamadı" }, { status: 404 });

        // Status label map
        const STATUS_LABELS: Record<string, string> = {
            new: "Yeni",
            contacted: "İletişime Geçildi",
            demo_scheduled: "Demo Planlandı",
            proposal: "Teklif Verildi",
            won: "Kazanıldı",
            lost: "Kaybedildi",
            archived: "Arşivlendi",
        };

        // Build rows for Excel
        const headers = [
            "Firma Adı", "Yetkili Ad Soyad", "Sektör", "Şehir", "İlçe", "Adres",
            "Telefon", "E-posta", "Website",
            "Google Puan", "Yorum Sayısı", "Skor", "Durum", "Kaynak", "Etiketler", "Kayıt Tarihi"
        ];

        const rows = leads.map(lead => [
            lead.business_name || "",
            lead.contact_name || "",
            lead.sector_name || "",
            lead.city || "",
            lead.district || "",
            lead.address || "",
            lead.phone || "",
            lead.email || "",
            lead.website || "",
            lead.google_rating ?? "",
            lead.google_review_count ?? "",
            lead.score ?? "",
            STATUS_LABELS[lead.status] || lead.status || "",
            lead.source || "",
            lead.tags ? lead.tags.join(", ") : "",
            lead.created_at ? new Date(lead.created_at).toLocaleDateString("tr-TR") : ""
        ]);

        // Create workbook
        const wb = XLSX.utils.book_new();
        const wsData = [headers, ...rows];
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Auto column widths
        const colWidths = headers.map((h, colIdx) => {
            let maxLen = h.length;
            rows.forEach(row => {
                const cellLen = String(row[colIdx] || "").length;
                if (cellLen > maxLen) maxLen = cellLen;
            });
            return { wch: Math.min(maxLen + 2, 50) };
        });
        ws["!cols"] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, "Leads");

        // Generate buffer
        const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

        const fileName = `leads_${new Date().toISOString().split("T")[0]}.xlsx`;

        return new NextResponse(buf, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${fileName}"`
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
