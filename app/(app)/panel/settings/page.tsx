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
        <div className="max-w-5xl space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">İşletme Ayarları</h1>
                    <p className="text-gray-400">İşletme bilgilerinizi ve bağlantılarınızı yönetin.</p>
                </div>
                <div className="bg-white/5 px-4 py-2 rounded-lg border border-white/10 text-sm">
                    Paket: <span className="text-primary font-bold">Pro</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Sol Kolon: İşletme Bilgileri */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="p-6 glass rounded-xl border border-white/10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-primary/20 rounded-lg">
                                <Store className="text-primary w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-lg">Genel Bilgiler</h3>
                        </div>

                        <form action={updateBusinessInfo} className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="tenantName" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">İşletme Adı</label>
                                <div className="relative">
                                    <Store className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                                    <Input
                                        name="tenantName"
                                        defaultValue={tenant?.name}
                                        className="pl-9 bg-black/20 border-white/10"
                                        placeholder="İşletme Adı"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="fullName" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Yetkili Ad Soyad</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                                    <Input
                                        name="fullName"
                                        defaultValue={profile?.full_name || ""}
                                        className="pl-9 bg-black/20 border-white/10"
                                        placeholder="Ad Soyad"
                                    />
                                </div>
                            </div>

                            {/* Phone is in metadata usually, for MVP we skip or display static if not in DB */}

                            <Button type="submit" className="w-full bg-white/10 hover:bg-white/20">
                                <Save className="w-4 h-4 mr-2" />
                                Kaydet
                            </Button>
                        </form>
                    </div>
                </div>

                {/* Sağ Kolon: Kanal Bağlantıları */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="p-6 glass rounded-xl border border-white/10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-green-500/20 rounded-lg">
                                <MessageCircle className="text-green-500 w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-lg">İletişim Kanalları</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ChannelCard type="whatsapp" connection={wa} />
                            <ChannelCard type="instagram" connection={ig} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
            
            {/* DEBUG SECTION */ }
    <div className="p-4 bg-red-900/20 border border-red-500/50 rounded text-xs font-mono text-red-200 mt-8">
        <p className="font-bold mb-2">DEBUG INFO (Production Debugging):</p>
        <div className="mb-2">Member Tenant ID: {member?.tenant_id}</div>
        <pre>{JSON.stringify(channels, null, 2)}</pre>
    </div>
        </div >
    );
}
