"use client";

import { useState, useCallback } from "react";
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
    ShoppingCart,
    Truck,
    Clock,
    CheckCircle2,
    XCircle,
    RotateCcw,
    Loader2,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    MapPin,
    PackageCheck,
    Filter,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { fetchTrendyolOrders, type OrdersResponse, type FetchOrdersParams } from "./actions";

/* ---------- types ---------- */
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

type TabType = "ai" | "orders";

/* ---------- helpers ---------- */
const ORDER_STATUSES = [
    { value: "", label: "Tümü", icon: Filter, color: "bg-slate-100 text-slate-600" },
    { value: "Created", label: "Yeni", icon: Clock, color: "bg-blue-100 text-blue-700" },
    { value: "Picking", label: "Hazırlanıyor", icon: Package, color: "bg-amber-100 text-amber-700" },
    { value: "Invoiced", label: "Faturalandı", icon: PackageCheck, color: "bg-indigo-100 text-indigo-700" },
    { value: "Shipped", label: "Kargoda", icon: Truck, color: "bg-purple-100 text-purple-700" },
    { value: "Delivered", label: "Teslim Edildi", icon: CheckCircle2, color: "bg-emerald-100 text-emerald-700" },
    { value: "Cancelled", label: "İptal", icon: XCircle, color: "bg-red-100 text-red-700" },
    { value: "Returned", label: "İade", icon: RotateCcw, color: "bg-orange-100 text-orange-700" },
];

function getStatusBadge(status: string) {
    const found = ORDER_STATUSES.find(
        (s) => s.value.toLowerCase() === status?.toLowerCase()
    );
    if (!found || !found.value) {
        return { label: status || "Bilinmiyor", color: "bg-slate-100 text-slate-600", icon: Clock };
    }
    return found;
}

function formatDate(timestamp: number | undefined) {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleString("tr-TR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatPrice(amount: number | undefined) {
    if (amount == null) return "-";
    return new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
    }).format(amount);
}

/* ---------- stat card ---------- */
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

/* ========== ORDERS TAB ========== */
function OrdersTab() {
    const [orders, setOrders] = useState<any[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [statusFilter, setStatusFilter] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

    const loadOrders = useCallback(
        async (params: FetchOrdersParams = {}) => {
            setLoading(true);
            setError(null);
            try {
                const result: OrdersResponse = await fetchTrendyolOrders({
                    status: (params.status ?? statusFilter) || undefined,
                    page: params.page ?? page,
                    orderNumber: (params.orderNumber ?? searchTerm) || undefined,
                });
                setOrders(result.orders);
                setTotalElements(result.totalElements);
                if (result.error) setError(result.error);
                setLoaded(true);
            } catch (err: any) {
                setError(err.message || "Bilinmeyen hata");
            } finally {
                setLoading(false);
            }
        },
        [statusFilter, page, searchTerm]
    );

    // İlk yükleme
    const handleInitialLoad = () => loadOrders();

    const handleStatusChange = (newStatus: string) => {
        setStatusFilter(newStatus);
        setPage(0);
        setExpandedOrder(null);
        loadOrders({ status: newStatus || undefined, page: 0 });
    };

    const handleSearch = () => {
        setPage(0);
        setExpandedOrder(null);
        loadOrders({ orderNumber: searchTerm || undefined, page: 0 });
    };

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        setExpandedOrder(null);
        loadOrders({ page: newPage });
    };

    const totalPages = Math.ceil(totalElements / 50);

    // İlk yükleme ekranı
    if (!loaded && !loading) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-12 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center mx-auto mb-5">
                        <ShoppingCart size={36} className="text-orange-500" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Trendyol Siparişleri</h3>
                    <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
                        Son 14 günlük siparişlerinizi Trendyol mağazanızdan doğrudan çekerek görüntüleyin.
                        Sipariş durumuna göre filtreleyebilir ve detayları inceleyebilirsiniz.
                    </p>
                    <button
                        onClick={handleInitialLoad}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-orange-200 hover:shadow-xl hover:shadow-orange-200 hover:-translate-y-0.5 transition-all"
                    >
                        <ShoppingCart size={18} />
                        Siparişleri Yükle
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5">
                {/* Status Chips */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {ORDER_STATUSES.map((s) => {
                        const isActive = statusFilter === s.value;
                        const StatusIcon = s.icon;
                        return (
                            <button
                                key={s.value}
                                onClick={() => handleStatusChange(s.value)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    isActive
                                        ? "bg-orange-500 text-white shadow-md shadow-orange-200"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                            >
                                <StatusIcon size={13} />
                                {s.label}
                            </button>
                        );
                    })}
                </div>

                {/* Search */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            type="text"
                            placeholder="Sipariş numarası ile ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            className="pl-10 h-10 bg-slate-50 border-slate-200 rounded-xl text-sm"
                        />
                    </div>
                    <button
                        onClick={handleSearch}
                        disabled={loading}
                        className="px-4 h-10 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
                    >
                        Ara
                    </button>
                    <button
                        onClick={() => loadOrders()}
                        disabled={loading}
                        className="px-4 h-10 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors disabled:opacity-50"
                    >
                        <RotateCcw size={16} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-center gap-2">
                    <XCircle size={16} className="shrink-0" />
                    {error}
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
                    <Loader2 size={32} className="animate-spin text-orange-500 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">Siparişler yükleniyor...</p>
                </div>
            )}

            {/* Orders List */}
            {!loading && orders.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="px-4 md:px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">
                            Toplam {totalElements} sipariş · Sayfa {page + 1}/{totalPages || 1}
                        </span>
                    </div>

                    {/* Order Rows */}
                    <div className="divide-y divide-slate-100">
                        {orders.map((order: any) => {
                            const isExpanded = expandedOrder === order.orderNumber;
                            const statusBadge = getStatusBadge(order.status);
                            const StatusIcon = statusBadge.icon;

                            return (
                                <div key={order.shipmentPackageId || order.orderNumber}>
                                    {/* Order Row */}
                                    <div
                                        className="p-4 md:px-6 hover:bg-slate-50/50 transition-colors cursor-pointer"
                                        onClick={() =>
                                            setExpandedOrder(isExpanded ? null : order.orderNumber)
                                        }
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                {/* Product thumbnail or icon */}
                                                {(() => {
                                                    const firstImage = order.lines?.find((l: any) => l.imageUrl)?.imageUrl;
                                                    return firstImage ? (
                                                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-white">
                                                            <img
                                                                src={firstImage}
                                                                alt="Ürün"
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                                                            <ShoppingCart size={18} className="text-orange-500" />
                                                        </div>
                                                    );
                                                })()}

                                                <div className="min-w-0 flex-1">
                                                    {/* Order Number */}
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-sm font-bold text-slate-800">
                                                            #{order.orderNumber}
                                                        </span>
                                                        <span
                                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge.color}`}
                                                        >
                                                            <StatusIcon size={10} />
                                                            {statusBadge.label}
                                                        </span>
                                                    </div>

                                                    {/* Products preview */}
                                                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                                                        {order.lines?.length
                                                            ? order.lines
                                                                  .map((l: any) => l.productName)
                                                                  .join(", ")
                                                            : "Ürün bilgisi yok"}
                                                    </p>

                                                    {/* Date */}
                                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                                        {formatDate(order.orderDate)}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Right: Price + Expand */}
                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                <span className="text-sm font-bold text-slate-800">
                                                    {formatPrice(order.totalPrice)}
                                                </span>
                                                <span className="text-[11px] text-slate-400">
                                                    {order.lines?.length || 0} ürün
                                                </span>
                                                {isExpanded ? (
                                                    <ChevronUp size={16} className="text-slate-400" />
                                                ) : (
                                                    <ChevronDown size={16} className="text-slate-400" />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Detail */}
                                    {isExpanded && (
                                        <div className="px-4 md:px-6 pb-4 bg-slate-50/50">
                                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                                {/* Product Lines */}
                                                <div className="p-4">
                                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                                                        Ürünler
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {order.lines?.map((line: any, idx: number) => (
                                                            <div
                                                                key={idx}
                                                                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                                                            >
                                                                {/* Ürün Görseli */}
                                                                {line.imageUrl ? (
                                                                    <div className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-white">
                                                                        <img
                                                                            src={line.imageUrl}
                                                                            alt={line.productName || "Ürün"}
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-14 h-14 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                                                                        <Package size={20} className="text-slate-400" />
                                                                    </div>
                                                                )}
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-sm font-medium text-slate-700 line-clamp-2">
                                                                        {line.productName || "Ürün"}
                                                                    </p>
                                                                    <p className="text-xs text-slate-400 mt-0.5">
                                                                        Barkod: {line.barcode || "-"}
                                                                    </p>
                                                                </div>
                                                                <div className="text-right shrink-0">
                                                                    <p className="text-sm font-semibold text-slate-800">
                                                                        {formatPrice(line.amount)}
                                                                    </p>
                                                                    <p className="text-xs text-slate-400">
                                                                        x{line.quantity}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Shipping Info */}
                                                <div className="border-t border-slate-100 p-4">
                                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                                                        Kargo Bilgisi
                                                    </h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {order.cargoProviderName && (
                                                            <div className="flex items-center gap-2 text-sm">
                                                                <Truck size={14} className="text-slate-400" />
                                                                <span className="text-slate-600">
                                                                    {order.cargoProviderName}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {order.cargoTrackingNumber && (
                                                            <div className="flex items-center gap-2 text-sm">
                                                                <Package size={14} className="text-slate-400" />
                                                                <span className="text-slate-600">
                                                                    Takip: {order.cargoTrackingNumber}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {order.cargoTrackingLink && (
                                                            <a
                                                                href={order.cargoTrackingLink}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700 font-medium"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <ExternalLink size={13} />
                                                                Kargo Takip
                                                            </a>
                                                        )}
                                                        {order.estimatedDeliveryStartDate && (
                                                            <div className="flex items-center gap-2 text-sm">
                                                                <CalendarDays
                                                                    size={14}
                                                                    className="text-slate-400"
                                                                />
                                                                <span className="text-slate-600">
                                                                    Tahmini Teslim:{" "}
                                                                    {formatDate(order.estimatedDeliveryStartDate)} -{" "}
                                                                    {formatDate(order.estimatedDeliveryEndDate)}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Shipping Address */}
                                                {order.shipmentAddress && (
                                                    <div className="border-t border-slate-100 p-4">
                                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                                                            Teslimat Adresi
                                                        </h4>
                                                        <div className="flex items-start gap-2">
                                                            <MapPin
                                                                size={14}
                                                                className="text-slate-400 mt-0.5 shrink-0"
                                                            />
                                                            <div className="text-sm text-slate-600">
                                                                <p className="font-medium">
                                                                    {order.shipmentAddress.firstName}{" "}
                                                                    {order.shipmentAddress.lastName}
                                                                </p>
                                                                <p>
                                                                    {order.shipmentAddress.district},{" "}
                                                                    {order.shipmentAddress.city}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-4 md:px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                            <button
                                onClick={() => handlePageChange(page - 1)}
                                disabled={page === 0}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={14} />
                                Önceki
                            </button>
                            <span className="text-xs text-slate-500">
                                Sayfa {page + 1} / {totalPages}
                            </span>
                            <button
                                onClick={() => handlePageChange(page + 1)}
                                disabled={page + 1 >= totalPages}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                Sonraki
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Empty */}
            {!loading && loaded && orders.length === 0 && !error && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                        <ShoppingCart size={28} className="text-slate-400" />
                    </div>
                    <p className="text-slate-500 font-medium">
                        {statusFilter ? "Bu durumda sipariş bulunamadı" : "Son 14 günde sipariş bulunamadı"}
                    </p>
                    <p className="text-slate-400 text-sm mt-1">
                        Farklı bir filtre deneyin veya daha sonra tekrar kontrol edin
                    </p>
                </div>
            )}
        </div>
    );
}

/* ========== MAIN COMPONENT ========== */
export function TrendyolClient({
    totalProducts,
    answeredQuestions,
    monthlyAnswered,
    stockAlerts,
    recentQuestions,
}: TrendyolClientProps) {
    const [activeTab, setActiveTab] = useState<TabType>("ai");
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

    const tabs = [
        { key: "ai" as TabType, label: "AI Cevapları", icon: MessageSquare },
        { key: "orders" as TabType, label: "Siparişler", icon: ShoppingCart },
    ];

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

            {/* Tab Bar */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.key;
                    const TabIcon = tab.icon;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                                isActive
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                            }`}
                        >
                            <TabIcon size={16} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content: AI Cevapları */}
            {activeTab === "ai" && (
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
                                                    <p className="text-xs font-medium text-slate-400 mb-1 truncate">
                                                        📦 {q.product_title || "Ürün bilgisi yok"}
                                                    </p>
                                                    <p className="text-sm font-semibold text-slate-800 flex items-start gap-1.5">
                                                        <span className="text-orange-500 shrink-0 mt-0.5">
                                                            ❓
                                                        </span>
                                                        <span className={isExpanded ? "" : "line-clamp-2"}>
                                                            {q.question_text}
                                                        </span>
                                                    </p>
                                                    {!isExpanded && (
                                                        <p className="text-sm text-emerald-700 mt-1 line-clamp-1 flex items-start gap-1.5">
                                                            <span className="shrink-0">✅</span>
                                                            <span>{q.answer_text}</span>
                                                        </p>
                                                    )}
                                                    {isExpanded && (
                                                        <div className="mt-3 bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                                                            <p className="text-sm text-emerald-800 leading-relaxed whitespace-pre-wrap">
                                                                {q.answer_text}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-end gap-2 shrink-0">
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                            q.answered_by === "ai"
                                                                ? "bg-purple-100 text-purple-700"
                                                                : "bg-blue-100 text-blue-700"
                                                        }`}
                                                    >
                                                        {q.answered_by === "ai" ? (
                                                            <>
                                                                <Bot size={10} /> AI
                                                            </>
                                                        ) : (
                                                            <>
                                                                <User size={10} /> Manuel
                                                            </>
                                                        )}
                                                    </span>
                                                    {isExpanded ? (
                                                        <ChevronUp size={16} className="text-slate-400" />
                                                    ) : (
                                                        <ChevronDown size={16} className="text-slate-400" />
                                                    )}
                                                </div>
                                            </div>
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
                                    {searchTerm
                                        ? "Aramanızla eşleşen sonuç bulunamadı"
                                        : "Henüz cevaplanan soru yok"}
                                </p>
                                <p className="text-slate-400 text-sm mt-1">
                                    {searchTerm
                                        ? "Farklı bir anahtar kelime deneyin"
                                        : "AI asistanınız müşteri sorularını cevapladıkça burada görünecek"}
                                </p>
                            </div>
                        )}
                    </div>

                    {filteredQuestions.length > 0 && (
                        <div className="px-4 md:px-6 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-400">
                            {filteredQuestions.length} soru gösteriliyor
                            {searchTerm && ` (toplam ${recentQuestions.length})`}
                        </div>
                    )}
                </div>
            )}

            {/* Tab Content: Siparişler */}
            {activeTab === "orders" && <OrdersTab />}
        </div>
    );
}
