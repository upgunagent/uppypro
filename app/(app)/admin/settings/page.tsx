import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";

export default async function AdminSettingsPage() {
    const supabase = await createClient();

    const { data: setting } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "ai_summary_webhook_url")
        .single();

    return (
        <div className="p-8 max-w-2xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Platform Ayarları</h1>
                <p className="text-slate-500">Tüm işletmeler için geçerli genel ayarlar.</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <SettingsForm currentWebhookUrl={setting?.value || ""} />
            </div>
        </div>
    );
}
