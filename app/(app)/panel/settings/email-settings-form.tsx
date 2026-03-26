"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Mail, Save, Loader2, CheckCircle2, XCircle, Plug } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useState, useRef } from "react";
import { updateEmailSettings, testSmtpConnectionAction } from "./email-actions";

export function EmailSettingsForm({ settings }: { settings: any }) {
    const formRef = useRef<HTMLFormElement>(null);
    const [loading, setLoading] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [smtpEnabled, setSmtpEnabled] = useState(settings?.smtp_enabled || false);
    const { toast } = useToast();

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

    return (
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
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>SMTP Sunucu</Label>
                            <Input
                                name="smtpHost"
                                placeholder="smtp.gmail.com"
                                defaultValue={settings?.smtp_host || ""}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Port</Label>
                            <Input
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
    );
}
