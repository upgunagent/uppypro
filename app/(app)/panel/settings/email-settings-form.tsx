"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Mail, Save, Loader2, CheckCircle2, XCircle, Plug, ExternalLink, X, ChevronRight, Info } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useState, useRef } from "react";
import { updateEmailSettings, testSmtpConnectionAction } from "./email-actions";

export function EmailSettingsForm({ settings }: { settings: any }) {
    const formRef = useRef<HTMLFormElement>(null);
    const [loading, setLoading] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [smtpEnabled, setSmtpEnabled] = useState(settings?.smtp_enabled || false);
    const [showGmailGuide, setShowGmailGuide] = useState(false);
    const { toast } = useToast();

    // Form field refs for Gmail auto-fill
    const hostRef = useRef<HTMLInputElement>(null);
    const portRef = useRef<HTMLInputElement>(null);

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        try {
            formData.set("smtpEnabled", smtpEnabled ? "true" : "false");
            const result = await updateEmailSettings(formData);
            if (result?.error) {
                toast({ variant: "destructive", title: "Hata", description: result.error });
            } else {
                toast({ title: "Başarılı", description: "E-posta ayarları güncellendi." });
            }
        } catch {
            toast({ variant: "destructive", title: "Hata", description: "Bir hata oluştu." });
        } finally {
            setLoading(false);
        }
    }

    async function handleTestConnection() {
        if (!formRef.current) return;
        setTesting(true);
        setTestResult(null);
        try {
            const formData = new FormData(formRef.current);
            const result = await testSmtpConnectionAction(formData);
            setTestResult(result);
        } catch {
            setTestResult({ success: false, message: "Test sırasında bir hata oluştu." });
        } finally {
            setTesting(false);
        }
    }

    function handleGmailAutoFill() {
        if (hostRef.current) hostRef.current.value = "smtp.gmail.com";
        if (portRef.current) portRef.current.value = "587";
        setShowGmailGuide(true);
        toast({ title: "Gmail Ayarları Dolduruldu", description: "SMTP sunucu ve port otomatik girildi. Şimdi uygulama şifrenizi oluşturun." });
    }

    return (
        <>
        <form ref={formRef} action={handleSubmit} className="space-y-6">
            <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <Mail className="text-blue-600 w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-lg text-slate-900">E-posta Entegrasyonu (SMTP)</h3>
                        <p className="text-sm text-slate-500">Kurumsal mailinizi bağlayarak randevu onay maillerini kendi adresinizden gönderin.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={smtpEnabled ? "bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200" : "bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-bold border border-slate-200"}>
                            {smtpEnabled ? "Aktif" : "Pasif"}
                        </span>
                        <Switch
                            checked={smtpEnabled}
                            onCheckedChange={setSmtpEnabled}
                            className="data-[state=checked]:bg-green-500"
                        />
                    </div>
                </div>

                <div className={!smtpEnabled ? "opacity-50 pointer-events-none" : ""}>
                    {/* Gmail Quick Setup Button */}
                    <div className="mb-5">
                        <button
                            type="button"
                            onClick={handleGmailAutoFill}
                            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-200 group cursor-pointer"
                        >
                            <div className="w-9 h-9 rounded-lg bg-white shadow-sm border border-slate-200 flex items-center justify-center group-hover:shadow-md transition-shadow">
                                <svg viewBox="0 0 24 24" width="20" height="20">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                </svg>
                            </div>
                            <div className="flex-1 text-left">
                                <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-700">Gmail ile göndermek istiyorum</span>
                                <span className="block text-xs text-slate-400 group-hover:text-blue-500">SMTP ayarları otomatik doldurulur, sadece şifre oluşturmanız yeterli</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>SMTP Sunucu</Label>
                            <Input
                                ref={hostRef}
                                name="smtpHost"
                                placeholder="smtp.gmail.com"
                                defaultValue={settings?.smtp_host || ""}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Port</Label>
                            <Input
                                ref={portRef}
                                name="smtpPort"
                                type="number"
                                placeholder="587"
                                defaultValue={settings?.smtp_port || 587}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="space-y-2">
                            <Label>Kullanıcı Adı (E-posta)</Label>
                            <Input
                                name="smtpUser"
                                placeholder="info@firmaadi.com"
                                defaultValue={settings?.smtp_user || ""}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Şifre</Label>
                            <Input
                                name="smtpPass"
                                type="password"
                                placeholder="••••••••"
                                defaultValue={settings?.smtp_pass_encrypted ? "••••••••" : ""}
                            />
                        </div>
                    </div>

                    <div className="mt-4 space-y-2">
                        <Label>Gönderen Adı</Label>
                        <Input
                            name="smtpFromName"
                            placeholder="Firma Adınız"
                            defaultValue={settings?.smtp_from_name || ""}
                        />
                        <p className="text-xs text-slate-500">Müşteriye giden maillerde bu isim gözükecektir.</p>
                    </div>

                    {/* Test Connection Button */}
                    <div className="mt-4 flex items-center gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleTestConnection}
                            disabled={testing}
                            className="border-blue-200 text-blue-700 hover:bg-blue-50"
                        >
                            {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plug className="w-4 h-4 mr-2" />}
                            {testing ? "Test Ediliyor..." : "Bağlantıyı Test Et"}
                        </Button>
                        {testResult && (
                            <div className={`flex items-center gap-2 text-sm ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                                {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                {testResult.message}
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-white">
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        {loading ? "Kaydediliyor..." : "E-posta Ayarlarını Kaydet"}
                    </Button>
                </div>
            </div>
        </form>

        {/* Gmail Setup Guide Modal */}
        {showGmailGuide && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowGmailGuide(false)}>
                <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-red-500 flex items-center justify-center shadow-md">
                                <Mail className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-slate-900">Gmail Kurulum Rehberi</h3>
                                <p className="text-xs text-slate-500">Uygulama şifresi oluşturma adımları</p>
                            </div>
                        </div>
                        <button onClick={() => setShowGmailGuide(false)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="px-6 py-5 space-y-5">
                        {/* Info Box */}
                        <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-800">
                                <strong>Neden uygulama şifresi gerekli?</strong>
                                <p className="mt-1 text-blue-600">Google, güvenlik amacıyla 3. parti uygulamaların normal şifrenizi kullanmasına izin vermez. Bunun yerine özel bir &quot;Uygulama Şifresi&quot; oluşturmanız gerekir.</p>
                            </div>
                        </div>

                        {/* Auto-filled info */}
                        <div className="flex items-center gap-4 p-3 bg-green-50 rounded-xl border border-green-100">
                            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                            <div className="text-sm">
                                <span className="text-green-800 font-semibold">Otomatik dolduruldu:</span>
                                <span className="text-green-600 ml-2">SMTP: smtp.gmail.com — Port: 587</span>
                            </div>
                        </div>

                        {/* Steps */}
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">1</div>
                                <div>
                                    <p className="font-semibold text-slate-800 text-sm">2 Adımlı Doğrulamayı Açın</p>
                                    <p className="text-xs text-slate-500 mt-1">Google hesabınızda 2 adımlı doğrulama açık olmalıdır. Açık değilse önce bunu etkinleştirin.</p>
                                    <a href="https://myaccount.google.com/signinoptions/two-step-verification" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline">
                                        <ExternalLink className="w-3 h-3" /> Google 2 Adımlı Doğrulama Sayfası
                                    </a>
                                </div>
                            </div>

                            <div className="border-l-2 border-dashed border-slate-200 ml-4 h-3" />

                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">2</div>
                                <div>
                                    <p className="font-semibold text-slate-800 text-sm">Uygulama Şifreleri Sayfasına Gidin</p>
                                    <p className="text-xs text-slate-500 mt-1">Aşağıdaki bağlantıya tıklayarak Google Uygulama Şifreleri sayfasını açın.</p>
                                    <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline">
                                        <ExternalLink className="w-3 h-3" /> Google Uygulama Şifreleri Sayfası
                                    </a>
                                </div>
                            </div>

                            <div className="border-l-2 border-dashed border-slate-200 ml-4 h-3" />

                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">3</div>
                                <div>
                                    <p className="font-semibold text-slate-800 text-sm">Yeni Uygulama Şifresi Oluşturun</p>
                                    <p className="text-xs text-slate-500 mt-1">&quot;Uygulama adı&quot; alanına <strong>UppyPro</strong> yazın ve <strong>&quot;Oluştur&quot;</strong> butonuna tıklayın.</p>
                                </div>
                            </div>

                            <div className="border-l-2 border-dashed border-slate-200 ml-4 h-3" />

                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">4</div>
                                <div>
                                    <p className="font-semibold text-slate-800 text-sm">Şifreyi Kopyalayın</p>
                                    <p className="text-xs text-slate-500 mt-1">Google size <strong>16 haneli bir şifre</strong> gösterecek (örn: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">abcd efgh ijkl mnop</code>). Bu şifreyi kopyalayın.</p>
                                </div>
                            </div>

                            <div className="border-l-2 border-dashed border-slate-200 ml-4 h-3" />

                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">5</div>
                                <div>
                                    <p className="font-semibold text-slate-800 text-sm">Formu Doldurun ve Kaydedin</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Bu pencereyi kapatın ve aşağıdaki bilgileri girin:
                                    </p>
                                    <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
                                        <div className="flex justify-between"><span className="text-slate-500">Kullanıcı Adı:</span><span className="font-mono font-semibold text-slate-800">Gmail adresiniz</span></div>
                                        <div className="flex justify-between"><span className="text-slate-500">Şifre:</span><span className="font-mono font-semibold text-slate-800">Oluşturduğunuz 16 haneli şifre</span></div>
                                        <div className="flex justify-between"><span className="text-slate-500">Gönderen Adı:</span><span className="font-mono font-semibold text-slate-800">Firma adınız</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex justify-end">
                        <Button onClick={() => setShowGmailGuide(false)} className="bg-orange-600 hover:bg-orange-700 text-white">
                            Anladım, Formu Dolduracağım
                        </Button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
