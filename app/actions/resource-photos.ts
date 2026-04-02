"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const BUCKET = "resource-photos";
const MAX_SIZE_MB = 5;

/**
 * Kaynak için kapak fotoğrafı yükler.
 * Mevcut fotoğraf varsa üzerine yazar (upsert).
 * Fotoğraf URL'si `tenant_employees.attributes.cover_photo` alanına kaydedilir.
 */
export async function uploadResourceCoverPhoto(
    resourceId: string,
    tenantId: string,
    formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
    const file = formData.get("file") as File | null;
    if (!file) return { success: false, error: "Dosya bulunamadı." };

    // Boyut kontrolü
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        return { success: false, error: `Dosya boyutu ${MAX_SIZE_MB}MB'dan büyük olamaz.` };
    }

    // Tip kontrolü
    if (!file.type.startsWith("image/")) {
        return { success: false, error: "Sadece görsel dosyaları yüklenebilir." };
    }

    const supabase = await createClient();

    // Yetki kontrolü
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Oturum bulunamadı." };

    const { data: member } = await supabase
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", user.id)
        .eq("tenant_id", tenantId)
        .maybeSingle();

    if (!member) return { success: false, error: "Yetki hatası." };

    // Dosya uzantısı
    let ext = "jpg";
    if (file.type.includes("png")) ext = "png";
    else if (file.type.includes("webp")) ext = "webp";

    const filePath = `${tenantId}/${resourceId}/cover.${ext}`;

    // Buffer oluştur
    const buffer = await file.arrayBuffer();

    // Supabase Storage'a yükle (upsert: mevcut fotoğrafı üzerine yazar)
    const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, buffer, {
            contentType: file.type,
            upsert: true,
        });

    if (uploadError) {
        console.error("[Resource Photo Upload]", uploadError);
        return { success: false, error: uploadError.message };
    }

    // Public URL al
    const { data: { publicUrl } } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(filePath);

    // Cache-busting: URL'ye timestamp ekle
    const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

    // Kaynak attributes'ına cover_photo olarak kaydet
    const { data: resource } = await supabase
        .from("tenant_employees")
        .select("attributes")
        .eq("id", resourceId)
        .single();

    const currentAttrs = resource?.attributes || {};
    const updatedAttrs = { ...currentAttrs, cover_photo: urlWithCacheBust };

    const { error: updateError } = await supabase
        .from("tenant_employees")
        .update({ attributes: updatedAttrs })
        .eq("id", resourceId);

    if (updateError) {
        console.error("[Resource Photo Update]", updateError);
        return { success: false, error: "Fotoğraf yüklendi ancak kayıt güncellenemedi." };
    }

    revalidatePath("/panel/settings");
    return { success: true, url: urlWithCacheBust };
}

/**
 * Kaynak kapak fotoğrafını siler.
 */
export async function deleteResourceCoverPhoto(
    resourceId: string,
    tenantId: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    // Yetki kontrolü
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Oturum bulunamadı." };

    const { data: member } = await supabase
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", user.id)
        .eq("tenant_id", tenantId)
        .maybeSingle();

    if (!member) return { success: false, error: "Yetki hatası." };

    // Storage'dan tüm uzantıları silmeye çalış (hangi format yüklendiğini bilemeyiz)
    const extensions = ["jpg", "png", "webp"];
    for (const ext of extensions) {
        await supabase.storage
            .from(BUCKET)
            .remove([`${tenantId}/${resourceId}/cover.${ext}`]);
    }

    // Attributes'tan cover_photo'yu kaldır
    const { data: resource } = await supabase
        .from("tenant_employees")
        .select("attributes")
        .eq("id", resourceId)
        .single();

    if (resource) {
        const { cover_photo, ...restAttrs } = resource.attributes || {};
        await supabase
            .from("tenant_employees")
            .update({ attributes: restAttrs })
            .eq("id", resourceId);
    }

    revalidatePath("/panel/settings");
    return { success: true };
}

/**
 * Kaynak detay URL'sini günceller.
 */
export async function updateResourceDetailUrl(
    resourceId: string,
    detailUrl: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const { data: resource } = await supabase
        .from("tenant_employees")
        .select("attributes")
        .eq("id", resourceId)
        .single();

    const currentAttrs = resource?.attributes || {};
    const updatedAttrs = { ...currentAttrs, detail_url: detailUrl.trim() || null };

    // Boş string ise alanı temizle
    if (!detailUrl.trim()) {
        delete updatedAttrs.detail_url;
    }

    const { error } = await supabase
        .from("tenant_employees")
        .update({ attributes: updatedAttrs })
        .eq("id", resourceId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath("/panel/settings");
    return { success: true };
}
