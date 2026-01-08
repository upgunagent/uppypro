import { Button } from "@/components/ui/button";
import { RepairTenantButton } from "@/components/repair-tenant-button";
import { createClient } from "@/lib/supabase/server";
import { Store, User, Save, MessageCircle } from "lucide-react";
import { revalidatePath } from "next/cache";


// UI Components
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChannelCard } from "@/components/channel-card";

export default async function SettingsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Fix: Handle multiple tenants by taking the first one
    const { data: member } = await supabase
        .from("tenant_members")
        .select("tenant_id, role")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

    if (!member) return <div className="p-12"><RepairTenantButton /></div>;

    const { data: tenant } = await supabase.from("tenants").select("*").eq("id", member.tenant_id).single();
    const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();

    const { data: channels } = await supabase
        .from("channel_connections")
        .select("*")
        .eq("tenant_id", member.tenant_id);

    const wa = channels?.find((c) => c.channel === "whatsapp");
    const ig = channels?.find((c) => c.channel === "instagram");

    // Actions
    async function updateBusinessInfo(formData: FormData) {
        "use server";
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const tenantName = formData.get("tenantName") as string;
        const fullName = formData.get("fullName") as string;
        // const phone = formData.get("phone") as string; // Profile doesn't have phone col yet but let's assume metadata sync or future

        // Update Tenant
        await supabase.from("tenants").update({ name: tenantName }).eq("id", member?.tenant_id);

        // Update Profile
        await supabase.from("profiles").update({ full_name: fullName }).eq("user_id", user.id);

        revalidatePath("/panel/settings");
    }



    return (
        <div className="max-w-5xl space-y-8 p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">İşletme Ayarları</h1>
                    <p className="text-slate-500">İşletme bilgilerinizi ve bağlantılarınızı yönetin.</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 text-sm shadow-sm text-slate-700">
                    Paket: <span className="text-primary font-bold">Pro</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Sol Kolon: İşletme Bilgileri */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <Store className="text-primary w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-lg text-slate-900">Genel Bilgiler</h3>
                        </div>

                        <form action={updateBusinessInfo} className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="tenantName" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700">İşletme Adı</label>
                                <div className="relative">
                                    <Store className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                    <Input
                                        name="tenantName"
                                        defaultValue={tenant?.name}
                                        className="pl-9 bg-white border-slate-200 text-slate-900"
                                        placeholder="İşletme Adı"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="fullName" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700">Yetkili Ad Soyad</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                    <Input
                                        name="fullName"
                                        defaultValue={profile?.full_name || ""}
                                        className="pl-9 bg-white border-slate-200 text-slate-900"
                                        placeholder="Ad Soyad"
                                    />
                                </div>
                            </div>

                            {/* Phone is in metadata usually, for MVP we skip or display static if not in DB */}

                            <Button type="submit" className="w-full">
                                <Save className="w-4 h-4 mr-2" />
                                Kaydet
                            </Button>
                        </form>
                    </div>
                </div>

                {/* Sağ Kolon: Kanal Bağlantıları */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-green-50 rounded-lg">
                                <MessageCircle className="text-green-600 w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-lg text-slate-900">İletişim Kanalları</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ChannelCard type="whatsapp" connection={wa} />
                            <ChannelCard type="instagram" connection={ig} />
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
