"use client";

import { useState, useEffect } from "react";
import { sendAdminNotification, getAllTenants } from "@/app/actions/notifications";
import { Bell, Send, Users, Building2, CheckCircle, AlertCircle } from "lucide-react";

interface Tenant {
    id: string;
    name: string;
}

export default function AdminNotificationsPage() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [selectedTenantId, setSelectedTenantId] = useState<string>("");
    const [sendToAll, setSendToAll] = useState(false);
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    useEffect(() => {
        const fetchTenants = async () => {
            const { tenants: data } = await getAllTenants();
            setTenants(data);
        };
        fetchTenants();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !message.trim()) return;
        if (!sendToAll && !selectedTenantId) {
            setResult({ success: false, message: "Lütfen bir işletme seçin veya 'Tüm İşletmelere Gönder' seçeneğini işaretleyin." });
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            const res = await sendAdminNotification({
                tenantId: sendToAll ? undefined : selectedTenantId,
                title: title.trim(),
                message: message.trim(),
                sendToAll
            });

            if (res.success) {
                setResult({
                    success: true,
                    message: sendToAll
                        ? `✅ Bildirim ${res.count || "tüm"} işletmeye başarıyla gönderildi!`
                        : "✅ Bildirim başarıyla gönderildi!"
                });
                setTitle("");
                setMessage("");
                setSelectedTenantId("");
                setSendToAll(false);
            } else {
                setResult({ success: false, message: res.error || "Bir hata oluştu." });
            }
        } catch {
            setResult({ success: false, message: "Beklenmeyen bir hata oluştu." });
        }
        setLoading(false);
    };

    return (
        <div className="p-6 md:p-10 max-w-2xl">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
                    <Bell className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Bildirim Gönder</h1>
                    <p className="text-sm text-slate-500">İşletmelere sistem bildirimi veya duyuru gönderin.</p>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Target Selection */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                    <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Users className="w-4 h-4" /> Hedef Kitle
                    </h2>

                    {/* Toggle: All vs Specific */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => { setSendToAll(true); setSelectedTenantId(""); }}
                            className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${sendToAll
                                ? "border-orange-500 bg-orange-50 text-orange-700"
                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                }`}
                        >
                            <Users className="w-4 h-4" />
                            Tüm İşletmelere Gönder
                        </button>
                        <button
                            type="button"
                            onClick={() => setSendToAll(false)}
                            className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${!sendToAll
                                ? "border-orange-500 bg-orange-50 text-orange-700"
                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                }`}
                        >
                            <Building2 className="w-4 h-4" />
                            Belirli Bir İşletmeye
                        </button>
                    </div>

                    {/* Tenant Selector */}
                    {!sendToAll && (
                        <select
                            value={selectedTenantId}
                            onChange={(e) => setSelectedTenantId(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        >
                            <option value="">İşletme seçin...</option>
                            {tenants.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.name}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Title & Message */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                    <div>
                        <label className="text-sm font-bold text-slate-700 mb-1 block">Bildirim Başlığı</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Örn: Yeni Güncelleme Duyurusu"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-slate-700 mb-1 block">Bildirim Mesajı</label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Bildirim içeriğinizi buraya yazın..."
                            rows={4}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                            required
                        />
                    </div>
                </div>

                {/* Result Message */}
                {result && (
                    <div className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium ${result.success
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                        }`}>
                        {result.success ? (
                            <CheckCircle className="w-5 h-5 flex-shrink-0" />
                        ) : (
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        )}
                        {result.message}
                    </div>
                )}

                {/* Submit */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    ) : (
                        <>
                            <Send className="w-5 h-5" />
                            Bildirimi Gönder
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
