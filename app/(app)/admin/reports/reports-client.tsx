"use client";

import { useState } from "react";
import {
  BarChart3,
  Users,
  ShoppingBag,
  MessageSquare,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Cpu,
  Zap,
  Package,
  HelpCircle,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from "recharts";

const TABS = [
  { id: "ai-costs", label: "AI Maliyet", icon: Cpu },
  { id: "tenant-usage", label: "İşletme Kullanım", icon: Users },
  { id: "trendyol", label: "Trendyol", icon: ShoppingBag },
  { id: "channels", label: "Kanal Raporu", icon: MessageSquare },
  { id: "revenue", label: "Gelir & Kârlılık", icon: DollarSign },
];

const COLORS = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4"];

interface ReportsClientProps {
  aiCostSummary: any;
  aiCostTrend: any[];
  modelDistribution: any[];
  tenantUsage: any[];
  trendyolReport: any;
  channelReport: any;
  revenueReport: any;
}

function StatCard({ title, value, subtitle, icon: Icon, color, trend }: any) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center text-xs font-semibold ${trend >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-500 mt-1">{title}</div>
      {subtitle && <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>}
    </div>
  );
}

// ========== TAB 1: AI Maliyet ==========
function AiCostsTab({ summary, trend, distribution }: any) {
  return (
    <div className="space-y-6">
      {/* Kartlar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Bugünkü Maliyet"
          value={`$${(summary.today?.totalCost || 0).toFixed(4)}`}
          subtitle={`${summary.today?.totalRequests || 0} istek`}
          icon={DollarSign}
          color="bg-emerald-500"
        />
        <StatCard
          title="Bu Hafta"
          value={`$${(summary.week?.totalCost || 0).toFixed(4)}`}
          subtitle={`${summary.week?.totalRequests || 0} istek`}
          icon={TrendingUp}
          color="bg-blue-500"
        />
        <StatCard
          title="Bu Ay"
          value={`$${(summary.month?.totalCost || 0).toFixed(2)}`}
          subtitle={`${summary.month?.totalRequests || 0} istek`}
          icon={BarChart3}
          color="bg-orange-500"
        />
        <StatCard
          title="Toplam Token"
          value={formatNumber(
            (summary.month?.totalInputTokens || 0) + (summary.month?.totalOutputTokens || 0)
          )}
          subtitle={`Input: ${formatNumber(summary.month?.totalInputTokens || 0)} / Output: ${formatNumber(summary.month?.totalOutputTokens || 0)}`}
          icon={Zap}
          color="bg-purple-500"
        />
      </div>

      {/* Grafikler */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Maliyet Trend */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Son 30 Gün Maliyet Trendi</h3>
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(value: any) => [`$${Number(value).toFixed(4)}`, "Maliyet"]}
                  labelFormatter={(label) => `Tarih: ${label}`}
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }}
                />
                <Area
                  type="monotone"
                  dataKey="cost"
                  stroke="#f97316"
                  strokeWidth={2}
                  fill="url(#costGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-400">
              Henüz veri yok. AI kullanımı başladığında burada görünecek.
            </div>
          )}
        </div>

        {/* Model Dağılımı */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Model Dağılımı</h3>
          {distribution.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={distribution}
                    dataKey="requests"
                    nameKey="model"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }: any) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {distribution.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-2">
                {distribution.map((d: any, i: number) => (
                  <div key={d.model} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-slate-600 truncate max-w-[140px]">{d.model}</span>
                    </div>
                    <span className="font-semibold text-slate-900">${d.cost.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-slate-400">
              Henüz veri yok
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ========== TAB 2: İşletme Kullanım ==========
function TenantUsageTab({ data }: { data: any[] }) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">İşletme Bazlı AI Kullanımı</h3>
          <p className="text-sm text-slate-500 mt-1">Son 30 gün — Maliyete göre sıralı</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">#</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">İşletme</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Paket</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">AI Model</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">İstek</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Token</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Maliyet ($)</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.length > 0 ? (
                data.map((t, i) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-500 font-medium">{i + 1}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-slate-900">{t.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{t.id.slice(0, 8)}...</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                        {t.package}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{t.model}</td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-slate-900">{t.totalRequests}</td>
                    <td className="px-6 py-4 text-sm text-right text-slate-600">{formatNumber(t.totalTokens)}</td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-slate-900">${t.totalCost.toFixed(4)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex w-8 h-8 rounded-full items-center justify-center text-lg ${
                        t.totalCost < 1 ? "bg-emerald-50" : t.totalCost < 10 ? "bg-amber-50" : "bg-red-50"
                      }`}>
                        {t.totalCost < 1 ? "🟢" : t.totalCost < 10 ? "🟡" : "🔴"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    Henüz kullanım verisi yok. AI kullanımı başladığında burada görünecek.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ========== TAB 3: Trendyol ==========
function TrendyolTab({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Aktif Mağaza" value={data.activeConnections} icon={ShoppingBag} color="bg-orange-500" />
        <StatCard title="Senkronize Ürün" value={data.totalProducts} icon={Package} color="bg-blue-500" />
        <StatCard title="Cevaplanan Soru" value={data.answeredQuestions} icon={HelpCircle} color="bg-emerald-500" />
        <StatCard title="Stok Alarmı" value={data.stockAlerts} icon={AlertTriangle} color="bg-red-500" />
      </div>

      {/* Son Cevaplanan Sorular */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">Son Cevaplanan Sorular</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {data.recentQuestions.length > 0 ? (
            data.recentQuestions.map((q: any) => (
              <div key={q.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-600 mb-1">{q.product_title}</p>
                    <p className="text-sm text-slate-800 font-semibold">❓ {q.question_text}</p>
                    <p className="text-sm text-emerald-700 mt-1">✅ {q.answer_text}</p>
                  </div>
                  <span className={`ml-4 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    q.answered_by === "ai" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {q.answered_by === "ai" ? "🤖 AI" : "👤 Manuel"}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-2">
                  {new Date(q.created_at).toLocaleString("tr-TR")}
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-slate-400">
              Henüz cevaplanan soru yok
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ========== TAB 4: Kanal Raporu ==========
function ChannelsTab({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      {/* Kanal Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* WhatsApp */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-green-500 to-emerald-600 flex items-center justify-center">
              <MessageSquare size={20} className="text-white" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">WhatsApp</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-slate-500 mb-1">Bugün</div>
              <div className="text-xl font-bold text-slate-900">
                {(data.today?.whatsapp?.in || 0) + (data.today?.whatsapp?.out || 0)}
              </div>
              <div className="text-xs text-slate-400">
                ↓{data.today?.whatsapp?.in || 0} ↑{data.today?.whatsapp?.out || 0}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Bu Hafta</div>
              <div className="text-xl font-bold text-slate-900">
                {(data.week?.whatsapp?.in || 0) + (data.week?.whatsapp?.out || 0)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Bu Ay</div>
              <div className="text-xl font-bold text-slate-900">
                {(data.month?.whatsapp?.in || 0) + (data.month?.whatsapp?.out || 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Instagram */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 via-red-500 to-orange-500 flex items-center justify-center">
              <MessageSquare size={20} className="text-white" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Instagram</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-slate-500 mb-1">Bugün</div>
              <div className="text-xl font-bold text-slate-900">
                {(data.today?.instagram?.in || 0) + (data.today?.instagram?.out || 0)}
              </div>
              <div className="text-xs text-slate-400">
                ↓{data.today?.instagram?.in || 0} ↑{data.today?.instagram?.out || 0}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Bu Hafta</div>
              <div className="text-xl font-bold text-slate-900">
                {(data.week?.instagram?.in || 0) + (data.week?.instagram?.out || 0)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Bu Ay</div>
              <div className="text-xl font-bold text-slate-900">
                {(data.month?.instagram?.in || 0) + (data.month?.instagram?.out || 0)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Performans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Toplam Konuşma"
          value={data.totalConversations || 0}
          icon={MessageSquare}
          color="bg-blue-500"
        />
        <StatCard
          title="AI Tarafından Yönetilen"
          value={data.aiHandled || 0}
          subtitle={data.totalConversations > 0 ? `%${Math.round((data.aiHandled / data.totalConversations) * 100)}` : "%0"}
          icon={Cpu}
          color="bg-purple-500"
        />
        <StatCard
          title="Canlı Destek"
          value={data.humanHandled || 0}
          subtitle={data.totalConversations > 0 ? `%${Math.round((data.humanHandled / data.totalConversations) * 100)}` : "%0"}
          icon={Users}
          color="bg-orange-500"
        />
      </div>

      {/* Mesaj Trend Grafiği */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Son 30 Gün Mesaj Hacmi</h3>
        {data.trend?.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }}
                labelFormatter={(label) => `Tarih: ${label}`}
              />
              <Legend />
              <Bar dataKey="whatsapp" name="WhatsApp" fill="#25D366" radius={[4, 4, 0, 0]} />
              <Bar dataKey="instagram" name="Instagram" fill="#E1306C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-slate-400">
            Henüz mesaj verisi yok
          </div>
        )}
      </div>
    </div>
  );
}

// ========== TAB 5: Gelir & Kârlılık ==========
function RevenueTab({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Aylık Toplam Gelir"
          value={`₺${formatNumber(data.totalRevenue)}`}
          subtitle={`${data.activeSubscriptions} aktif abone`}
          icon={DollarSign}
          color="bg-emerald-500"
        />
        <StatCard
          title="AI Maliyeti"
          value={`₺${data.totalCostTry}`}
          icon={Cpu}
          color="bg-red-500"
        />
        <StatCard
          title="Net Kâr"
          value={`₺${formatNumber(data.netProfit)}`}
          icon={data.netProfit >= 0 ? TrendingUp : TrendingDown}
          color={data.netProfit >= 0 ? "bg-emerald-500" : "bg-red-500"}
        />
        <StatCard
          title="Kâr Marjı"
          value={`%${data.margin}`}
          icon={BarChart3}
          color={data.margin >= 50 ? "bg-emerald-500" : data.margin >= 20 ? "bg-amber-500" : "bg-red-500"}
        />
      </div>

      {/* Tenant Kârlılık Tablosu */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">İşletme Bazlı Kârlılık</h3>
          <p className="text-sm text-slate-500 mt-1">Aylık abonelik geliri vs AI maliyeti</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">İşletme</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Paket</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Aylık Ödeme</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">AI Maliyeti ($)</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">AI Maliyeti (₺)</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Net Kâr</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Kârlılık</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.tenants?.length > 0 ? (
                data.tenants.map((t: any) => (
                  <tr key={t.tenantId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">{t.name}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                        {t.package}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-emerald-600">₺{t.revenue}</td>
                    <td className="px-6 py-4 text-sm text-right text-slate-600">${t.aiCostUsd}</td>
                    <td className="px-6 py-4 text-sm text-right text-red-500">₺{t.aiCostTry}</td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-slate-900">
                      <span className={t.profit >= 0 ? "text-emerald-600" : "text-red-500"}>
                        ₺{t.profit}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        t.margin >= 70
                          ? "bg-emerald-100 text-emerald-700"
                          : t.margin >= 40
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        %{t.margin}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    Henüz veri yok
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ========== Yardımcı Fonksiyonlar ==========
function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

// ========== Ana Bileşen ==========
export function ReportsClient({
  aiCostSummary,
  aiCostTrend,
  modelDistribution,
  tenantUsage,
  trendyolReport,
  channelReport,
  revenueReport,
}: ReportsClientProps) {
  const [activeTab, setActiveTab] = useState("ai-costs");

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">📊 Raporlar</h1>
        <p className="text-slate-500 mt-1">API kullanımı, maliyet analizi ve performans raporları</p>
      </div>

      {/* Tab Navigasyonu */}
      <div className="flex flex-wrap gap-2 mb-6 bg-white rounded-2xl border border-slate-200 p-2 shadow-sm">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/25"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab İçerikleri */}
      {activeTab === "ai-costs" && (
        <AiCostsTab summary={aiCostSummary} trend={aiCostTrend} distribution={modelDistribution} />
      )}
      {activeTab === "tenant-usage" && <TenantUsageTab data={tenantUsage} />}
      {activeTab === "trendyol" && <TrendyolTab data={trendyolReport} />}
      {activeTab === "channels" && <ChannelsTab data={channelReport} />}
      {activeTab === "revenue" && <RevenueTab data={revenueReport} />}
    </div>
  );
}
