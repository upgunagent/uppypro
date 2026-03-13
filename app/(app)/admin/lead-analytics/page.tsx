"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    BarChart3, Users, Mail, MousePointerClick, Eye, TrendingUp,
    Send, AlertTriangle, CheckCircle2, XCircle, Loader2,
    ArrowUpRight, ArrowDownRight, Target, Building2
} from "lucide-react";

interface CampaignStat {
    id: string;
    name: string;
    status: string;
    total_count: number;
    sent_count: number;
    failed_count: number;
    open_count: number;
    click_count: number;
    created_at: string;
}

interface SectorStat {
    sector_name: string;
    count: number;
}

interface DailyCount {
    date: string;
    count: number;
}

export default function LeadAnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalLeads: 0,
        totalWithEmail: 0,
        totalContacted: 0,
        totalSent: 0,
        totalOpened: 0,
        totalClicked: 0,
        totalBounced: 0,
        totalCampaigns: 0,
    });
    const [campaigns, setCampaigns] = useState<CampaignStat[]>([]);
    const [sectorStats, setSectorStats] = useState<SectorStat[]>([]);
    const [dailySends, setDailySends] = useState<DailyCount[]>([]);
    const [statusDistribution, setStatusDistribution] = useState<Record<string, number>>({});

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        const supabase = createClient();

        // Total leads
        const { count: totalLeads } = await supabase
            .from("leads")
            .select("id", { count: "exact", head: true });

        // Leads with email
        const { count: totalWithEmail } = await supabase
            .from("leads")
            .select("id", { count: "exact", head: true })
            .eq("email_missing", false);

        // Contacted leads
        const { count: totalContacted } = await supabase
            .from("leads")
            .select("id", { count: "exact", head: true })
            .eq("status", "contacted");

        // Campaigns
        const { data: campaignData } = await supabase
            .from("lead_campaigns")
            .select("id, name, status, total_count, sent_count, failed_count, open_count, click_count, created_at")
            .order("created_at", { ascending: false })
            .limit(20);

        // Campaign sends aggregate
        const { count: totalSent } = await supabase
            .from("lead_campaign_sends")
            .select("id", { count: "exact", head: true })
            .eq("status", "sent");

        const { count: totalOpened } = await supabase
            .from("lead_campaign_sends")
            .select("id", { count: "exact", head: true })
            .not("opened_at", "is", null);

        const { count: totalClicked } = await supabase
            .from("lead_campaign_sends")
            .select("id", { count: "exact", head: true })
            .not("clicked_at", "is", null);

        const { count: totalFailed } = await supabase
            .from("lead_campaign_sends")
            .select("id", { count: "exact", head: true })
            .eq("status", "failed");

        // Sector distribution (top 10)
        const { data: sectorData } = await supabase
            .from("leads")
            .select("sector_name")
            .not("sector_name", "is", null);

        const sectorCounts: Record<string, number> = {};
        (sectorData || []).forEach((l: any) => {
            if (l.sector_name) {
                sectorCounts[l.sector_name] = (sectorCounts[l.sector_name] || 0) + 1;
            }
        });
        const sortedSectors = Object.entries(sectorCounts)
            .map(([sector_name, count]) => ({ sector_name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Status distribution
        const { data: statusData } = await supabase
            .from("leads")
            .select("status");

        const statusCounts: Record<string, number> = {};
        (statusData || []).forEach((l: any) => {
            const s = l.status || "new";
            statusCounts[s] = (statusCounts[s] || 0) + 1;
        });

        // Daily sends (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const { data: sendsByDay } = await supabase
            .from("lead_campaign_sends")
            .select("sent_at")
            .gte("sent_at", thirtyDaysAgo.toISOString())
            .eq("status", "sent");

        const dailyCounts: Record<string, number> = {};
        (sendsByDay || []).forEach((s: any) => {
            const date = new Date(s.sent_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" });
            dailyCounts[date] = (dailyCounts[date] || 0) + 1;
        });
        const dailyArray = Object.entries(dailyCounts)
            .map(([date, count]) => ({ date, count }))
            .slice(-30);

        setStats({
            totalLeads: totalLeads || 0,
            totalWithEmail: totalWithEmail || 0,
            totalContacted: totalContacted || 0,
            totalSent: totalSent || 0,
            totalOpened: totalOpened || 0,
            totalClicked: totalClicked || 0,
            totalBounced: totalFailed || 0,
            totalCampaigns: (campaignData || []).length,
        });
        setCampaigns(campaignData || []);
        setSectorStats(sortedSectors);
        setStatusDistribution(statusCounts);
        setDailySends(dailyArray);
        setLoading(false);
    };

    const openRate = stats.totalSent > 0 ? ((stats.totalOpened / stats.totalSent) * 100).toFixed(1) : "0";
    const clickRate = stats.totalSent > 0 ? ((stats.totalClicked / stats.totalSent) * 100).toFixed(1) : "0";
    const bounceRate = stats.totalSent > 0 ? ((stats.totalBounced / (stats.totalSent + stats.totalBounced)) * 100).toFixed(1) : "0";

    const STATUS_LABELS: Record<string, { label: string; color: string }> = {
        new: { label: "Yeni", color: "bg-blue-500" },
        contacted: { label: "İletişime Geçildi", color: "bg-purple-500" },
        demo_scheduled: { label: "Demo Planlandı", color: "bg-indigo-500" },
        proposal: { label: "Teklif Verildi", color: "bg-amber-500" },
        won: { label: "Kazanıldı", color: "bg-green-500" },
        lost: { label: "Kaybedildi", color: "bg-red-500" },
        archived: { label: "Arşivlendi", color: "bg-slate-400" },
    };

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Loader2 size={32} className="animate-spin text-orange-500 mx-auto mb-3" />
                    <p className="text-slate-400">Raporlar yükleniyor...</p>
                </div>
            </div>
        );
    }

    const maxDaily = Math.max(...dailySends.map(d => d.count), 1);
    const maxSector = Math.max(...sectorStats.map(s => s.count), 1);
    const totalStatusCount = Object.values(statusDistribution).reduce((a, b) => a + b, 0) || 1;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <BarChart3 className="text-orange-500" /> Lead Raporları
                </h1>
                <p className="text-slate-500 mt-1">Lead ve kampanya performansını analiz edin</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <SummaryCard
                    icon={<Users size={20} className="text-blue-500" />}
                    label="Toplam Lead"
                    value={stats.totalLeads}
                    sub={`${stats.totalWithEmail} e-posta mevcut`}
                    color="blue"
                />
                <SummaryCard
                    icon={<Send size={20} className="text-emerald-500" />}
                    label="Gönderilen"
                    value={stats.totalSent}
                    sub={`${stats.totalCampaigns} kampanya`}
                    color="emerald"
                />
                <SummaryCard
                    icon={<Eye size={20} className="text-purple-500" />}
                    label="Açılma Oranı"
                    value={`%${openRate}`}
                    sub={`${stats.totalOpened} açıldı`}
                    color="purple"
                />
                <SummaryCard
                    icon={<MousePointerClick size={20} className="text-orange-500" />}
                    label="Tıklama Oranı"
                    value={`%${clickRate}`}
                    sub={`${stats.totalClicked} tıklandı`}
                    color="orange"
                />
            </div>

            {/* Second row of cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <SummaryCard
                    icon={<CheckCircle2 size={20} className="text-green-500" />}
                    label="İletişime Geçilen"
                    value={stats.totalContacted}
                    sub="lead"
                    color="green"
                />
                <SummaryCard
                    icon={<XCircle size={20} className="text-red-500" />}
                    label="Başarısız"
                    value={stats.totalBounced}
                    sub={`%${bounceRate} hata oranı`}
                    color="red"
                />
                <SummaryCard
                    icon={<Target size={20} className="text-amber-500" />}
                    label="E-posta Mevcut"
                    value={stats.totalWithEmail}
                    sub={`%${stats.totalLeads > 0 ? ((stats.totalWithEmail / stats.totalLeads) * 100).toFixed(0) : 0}`}
                    color="amber"
                />
                <SummaryCard
                    icon={<TrendingUp size={20} className="text-indigo-500" />}
                    label="Kampanyalar"
                    value={stats.totalCampaigns}
                    sub="toplam"
                    color="indigo"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Daily sends chart */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6">
                    <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                        <TrendingUp size={16} className="text-emerald-500" />
                        Son 30 Gün Gönderim
                    </h2>
                    {dailySends.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-sm">Henüz gönderim verisi yok</div>
                    ) : (
                        <div className="flex items-end gap-1 h-40">
                            {dailySends.map((d, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center justify-end group relative">
                                    <div
                                        className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-sm transition-all hover:from-emerald-600 hover:to-emerald-500 cursor-pointer min-h-[2px]"
                                        style={{ height: `${(d.count / maxDaily) * 100}%` }}
                                        title={`${d.date}: ${d.count} gönderim`}
                                    />
                                    <div className="absolute -top-8 bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                        {d.date}: {d.count}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Lead Status Distribution */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6">
                    <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                        <Target size={16} className="text-blue-500" />
                        Lead Durum Dağılımı
                    </h2>
                    <div className="space-y-3">
                        {Object.entries(statusDistribution)
                            .sort((a, b) => b[1] - a[1])
                            .map(([status, count]) => {
                                const info = STATUS_LABELS[status] || { label: status, color: "bg-slate-400" };
                                const pct = ((count / totalStatusCount) * 100).toFixed(1);
                                return (
                                    <div key={status}>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-slate-600 font-medium">{info.label}</span>
                                            <span className="text-slate-400">{count} (%{pct})</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${info.color} rounded-full transition-all`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Sector Distribution */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6">
                    <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                        <Building2 size={16} className="text-violet-500" />
                        Sektör Dağılımı (İlk 10)
                    </h2>
                    {sectorStats.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-sm">Sektör verisi yok</div>
                    ) : (
                        <div className="space-y-2.5">
                            {sectorStats.map((s, i) => (
                                <div key={i}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-600 font-medium truncate mr-2">{s.sector_name}</span>
                                        <span className="text-slate-400 flex-shrink-0">{s.count}</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all"
                                            style={{ width: `${(s.count / maxSector) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Campaign Performance */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6">
                    <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                        <Mail size={16} className="text-orange-500" />
                        Kampanya Performansı
                    </h2>
                    {campaigns.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-sm">Henüz kampanya yok</div>
                    ) : (
                        <div className="space-y-3 max-h-80 overflow-y-auto">
                            {campaigns.map(c => {
                                const campOpenRate = c.sent_count > 0 ? ((c.open_count / c.sent_count) * 100).toFixed(0) : "0";
                                const campClickRate = c.sent_count > 0 ? ((c.click_count / c.sent_count) * 100).toFixed(0) : "0";
                                return (
                                    <div key={c.id} className="border border-slate-100 rounded-xl p-3 hover:bg-slate-50/50 transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-slate-700 truncate mr-2">{c.name}</span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                                c.status === "completed" ? "bg-green-100 text-green-700" :
                                                c.status === "sending" ? "bg-blue-100 text-blue-700" :
                                                c.status === "failed" ? "bg-red-100 text-red-700" :
                                                "bg-slate-100 text-slate-600"
                                            }`}>
                                                {c.status === "completed" ? "Tamamlandı" :
                                                 c.status === "sending" ? "Gönderiliyor" :
                                                 c.status === "failed" ? "Başarısız" : c.status}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-4 gap-2 text-center">
                                            <div>
                                                <p className="text-lg font-bold text-slate-700">{c.sent_count}</p>
                                                <p className="text-[10px] text-slate-400">Gönderilen</p>
                                            </div>
                                            <div>
                                                <p className="text-lg font-bold text-purple-600">{c.open_count}</p>
                                                <p className="text-[10px] text-slate-400">Açılan</p>
                                            </div>
                                            <div>
                                                <p className="text-lg font-bold text-orange-600">{c.click_count}</p>
                                                <p className="text-[10px] text-slate-400">Tıklanan</p>
                                            </div>
                                            <div>
                                                <p className="text-lg font-bold text-red-500">{c.failed_count}</p>
                                                <p className="text-[10px] text-slate-400">Başarısız</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <Eye size={10} /> %{campOpenRate} açılma
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <MousePointerClick size={10} /> %{campClickRate} tıklama
                                            </span>
                                            <span className="ml-auto">
                                                {new Date(c.created_at).toLocaleDateString("tr-TR")}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Summary Card Component
function SummaryCard({ icon, label, value, sub, color }: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    sub: string;
    color: string;
}) {
    const bgMap: Record<string, string> = {
        blue: "from-blue-50 to-blue-100/50 border-blue-200",
        emerald: "from-emerald-50 to-emerald-100/50 border-emerald-200",
        purple: "from-purple-50 to-purple-100/50 border-purple-200",
        orange: "from-orange-50 to-orange-100/50 border-orange-200",
        green: "from-green-50 to-green-100/50 border-green-200",
        red: "from-red-50 to-red-100/50 border-red-200",
        amber: "from-amber-50 to-amber-100/50 border-amber-200",
        indigo: "from-indigo-50 to-indigo-100/50 border-indigo-200",
    };

    return (
        <div className={`bg-gradient-to-br ${bgMap[color] || bgMap.blue} border rounded-2xl p-4`}>
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <span className="text-xs font-medium text-slate-500">{label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
        </div>
    );
}
