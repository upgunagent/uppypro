"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Search, FileText, ChevronRight, Users, CheckCheck, Check, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface CampaignReportsCardProps {
    tenantId: string;
}

export function CampaignReportsCard({ tenantId }: CampaignReportsCardProps) {
    const [searchTerm, setSearchTerm] = useState("");

    // Fake veri
    const reports = [
        {
            id: "1",
            name: "Sevgililer Günü İndirimi",
            template_name: "sevgililer_gunu_promo",
            status: "COMPLETED",
            created_at: "2026-02-14T10:00:00Z",
            metrics: { total: 1540, sent: 1540, delivered: 1490, read: 1210, failed: 50 }
        },
        {
            id: "2",
            name: "Yeni Ürün Kataloğu Lansmanı",
            template_name: "katalog_duyuru",
            status: "RUNNING",
            created_at: "2026-03-05T09:30:00Z",
            metrics: { total: 5000, sent: 3200, delivered: 2800, read: 1050, failed: 12 }
        },
        {
            id: "3",
            name: "Deneme Gönderimi (Hatalı Şablon)",
            template_name: "test_mesaji",
            status: "FAILED",
            created_at: "2026-01-20T14:15:00Z",
            metrics: { total: 100, sent: 10, delivered: 0, read: 0, failed: 90 }
        }
    ];

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "COMPLETED": return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Tamamlandı</Badge>;
            case "RUNNING": return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Gönderiliyor</Badge>;
            case "FAILED": return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Hatalı</Badge>;
            case "DRAFT": return <Badge variant="secondary">Taslak</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    const calculateRate = (value: number, total: number) => {
        if (total === 0) return 0;
        return Math.round((value / total) * 100);
    };

    return (
        <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
                <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <BarChart className="w-5 h-5 text-primary" />
                        Kampanya Raporları
                    </CardTitle>
                    <CardDescription>
                        Geçmiş toplu gönderimlerinizin performansını ve teslimat oranlarını (Mavi Tik vb.) canlı olarak izleyin.
                    </CardDescription>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder="Kampanya Ara..."
                            className="pl-9 w-full sm:w-[250px]"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select defaultValue="all">
                        <SelectTrigger className="w-full sm:w-[150px]">
                            <SelectValue placeholder="Tüm Zamanlar" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tüm Zamanlar</SelectItem>
                            <SelectItem value="today">Bugün</SelectItem>
                            <SelectItem value="week">Bu Hafta</SelectItem>
                            <SelectItem value="month">Bu Ay</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {reports.map((report) => (
                        <div key={report.id} className="border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-sm transition-all bg-white group cursor-pointer">

                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">

                                {/* Sol Taraf: Bilgiler */}
                                <div className="space-y-2 lg:w-1/3">
                                    <div className="flex items-center gap-2 mb-1">
                                        {getStatusBadge(report.status)}
                                        <span className="text-xs text-slate-400 font-medium">
                                            {format(new Date(report.created_at), "d MMM yyyy, HH:mm", { locale: tr })}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-slate-900 text-base">{report.name}</h3>
                                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                                        <FileText className="w-4 h-4" />
                                        Şablon: <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{report.template_name}</span>
                                    </div>
                                </div>

                                {/* Orta Taraf: Metrik Çubukları */}
                                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">

                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                                            <Users className="w-3.5 h-3.5" /> Hedef Kitle
                                        </div>
                                        <div className="font-semibold text-lg text-slate-700">{report.metrics.total.toLocaleString("tr-TR")}</div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                                            <Check className="w-3.5 h-3.5 text-slate-400" /> WhatsApp'a İletilen
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="font-semibold text-lg text-slate-700">{report.metrics.sent.toLocaleString("tr-TR")}</span>
                                            <span className="text-[10px] text-slate-400">%{calculateRate(report.metrics.sent, report.metrics.total)}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                            <div className="bg-slate-300 h-full rounded-full" style={{ width: `${calculateRate(report.metrics.sent, report.metrics.total)}%` }} />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                                            <CheckCheck className="w-3.5 h-3.5 text-slate-400" /> Telefona Ulaşan
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="font-semibold text-lg text-slate-700">{report.metrics.delivered.toLocaleString("tr-TR")}</span>
                                            <span className="text-[10px] text-slate-400">%{calculateRate(report.metrics.delivered, report.metrics.sent)}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                            <div className="bg-slate-400 h-full rounded-full" style={{ width: `${calculateRate(report.metrics.delivered, report.metrics.sent)}%` }} />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                                            <CheckCheck className="w-3.5 h-3.5 text-blue-500" /> Okunan (Mavi Tik)
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="font-semibold text-lg text-blue-600">{report.metrics.read.toLocaleString("tr-TR")}</span>
                                            <span className="text-[10px] text-blue-400 font-medium">%{calculateRate(report.metrics.read, report.metrics.delivered)}</span>
                                        </div>
                                        <div className="w-full bg-blue-50 h-1.5 rounded-full overflow-hidden">
                                            <div className="bg-blue-500 h-full rounded-full" style={{ width: `${calculateRate(report.metrics.read, report.metrics.delivered)}%` }} />
                                        </div>
                                    </div>

                                </div>

                                {/* Sağ Taraf: Hatalar ve Aksiyon */}
                                <div className="flex flex-row lg:flex-col items-center justify-between lg:justify-center gap-4 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6">
                                    {report.metrics.failed > 0 ? (
                                        <div className="flex flex-col items-center lg:items-end text-right">
                                            <div className="text-red-600 font-bold text-lg flex items-center gap-1">
                                                <AlertCircle className="w-4 h-4" />
                                                {report.metrics.failed.toLocaleString("tr-TR")}
                                            </div>
                                            <div className="text-[10px] text-red-500 font-medium uppercase tracking-wider">Hatalı Numara</div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center lg:items-end text-right">
                                            <div className="text-green-600 font-bold text-lg flex items-center gap-1">
                                                <CheckCircle2 className="w-4 h-4" /> 0
                                            </div>
                                            <div className="text-[10px] text-green-500 font-medium uppercase tracking-wider">Hata Yok</div>
                                        </div>
                                    )}

                                    <Button variant="ghost" size="sm" className="hidden md:flex group-hover:bg-slate-100 text-slate-500 group-hover:text-primary">
                                        Detayları İncele
                                        <ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>

                                    {/* Sadece mobil için buton */}
                                    <Button variant="outline" size="sm" className="md:hidden w-full mt-2">
                                        Detaylar
                                    </Button>
                                </div>

                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );

}
