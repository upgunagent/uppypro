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
    const bgClass = type === "whatsapp" ? "bg-[#25D366] hover:bg-[#20bd5a]" : "bg-gradient-to-r from-[#f09433] to-[#bc1888] hover:opacity-90";

    // For Instagram, show username if connected via OAuth
    const displayIdentifier = type === "instagram" && connection?.meta_identifiers?.username
        ? `@${connection.meta_identifiers.username}`
        : connection?.meta_identifiers?.mock_id || "ID: ***";

    return (
        <>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between h-56 shadow-sm">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <Icon className={clsx("w-8 h-8", colorClass)} />
                        <div>
                            <h4 className="font-bold capitalize text-slate-900">{type}</h4>
                            <p className="text-xs text-slate-500">{type === "whatsapp" ? "Business API" : "DM Automation"}</p>
                        </div>
                    </div>
                    {isConnected ? <CheckCircle className="text-green-500 w-5 h-5" /> : <div className="w-2 h-2 rounded-full bg-slate-300" />}
                </div>

                <div className="mt-4">
                    {isConnected ? (
                        <>
                            <p className="text-xs text-green-600 mb-3 font-medium">
                                ● Aktif • {displayIdentifier}
                            </p>
                            <Button variant="destructive" size="sm" onClick={handleDisconnect} className="w-full h-8 text-xs" disabled={loading}>
                                {loading ? "İşleniyor..." : "Bağlantıyı Kes"}
                            </Button>
                        </>
                    ) : (
                        <>
                            <p className="text-xs text-slate-500 mb-3">Bağlı değil</p>
                            {type === 'instagram' ? (
                                <Button size="sm" onClick={handleOAuthLogin} className={clsx("w-full h-8 text-xs text-white font-bold shadow-sm", bgClass)} disabled={loading}>
                                    {loading ? "Yönlendiriliyor..." : "Instagram ile Bağlan"}
                                </Button>
                            ) : (
                                <Button size="sm" onClick={() => setDialogOpen(true)} className={clsx("w-full h-8 text-xs text-white font-bold shadow-sm", bgClass)}>
                                    Bağla
                                </Button>
                            )}

                            {/* Legacy Link for Instagram */}
                            {type === 'instagram' && (
                                <div className="mt-2 text-center">
                                    <button onClick={() => setDialogOpen(true)} className="text-[10px] text-slate-400 hover:text-slate-700 underline transition-colors">
                                        Gelişmiş Seçenekler
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Connect Dialog */}
            <SimpleDialog
                isOpen={isDialogOpen}
                onClose={() => setDialogOpen(false)}
                title={`${type === "whatsapp" ? "WhatsApp" : "Instagram (Manuel)"} Bağla`}
            >
                <form onSubmit={handleConnectLegacy} className="space-y-4">
                    <p className="text-sm text-gray-400 mb-4">
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
