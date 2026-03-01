"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageCircle, Instagram, CheckCircle, ChevronDown, ChevronUp, Zap, AlertCircle, Loader2, Link2Off } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SimpleDialog } from "@/components/ui/simple-dialog";
import { connectChannelAction, disconnectChannelAction, type ConnectPayload } from "@/app/actions/channels";
import { clsx } from "clsx";
import { useRouter } from "next/navigation";

// Facebook SDK type declarations
declare global {
    interface Window {
        FB: {
            init: (options: object) => void;
            login: (callback: (response: any) => void, options: object) => void;
        };
        fbAsyncInit: () => void;
    }
}

interface ChannelCardProps {
    type: "whatsapp" | "instagram";
    connection: any;
}

type WizardStep = "idle" | "launching" | "waiting_meta" | "processing" | "success" | "error";

export function ChannelCard({ type, connection }: ChannelCardProps) {
    const isConnected = connection?.status === "connected";
    const [loading, setLoading] = useState(false);
    const [wizardStep, setWizardStep] = useState<WizardStep>("idle");
    const [wizardError, setWizardError] = useState<string>("");
    const [showLegacyDialog, setShowLegacyDialog] = useState(false);
    const [showLegacyToggle, setShowLegacyToggle] = useState(false);
    const router = useRouter();

    // Legacy form state
    const [token, setToken] = useState("");
    const [phoneId, setPhoneId] = useState("");
    const [wabaId, setWabaId] = useState("");
    const [pageId, setPageId] = useState("");

    const CONFIG_ID = process.env.NEXT_PUBLIC_FACEBOOK_LOGIN_CONFIG_ID;
    const isWhatsApp = type === "whatsapp";

    // --- WhatsApp Embedded Signup ---
    const launchEmbeddedSignup = useCallback(() => {
        if (!window.FB) {
            setWizardError("Facebook SDK yüklenemedi. Sayfayı yenileyip tekrar deneyin.");
            setWizardStep("error");
            return;
        }

        setWizardStep("waiting_meta");
        setWizardError("");

        window.FB.login(
            function (response: any) {
                if (response.authResponse) {
                    const { code } = response.authResponse;

                    // sessionInfoListener callback verileri
                    const sessionInfo = (window as any).__embeddedSignupSessionInfo;

                    if (!sessionInfo?.waba_id || !sessionInfo?.phone_number_id) {
                        // Fallback: code var ama session info yok — manual entry gerekebilir
                        setWizardError("WhatsApp hesap bilgileri alınamadı. Lütfen tekrar deneyin.");
                        setWizardStep("error");
                        return;
                    }

                    handleEmbeddedSignupCallback(code, sessionInfo.waba_id, sessionInfo.phone_number_id);
                } else {
                    // Kullanıcı popup'ı kapattı
                    setWizardStep("idle");
                }
            },
            {
                config_id: CONFIG_ID,
                response_type: "code",
                override_default_response_type: true,
                extras: {
                    setup: {},
                    featureType: "",
                    sessionInfoVersion: "3",
                },
            }
        );
    }, [CONFIG_ID]);

    // sessionInfoListener — Meta SDK popup'tan WABA ve phone id bilgilerini yakalar
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== "https://www.facebook.com" && event.origin !== "https://web.facebook.com") return;

            try {
                const data = JSON.parse(event.data);
                if (data.type === "WA_EMBEDDED_SIGNUP") {
                    if (data.event === "FINISH") {
                        const { phone_number_id, waba_id } = data.data;
                        // Store session info for FB.login callback
                        (window as any).__embeddedSignupSessionInfo = { phone_number_id, waba_id };
                    } else if (data.event === "CANCEL") {
                        setWizardStep("idle");
                    } else if (data.event === "ERROR") {
                        setWizardError(data.data?.error_message || "Meta'dan hata geldi.");
                        setWizardStep("error");
                    }
                }
            } catch {
                // ignore non-JSON messages
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    const handleEmbeddedSignupCallback = async (code: string, wabaId: string, phoneNumberId: string) => {
        setWizardStep("processing");
        try {
            const res = await fetch("/api/whatsapp/embedded-signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code, waba_id: wabaId, phone_number_id: phoneNumberId }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || "Bağlantı kurulamadı.");
            }

            setWizardStep("success");
            setTimeout(() => {
                router.refresh();
            }, 1500);
        } catch (error: any) {
            setWizardError(error.message || "Beklenmeyen bir hata oluştu.");
            setWizardStep("error");
        }
    };

    // --- Instagram OAuth ---
    const handleOAuthLogin = () => {
        setLoading(true);
        router.push("/api/integrations/instagram/login/start");
    };

    // --- Legacy Manual Connect ---
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
            if (!result?.success) throw new Error(result?.error || "Bilinmeyen bir hata oluştu.");
            setShowLegacyDialog(false);
            router.refresh();
        } catch (error) {
            alert(error instanceof Error ? error.message : "Bağlantı hatası!");
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm("Bağlantıyı kesmek istediğinize emin misiniz?")) return;
        setLoading(true);
        try {
            await disconnectChannelAction(type);
            router.refresh();
        } catch (error) {
            alert("Bağlantı kesilemedi.");
        } finally {
            setLoading(false);
        }
    };

    // --- Styles ---
    const cardClass = isWhatsApp
        ? "bg-gradient-to-br from-green-500 to-emerald-700 text-white shadow-xl shadow-green-900/20 border-green-400/20"
        : "bg-gradient-to-br from-red-500 via-rose-600 to-rose-800 text-white shadow-xl shadow-red-900/20 border-red-400/20";

    const buttonClass = isWhatsApp
        ? "bg-white text-emerald-700 hover:bg-emerald-50"
        : "bg-white text-rose-700 hover:bg-rose-50";

    const Icon = isWhatsApp ? MessageCircle : Instagram;

    const displayIdentifier = type === "instagram" && connection?.meta_identifiers?.username
        ? `@${connection.meta_identifiers.username}`
        : connection?.meta_identifiers?.display_phone_number
            ? connection.meta_identifiers.display_phone_number
            : connection?.meta_identifiers?.mock_id || "ID: ***";

    // WhatsApp Wizard Content
    const renderWhatsAppContent = () => {
        if (isConnected) {
            return (
                <div className="space-y-4">
                    <div className="px-4 py-2 bg-black/10 rounded-lg border border-white/10 backdrop-blur-sm">
                        <p className="text-xs text-white/80 uppercase tracking-wider font-bold mb-0.5">Bağlı Hesap</p>
                        <p className="text-sm font-semibold truncate text-white">{displayIdentifier}</p>
                        {connection?.meta_identifiers?.signup_method === "embedded_signup" && (
                            <span className="text-xs text-white/60">via Embedded Signup</span>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDisconnect}
                        className="w-full h-9 text-xs bg-white/10 hover:bg-white/20 text-white border border-white/20"
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Link2Off className="w-3 h-3 mr-2" />}
                        Bağlantıyı Sonlandır
                    </Button>
                </div>
            );
        }

        if (wizardStep === "idle") {
            return (
                <div className="space-y-3">
                    <p className="text-sm text-white/80 leading-relaxed">
                        WhatsApp Business hesabınızı birkaç tıklamayla bağlayın.
                    </p>
                    <Button
                        size="sm"
                        onClick={launchEmbeddedSignup}
                        className={clsx("w-full h-10 font-bold shadow-lg border-2 border-transparent gap-2", buttonClass)}
                    >
                        <Zap className="w-4 h-4" />
                        WhatsApp'ı Bağla
                    </Button>
                    <button
                        onClick={() => setShowLegacyToggle(!showLegacyToggle)}
                        className="text-xs text-white/50 hover:text-white/70 flex items-center gap-1 transition-colors"
                    >
                        {showLegacyToggle ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        Manuel bağlantı
                    </button>
                    {showLegacyToggle && (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowLegacyDialog(true)}
                            className="w-full h-8 text-xs text-white/70 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20"
                        >
                            Manuel Bağla (Access Token)
                        </Button>
                    )}
                </div>
            );
        }

        if (wizardStep === "waiting_meta" || wizardStep === "launching") {
            return (
                <div className="flex items-center gap-3 py-2">
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                    <p className="text-sm text-white/90 font-medium">Meta penceresi açıldı...</p>
                </div>
            );
        }

        if (wizardStep === "processing") {
            return (
                <div className="flex items-center gap-3 py-2">
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                    <div>
                        <p className="text-sm text-white/90 font-medium">Bağlantı kuruluyor...</p>
                        <p className="text-xs text-white/60">Token alınıyor, hesap kaydediliyor</p>
                    </div>
                </div>
            );
        }

        if (wizardStep === "success") {
            return (
                <div className="flex items-center gap-3 py-2">
                    <CheckCircle className="w-5 h-5 text-white" />
                    <p className="text-sm text-white font-bold">Başarıyla bağlandı! 🎉</p>
                </div>
            );
        }

        if (wizardStep === "error") {
            return (
                <div className="space-y-3">
                    <div className="flex items-start gap-2 bg-red-900/40 rounded-lg p-3 border border-red-300/20">
                        <AlertCircle className="w-4 h-4 text-red-200 mt-0.5 shrink-0" />
                        <p className="text-xs text-red-100">{wizardError || "Bağlantı hatası."}</p>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => { setWizardStep("idle"); setWizardError(""); }}
                        className={clsx("w-full h-9 font-bold", buttonClass)}
                    >
                        Tekrar Dene
                    </Button>
                </div>
            );
        }

        return null;
    };

    return (
        <>
            <div className={clsx(
                "p-6 rounded-2xl border flex flex-col justify-between min-h-[15rem] relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]",
                cardClass
            )}>
                {/* Decorative Pattern */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

                <div className="flex justify-between items-start z-10 relative">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner border border-white/10">
                            <Icon className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h4 className="font-bold text-xl tracking-tight capitalize">{type}</h4>
                            <div className="flex items-center gap-1.5 opacity-90">
                                <span className={clsx("w-2 h-2 rounded-full", isConnected ? "bg-white animate-pulse" : "bg-white/40")} />
                                <p className="text-xs font-medium">{isConnected ? "Sistem Aktif" : "Bağlantı Yok"}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 z-10 relative">
                    {isWhatsApp ? renderWhatsAppContent() : (
                        isConnected ? (
                            <div className="space-y-4">
                                <div className="px-4 py-2 bg-black/10 rounded-lg border border-white/10 backdrop-blur-sm">
                                    <p className="text-xs text-white/80 uppercase tracking-wider font-bold mb-0.5">Bağlı Hesap</p>
                                    <p className="text-sm font-semibold truncate text-white">{displayIdentifier}</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={handleDisconnect}
                                    className="w-full h-9 text-xs bg-white/10 hover:bg-white/20 text-white border border-white/20"
                                    disabled={loading}>
                                    {loading ? "İşleniyor..." : "Bağlantıyı Sonlandır"}
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-sm text-white/80 leading-relaxed">Instagram DM kutunuzu CRM sisteminize entegre edin.</p>
                                <Button size="sm" onClick={handleOAuthLogin}
                                    className={clsx("w-full h-10 font-bold shadow-lg border-2 border-transparent", buttonClass)}
                                    disabled={loading}>
                                    {loading ? "Yönlendiriliyor..." : "Instagram ile Bağlan"}
                                </Button>
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Legacy Manual Connect Dialog (WhatsApp) */}
            <SimpleDialog
                isOpen={showLegacyDialog}
                onClose={() => setShowLegacyDialog(false)}
                title="WhatsApp Manuel Bağla"
            >
                <form onSubmit={handleConnectLegacy} className="space-y-4">
                    <p className="text-sm text-gray-500 mb-4">
                        Meta Developer Portal'dan aldığınız bilgileri giriniz.
                    </p>
                    <div className="space-y-2">
                        <Label>Phone Number ID</Label>
                        <Input required value={phoneId} onChange={e => setPhoneId(e.target.value)} placeholder="100609..." />
                    </div>
                    <div className="space-y-2">
                        <Label>WABA ID</Label>
                        <Input required value={wabaId} onChange={e => setWabaId(e.target.value)} placeholder="100..." />
                    </div>
                    <div className="space-y-2">
                        <Label>Access Token (System User)</Label>
                        <Input required type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="EAAG..." />
                    </div>
                    <Button
                        type="submit"
                        className="w-full text-white font-bold shadow-md h-11 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                        disabled={loading}
                    >
                        {loading ? "Bağlanıyor..." : "Kaydet ve Bağla"}
                    </Button>
                </form>
            </SimpleDialog>
        </>
    );
}
