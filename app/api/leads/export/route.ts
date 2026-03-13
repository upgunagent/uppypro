"use server";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
        const emailFilter = searchParams.get("email_filter"); // "has_email" | "missing_email"

        let query = supabase
            .from("leads")
            .select("business_name, sector_name, city, district, address, phone, email, website, google_rating, google_review_count, score, status, source, tags, created_at")
            .order("business_name");

        if (listId) query = query.eq("list_id", listId);
        if (status && status !== "all") query = query.eq("status", status);
        if (sectorName && sectorName !== "all") query = query.eq("sector_name", sectorName);
        if (emailFilter === "has_email") query = query.eq("email_missing", false);
        if (emailFilter === "missing_email") query = query.eq("email_missing", true);

        const { data: leads, error } = await query;

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        if (!leads || leads.length === 0) return NextResponse.json({ error: "Dışa aktarılacak lead bulunamadı" }, { status: 404 });

        // Build CSV
        const headers = [
            "Firma Adı", "Sektör", "Şehir", "İlçe", "Adres", "Telefon", "E-posta",
            "Website", "Google Puan", "Yorum Sayısı", "Skor", "Durum", "Kaynak", "Etiketler", "Oluşturulma Tarihi"
        ];

        const escapeCSV = (val: any) => {
            if (val === null || val === undefined) return "";
            const str = String(val);
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const rows = leads.map(lead => [
            escapeCSV(lead.business_name),
            escapeCSV(lead.sector_name),
            escapeCSV(lead.city),
            escapeCSV(lead.district),
            escapeCSV(lead.address),
            escapeCSV(lead.phone),
            escapeCSV(lead.email),
            escapeCSV(lead.website),
            escapeCSV(lead.google_rating),
            escapeCSV(lead.google_review_count),
            escapeCSV(lead.score),
            escapeCSV(lead.status),
            escapeCSV(lead.source),
            escapeCSV(lead.tags ? lead.tags.join(", ") : ""),
            escapeCSV(lead.created_at ? new Date(lead.created_at).toLocaleDateString("tr-TR") : "")
        ].join(","));

        // BOM for Excel Turkish character support
        const BOM = "\uFEFF";
        const csv = BOM + headers.join(",") + "\n" + rows.join("\n");

        return new NextResponse(csv, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="leads_${new Date().toISOString().split("T")[0]}.csv"`
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
