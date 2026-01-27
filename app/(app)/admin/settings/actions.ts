"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updatePlatformSetting(prevState: any, formData: FormData) {
    const supabase = await createClient();
    const webhookUrl = formData.get("webhookUrl") as string;

    if (!webhookUrl) {
        return { error: "Webhook URL boş olamaz" };
    }

    const { error } = await supabase
        .from("platform_settings")
        .upsert({
            key: "ai_summary_webhook_url",
            value: webhookUrl,
            updated_at: new Date().toISOString()
        });

    if (error) {
        return { error: "Ayarlar kaydedilirken hata oluştu: " + error.message };
    }

    revalidatePath("/admin/settings");
    return { success: "Ayarlar başarıyla kaydedildi" };
}
