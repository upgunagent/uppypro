"use client";

import { useState } from "react";
import { MessageCircle, Instagram, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SimpleDialog } from "@/components/ui/simple-dialog";
import { connectChannelAction, disconnectChannelAction, type ConnectPayload } from "@/app/actions/channels";
import { clsx } from "clsx";
import { useRouter } from "next/navigation";

interface ChannelCardProps {
    type: "whatsapp" | "instagram";
    connection: any; // The row from DB
}

export function ChannelCard({ type, connection }: ChannelCardProps) {
    const isConnected = connection?.status === "connected";
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showLegacy, setShowLegacy] = useState(false);
    const router = useRouter();

    // Form State
    const [token, setToken] = useState("");
    const [phoneId, setPhoneId] = useState("");
    const [wabaId, setWabaId] = useState("");
    const [pageId, setPageId] = useState("");

    const handleConnectLegacy = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload: ConnectPayload = {
                channel: type,
                access_token: token,
                phone_number_id: type === "whatsapp" ? phoneId : undefined,
                waba_id: type === "whatsapp" ? wabaId : undefined,
                page_id: type === "instagram" ? pageId : undefined,
            };

            const result = await connectChannelAction(payload);
            if (!result?.success) {
                throw new Error(result?.error || "Bilinmeyen bir hata oluştu.");
            }
            setDialogOpen(false);
            router.refresh(); // Refresh server components to show new state
        } catch (error) {
            console.error(error);
            console.error(error);
            alert(error instanceof Error ? error.message : "Bağlantı hatası!");
        } finally {
            setLoading(false);
        }
    };

    const handleOAuthLogin = () => {
        setLoading(true);
        // Redirect to start endpoint
        router.push("/api/integrations/instagram/login/start");
    };

    const handleDisconnect = async () => {
        if (!confirm("Bağlantıyı kesmek istediğinize emin misiniz?")) return;
        setLoading(true);
        try {
            await disconnectChannelAction(type);
        } catch (error) {
            console.error(error);
            alert("Bağlantı kesilemedi.");
        } finally {
            setLoading(false);
        }
    };

    const Icon = type === "whatsapp" ? MessageCircle : Instagram;
    const colorClass = type === "whatsapp" ? "text-[#25D366]" : "text-[#E1306C]";
    const cardClass = type === "whatsapp"
        ? "bg-gradient-to-br from-green-500 to-emerald-700 text-white shadow-xl shadow-green-900/20 border-green-400/20"
        : "bg-gradient-to-br from-red-500 via-rose-600 to-rose-800 text-white shadow-xl shadow-red-900/20 border-red-400/20";

    const buttonClass = type === "whatsapp"
        ? "bg-white text-emerald-700 hover:bg-emerald-50"
        : "bg-white text-rose-700 hover:bg-rose-50";

    // For Instagram, show username if connected via OAuth
    const displayIdentifier = type === "instagram" && connection?.meta_identifiers?.username
        ? `@${connection.meta_identifiers.username}`
        : connection?.meta_identifiers?.mock_id || "ID: ***";

    return (
        <>
            <div className={clsx("p-6 rounded-2xl border flex flex-col justify-between h-60 relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]", cardClass)}>

                {/* Decorative Pattern */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

                <div className="flex justify-between items-start z-10 relative">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner border border-white/10">
                            <Icon className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h4 className="font-bold text-xl tracking-tight capitalize">{type}</h4>
                            <div className="flex items-center gap-1.5 opacity-90">
                                <span className={clsx("w-2 h-2 rounded-full animate-pulse", isConnected ? "bg-white" : "bg-white/40")} />
                                <p className="text-xs font-medium">{isConnected ? "Sistem Aktif" : "Bağlantı Yok"}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 z-10 relative">
                    {isConnected ? (
                        <div className="space-y-4">
                            <div className="px-4 py-2 bg-black/10 rounded-lg border border-white/10 backdrop-blur-sm">
                                <p className="text-xs text-white/80 uppercase tracking-wider font-bold mb-0.5">Bağlı Hesap</p>
                                <p className="text-sm font-semibold truncate text-white">
                                    {displayIdentifier}
                                </p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={handleDisconnect} className="w-full h-9 text-xs bg-white/10 hover:bg-white/20 text-white border border-white/20" disabled={loading}>
                                {loading ? "İşleniyor..." : "Bağlantıyı Sonlandır"}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-white/80 leading-relaxed">
                                {type === 'whatsapp'
                                    ? "Müşterilerinizle WhatsApp üzerinden otomatik iletişim kurun."
                                    : "Instagram DM kutunuzu CRM sisteminize entegre edin."}
                            </p>

                            {type === 'instagram' ? (
                                <Button size="sm" onClick={handleOAuthLogin} className={clsx("w-full h-10 font-bold shadow-lg border-2 border-transparent", buttonClass)} disabled={loading}>
                                    {loading ? "Yönlendiriliyor..." : "Instagram ile Bağlan"}
                                </Button>
                            ) : (
                                <Button size="sm" onClick={() => setDialogOpen(true)} className={clsx("w-full h-10 font-bold shadow-lg border-2 border-transparent", buttonClass)}>
                                    Hemen Bağla
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Legacy Link for Instagram (Floating outside or hidden?) */}
            {/* Keeping it minimal inside dialog or just plain text below if needed. Removing from card face for cleaner look. */}

            {/* Connect Dialog */}
            <SimpleDialog
                isOpen={isDialogOpen}
                onClose={() => setDialogOpen(false)}
                title={`${type === "whatsapp" ? "WhatsApp" : "Instagram (Manuel)"} Bağla`}
            >
                <form onSubmit={handleConnectLegacy} className="space-y-4">
                    <p className="text-sm text-gray-500 mb-4">
                        {type === 'instagram'
                            ? "Eski yöntem (Facebook Page ID). Normalde 'Instagram ile Bağlan' önerilir."
                            : "Lütfen Meta Developer Portal'dan aldığınız bilgileri giriniz."}
                    </p>

                    {type === "whatsapp" && (
                        <>
                            <div className="space-y-2">
                                <Label>Phone Number ID</Label>
                                <Input required value={phoneId} onChange={e => setPhoneId(e.target.value)} placeholder="100609..." />
                            </div>
                            <div className="space-y-2">
                                <Label>WABA ID</Label>
                                <Input required value={wabaId} onChange={e => setWabaId(e.target.value)} placeholder="100..." />
                            </div>
                        </>
                    )}

                    {type === "instagram" && (
                        <div className="space-y-2">
                            <Label>Facebook Page ID</Label>
                            <Input required value={pageId} onChange={e => setPageId(e.target.value)} placeholder="102..." />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Access Token (System User)</Label>
                        <Input required type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="EAAG..." />
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Bağlanıyor..." : "Kaydet ve Bağla"}
                    </Button>
                </form>
            </SimpleDialog>
        </>
    );
}
