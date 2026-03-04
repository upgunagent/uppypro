"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addCannedResponse(formData: FormData) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { error: "Oturum süreniz dolmuş." };
        }

        const tenantId = formData.get("tenantId") as string;
        let shortcut = formData.get("shortcut") as string;
        const content = formData.get("content") as string;
        const mediaUrl = formData.get("mediaUrl") as string | null;

        if (!tenantId || !shortcut || !content) {
            return { error: "Kısayol ve mesaj içeriği zorunludur." };
        }

        // Kısayolun başında '/' varsa temizle (kullanıcıların fazladan girmemesi için)
        if (shortcut.startsWith('/')) {
            shortcut = shortcut.substring(1);
        }

        // Kısayoldaki boşlukları kaldır ve küçük harfe çevir
        shortcut = shortcut.toLowerCase().trim().replace(/\s+/g, '-');

        const { error } = await supabase.from("canned_responses").insert([{
            tenant_id: tenantId,
            shortcut: shortcut,
            content: content,
            media_url: mediaUrl || null,
            created_by: user.id
        }]);

        if (error) {
            if (error.code === '23505') { // Benzersizlik hatası varsa (aynı kısayol birden fazla kez)
                return { error: `"${shortcut}" kısayolu zaten kullanımda.` };
            }
            console.error("Canned response add error:", error);
            return { error: "Hazır cevap eklenirken bir hata oluştu." };
        }

        revalidatePath("/panel/settings");
        return { success: true };

    } catch (error) {
        console.error("Canned response action error:", error);
        return { error: "Beklenmeyen bir hata oluştu." };
    }
}

export async function deleteCannedResponse(id: string, tenantId: string) {
    try {
        const supabase = await createClient();

        const { error } = await supabase
            .from("canned_responses")
            .delete()
            .match({ id: id, tenant_id: tenantId }); // Güvenlik için tenantId ile eşleştir

        if (error) {
            console.error("Canned response delete error:", error);
            return { error: "Silinirken bir hata oluştu." };
        }

        revalidatePath("/panel/settings");
        return { success: true };
    } catch (error) {
        console.error("Canned response delete action error:", error);
        return { error: "Silinemedi." };
    }
}
