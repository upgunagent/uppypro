"use client";

import { useState, useEffect } from "react";
import { sendAdminNotification, getAllTenants, getAdminNotificationReports, deleteAdminNotificationReport } from "@/app/actions/notifications";
import { Bell, Send, Users, Building2, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Trash2, Eye, EyeOff } from "lucide-react";
import * as Tabs from "@radix-ui/react-tabs";

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

    // Reports state
    const [activeTab, setActiveTab] = useState<string>("send");
    const [reports, setReports] = useState<any[]>([]);
    const [loadingReports, setLoadingReports] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const fetchTenants = async () => {
            const { tenants: data } = await getAllTenants();
            setTenants(data);
        };
        fetchTenants();
    }, []);

    const fetchReports = async () => {
        setLoadingReports(true);
        const { reports: data } = await getAdminNotificationReports();
        if (data) setReports(data);
        setLoadingReports(false);
    };

    useEffect(() => {
        if (activeTab === "reports") {
            fetchReports();
        }
    }, [activeTab]);

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
                // Also fetch reports in background so they are ready
                fetchReports();
            } else {
                setResult({ success: false, message: res.error || "Bir hata oluştu." });
            }
        } catch {
            setResult({ success: false, message: "Beklenmeyen bir hata oluştu." });
        }
        setLoading(false);
    };

    const handleDeleteReport = async (batchId: string, ids: string[]) => {
        if (!window.confirm("Bu raporu ve gönderilen bildirimleri silmek istediğinize emin misiniz?")) return;
        setReports(prev => prev.filter(r => r.batchId !== batchId));
        await deleteAdminNotificationReport(ids);
    };

    const toggleRow = (batchId: string) => {
        setExpandedRows(prev => ({ ...prev, [batchId]: !prev[batchId] }));
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    };

    return (
        <div className="p-6 md:p-10 max-w-4xl">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
                    <Bell className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Bildirim Yönetimi</h1>
                    <p className="text-sm text-slate-500">İşletmelere bildirim gönderin ve geçmişi görüntüleyin.</p>
                </div>
            </div>

            <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
                {/* Tabs Toggle */}
                <Tabs.List className="flex border-b border-slate-200 mb-8 w-full">
                    <Tabs.Trigger
                        value="send"
                        className="px-6 py-3 text-sm font-bold border-b-2 transition-colors data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 data-[state=inactive]:border-transparent data-[state=inactive]:text-slate-500 hover:text-slate-700"
                    >
                        Bildirim Gönder
                    </Tabs.Trigger>
                    <Tabs.Trigger
                        value="reports"
                        className="px-6 py-3 text-sm font-bold border-b-2 transition-colors data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 data-[state=inactive]:border-transparent data-[state=inactive]:text-slate-500 hover:text-slate-700"
                    >
                        Bildirim Raporları
                    </Tabs.Trigger>
                </Tabs.List>

                {/* Send Tab */}
                <Tabs.Content value="send" className="space-y-6 max-w-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Target Selection */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Users className="w-4 h-4" /> Hedef Kitle
                            </h2>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setSendToAll(true); setSelectedTenantId(""); }}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${sendToAll
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
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${!sendToAll
                                        ? "border-orange-500 bg-orange-50 text-orange-700"
                                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                        }`}
                                >
                                    <Building2 className="w-4 h-4" />
                                    Belirli İşletmeye
                                </button>
                            </div>

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
                </Tabs.Content>

                {/* Reports Tab */}
                <Tabs.Content value="reports" className="space-y-4">
                    {loadingReports ? (
                        <div className="flex justify-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
                        </div>
                    ) : reports.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-2xl border border-slate-200">
                            <Bell className="w-16 h-16 mb-4 opacity-30" />
                            <p className="text-lg font-medium">Henüz gönderilmiş bildirim yok</p>
                            <p className="text-sm">Bildirim gönderdiğinizde raporlar burada görünecek.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {reports.map((report) => {
                                const isExpanded = expandedRows[report.batchId];

                                return (
                                    <div key={report.batchId} className="bg-white border text-sm border-slate-200 rounded-2xl overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md relative">
                                        <div className="p-5">

                                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">

                                                {/* Report Left: Info */}
                                                <div className="flex-1 min-w-0 pr-10">
                                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                                        {report.isBulk ? (
                                                            <span className="px-2 py-1 text-[10px] font-bold tracking-wide uppercase bg-purple-100 text-purple-700 rounded-md">
                                                                Toplu Gönderim
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-1 text-[10px] font-bold tracking-wide uppercase bg-blue-100 text-blue-700 rounded-md">
                                                                Tekil Gönderim
                                                            </span>
                                                        )}
                                                        <span className="text-xs font-semibold text-slate-500">
                                                            {formatDate(report.created_at)}
                                                        </span>
                                                    </div>

                                                    <h3 className="text-base font-bold text-slate-800 mb-1">{report.title}</h3>

                                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-3 bg-slate-50 w-fit px-3 py-1.5 rounded-lg border border-slate-100">
                                                        <Users className="w-3.5 h-3.5" />
                                                        Hedef: {report.tenantName} {report.isBulk && `(${report.targetCount} İşletme)`}
                                                    </div>

                                                    {/* Preview Message */}
                                                    {!isExpanded && (
                                                        <p className="text-slate-600 line-clamp-2 cursor-pointer hover:text-slate-800 transition-colors" onClick={() => toggleRow(report.batchId)}>
                                                            {report.message}
                                                        </p>
                                                    )}

                                                    {/* Full Message */}
                                                    {isExpanded && (
                                                        <div className="mt-3 p-4 bg-orange-50/50 rounded-xl border border-orange-100 text-slate-700 whitespace-pre-wrap leading-relaxed animate-in fade-in slide-in-from-top-2">
                                                            {report.message}
                                                        </div>
                                                    )}

                                                    <button
                                                        onClick={() => toggleRow(report.batchId)}
                                                        className="mt-2 text-xs font-semibold text-orange-600 flex items-center gap-1 hover:text-orange-700 transition-colors"
                                                    >
                                                        {isExpanded ? (
                                                            <><ChevronUp className="w-3 h-3" /> İçeriği Gizle</>
                                                        ) : (
                                                            <><ChevronDown className="w-3 h-3" /> Tamamını Görüntüle</>
                                                        )}
                                                    </button>
                                                </div>

                                                {/* Report Right: Stats */}
                                                <div className="flex-shrink-0 flex flex-row md:flex-col gap-3 min-w-[200px]">
                                                    <div className="flex-1 bg-green-50 border border-green-100 rounded-xl p-3 flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                                                            <Eye className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-semibold text-green-700 uppercase tracking-wider">Okunan</p>
                                                            <p className="text-xl font-bold text-green-800">{report.readCount}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                                                            <EyeOff className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Okunmayan</p>
                                                            <p className="text-xl font-bold text-slate-700">{report.unreadCount}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                            </div>

                                            {/* Absolute Delete Button */}
                                            <button
                                                onClick={() => handleDeleteReport(report.batchId, report.ids)}
                                                className="absolute top-4 right-4 text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors z-10"
                                                title="Raporu Sil"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </Tabs.Content>
            </Tabs.Root>
        </div>
    );
}
