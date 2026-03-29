"use client";

import { useState } from "react";
import Image from "next/image";
import {
    Package,
    HelpCircle,
    AlertTriangle,
    CalendarDays,
    MessageSquare,
    ChevronDown,
    ChevronUp,
    Bot,
    User,
    Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface TrendyolQuestion {
    id: string;
    business_id: string;
    trendyol_question_id: string;
    product_title: string;
    question_text: string;
    answer_text: string;
    status: string;
    answered_by: string;
    answered_at: string;
    created_at: string;
}

interface TrendyolClientProps {
    totalProducts: number;
    answeredQuestions: number;
    monthlyAnswered: number;
    stockAlerts: number;
    recentQuestions: TrendyolQuestion[];
}

function StatCard({ title, value, icon: Icon, color, subtitle }: any) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                    <Icon size={20} className="text-white" />
                </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{value}</div>
            <div className="text-sm text-slate-500 mt-1">{title}</div>
            {subtitle && <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>}
        </div>
    );
}

export function TrendyolClient({
    totalProducts,
    answeredQuestions,
    monthlyAnswered,
    stockAlerts,
    recentQuestions,
}: TrendyolClientProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const filteredQuestions = recentQuestions.filter((q) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            q.product_title?.toLowerCase().includes(term) ||
            q.question_text?.toLowerCase().includes(term) ||
            q.answer_text?.toLowerCase().includes(term)
        );
    });

    return (
        <div className="p-4 md:p-6 max-w-[1200px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Image
                    src="/trendyol-icon.png"
                    alt="Trendyol"
                    width={48}
                    height={48}
                    className="rounded-xl shadow-sm"
                />
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Trendyol</h1>
                    <p className="text-slate-500 text-sm mt-0.5">
                        AI Asistanınızın Trendyol mağazanızdaki müşteri sorularına verdiği cevaplar ve raporlar
                    </p>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Senkronize Ürün"
                    value={totalProducts}
                    icon={Package}
                    color="bg-blue-500"
                />
                <StatCard
                    title="Toplam Cevap"
                    value={answeredQuestions}
                    icon={HelpCircle}
                    color="bg-emerald-500"
                />
                <StatCard
                    title="Bu Ay Cevaplanan"
                    value={monthlyAnswered}
                    icon={CalendarDays}
                    color="bg-orange-500"
                />
                <StatCard
                    title="Stok Alarmı"
                    value={stockAlerts}
                    icon={AlertTriangle}
                    color="bg-red-500"
                />
            </div>

            {/* Questions List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 md:p-6 border-b border-slate-100">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <MessageSquare size={20} className="text-orange-500" />
                                AI Cevapları
                            </h2>
                            <p className="text-sm text-slate-500 mt-0.5">
                                Yapay zeka asistanınızın müşteri sorularına verdiği cevaplar
                            </p>
                        </div>
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                type="text"
                                placeholder="Ürün veya soru ara..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 h-10 bg-slate-50 border-slate-200 rounded-xl text-sm"
                            />
                        </div>
                    </div>
                </div>

                <div className="divide-y divide-slate-100">
                    {filteredQuestions.length > 0 ? (
                        filteredQuestions.map((q) => {
                            const isExpanded = expandedId === q.id;
                            return (
                                <div
                                    key={q.id}
                                    className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                                    onClick={() => setExpandedId(isExpanded ? null : q.id)}
                                >
                                    <div className="p-4 md:px-6">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                {/* Product Title */}
                                                <p className="text-xs font-medium text-slate-400 mb-1 truncate">
                                                    📦 {q.product_title || "Ürün bilgisi yok"}
                                                </p>

                                                {/* Question */}
                                                <p className="text-sm font-semibold text-slate-800 flex items-start gap-1.5">
                                                    <span className="text-orange-500 shrink-0 mt-0.5">❓</span>
                                                    <span className={isExpanded ? "" : "line-clamp-2"}>{q.question_text}</span>
                                                </p>

                                                {/* Answer Preview (collapsed) */}
                                                {!isExpanded && (
                                                    <p className="text-sm text-emerald-700 mt-1 line-clamp-1 flex items-start gap-1.5">
                                                        <span className="shrink-0">✅</span>
                                                        <span>{q.answer_text}</span>
                                                    </p>
                                                )}

                                                {/* Answer Full (expanded) */}
                                                {isExpanded && (
                                                    <div className="mt-3 bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                                                        <p className="text-sm text-emerald-800 leading-relaxed whitespace-pre-wrap">
                                                            {q.answer_text}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Right Side: Badge + Expand */}
                                            <div className="flex flex-col items-end gap-2 shrink-0">
                                                <span
                                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                        q.answered_by === "ai"
                                                            ? "bg-purple-100 text-purple-700"
                                                            : "bg-blue-100 text-blue-700"
                                                    }`}
                                                >
                                                    {q.answered_by === "ai" ? (
                                                        <><Bot size={10} /> AI</>
                                                    ) : (
                                                        <><User size={10} /> Manuel</>
                                                    )}
                                                </span>
                                                {isExpanded ? (
                                                    <ChevronUp size={16} className="text-slate-400" />
                                                ) : (
                                                    <ChevronDown size={16} className="text-slate-400" />
                                                )}
                                            </div>
                                        </div>

                                        {/* Date */}
                                        <div className="text-[11px] text-slate-400 mt-2">
                                            {new Date(q.created_at).toLocaleString("tr-TR", {
                                                day: "2-digit",
                                                month: "long",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                                <MessageSquare size={28} className="text-slate-400" />
                            </div>
                            <p className="text-slate-500 font-medium">
                                {searchTerm ? "Aramanızla eşleşen sonuç bulunamadı" : "Henüz cevaplanan soru yok"}
                            </p>
                            <p className="text-slate-400 text-sm mt-1">
                                {searchTerm
                                    ? "Farklı bir anahtar kelime deneyin"
                                    : "AI asistanınız müşteri sorularını cevapladıkça burada görünecek"}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {filteredQuestions.length > 0 && (
                    <div className="px-4 md:px-6 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-400">
                        {filteredQuestions.length} soru gösteriliyor
                        {searchTerm && ` (toplam ${recentQuestions.length})`}
                    </div>
                )}
            </div>
        </div>
    );
}
