"use client";

import { useState, useEffect, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Send, FileText, Search, Loader2, Eye, Check, ExternalLink, Info } from "lucide-react";
import { InvoiceUploadDialog } from "@/components/admin/invoice-upload-dialog";
import { BillingInfoDialog } from "@/components/admin/billing-info-dialog";

function formatTurkeyDate(date: Date): string {
    return date.toLocaleString('tr-TR', {
        timeZone: 'Europe/Istanbul',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

interface Transaction {
    orderReferenceCode: string;
    subscriptionReferenceCode: string;
    tenantId: string;
    tenantName: string;
    tenantEmail: string;
    planName: string;
    amount: number;
    currency: string;
    paymentDate: string;
    orderStatus: string;
    billingInfo: any | null;
    invoice: {
        id: string;
        invoice_pdf_url: string;
        email_sent: boolean;
        email_sent_at: string;
    } | null;
}

export function TransactionsClient({ initialTransactions }: { initialTransactions: Transaction[] }) {
    const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
    const [search, setSearch] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [isPending, startTransition] = useTransition();
    const [uploadDialog, setUploadDialog] = useState<{ open: boolean; transaction: Transaction | null }>({
        open: false,
        transaction: null,
    });
    const [billingDialog, setBillingDialog] = useState<{ open: boolean; transaction: Transaction | null }>({
        open: false,
        transaction: null,
    });
    const [sendingEmail, setSendingEmail] = useState<string | null>(null);

    // Client-side filtre
    const filtered = transactions.filter(t => {
        const matchesSearch = !search ||
            t.tenantName.toLowerCase().includes(search.toLowerCase()) ||
            t.tenantEmail.toLowerCase().includes(search.toLowerCase());

        const matchesDateFrom = !dateFrom || new Date(t.paymentDate) >= new Date(dateFrom);
        const matchesDateTo = !dateTo || new Date(t.paymentDate) <= new Date(dateTo + 'T23:59:59');

        // Sadece başarılı veya başarısız olanları göster, gelecekteki 'WAITING' siparişleri gizle
        const isNotWaiting = t.orderStatus !== 'WAITING';

        return matchesSearch && matchesDateFrom && matchesDateTo && isNotWaiting;
    });

    const handleRefresh = async () => {
        startTransition(async () => {
            const { getAllTransactions } = await import("@/app/actions/invoice");
            const result = await getAllTransactions();
            if (result.transactions) {
                setTransactions(result.transactions);
            }
        });
    };

    const handleSendEmail = async (invoiceId: string) => {
        setSendingEmail(invoiceId);
        try {
            const { sendInvoiceEmail } = await import("@/app/actions/invoice");
            const result = await sendInvoiceEmail(invoiceId);
            if (result.error) {
                alert("Hata: " + result.error);
            } else {
                alert("Fatura e-postası başarıyla gönderildi!");
                handleRefresh();
            }
        } catch (e: any) {
            alert("Hata: " + e.message);
        } finally {
            setSendingEmail(null);
        }
    };

    const stats = {
        total: transactions.length,
        withInvoice: transactions.filter(t => t.invoice).length,
        emailSent: transactions.filter(t => t.invoice?.email_sent).length,
    };

    return (
        <div className="space-y-6">
            {/* İstatistikler */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <p className="text-sm text-slate-500">Toplam İşlem</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <p className="text-sm text-slate-500">Fatura Yüklenen</p>
                    <p className="text-2xl font-bold text-green-600">{stats.withInvoice}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <p className="text-sm text-slate-500">Mail Gönderilen</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.emailSent}</p>
                </div>
            </div>

            {/* Filtreler */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label className="text-sm font-medium text-slate-600 mb-1 block">Müşteri Ara</label>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="İşletme adı veya e-posta..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>
                    <div className="min-w-[160px]">
                        <label className="text-sm font-medium text-slate-600 mb-1 block">Başlangıç</label>
                        <Input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                        />
                    </div>
                    <div className="min-w-[160px]">
                        <label className="text-sm font-medium text-slate-600 mb-1 block">Bitiş</label>
                        <Input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" onClick={handleRefresh} disabled={isPending} className="h-10">
                        {isPending ? <Loader2 size={16} className="animate-spin" /> : "Yenile"}
                    </Button>
                </div>
            </div>

            {/* Mail Önizleme Linki */}
            <div className="flex justify-end">
                <a
                    href="/api/invoices/preview"
                    target="_blank"
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                    <Eye size={14} />
                    Mail Şablonu Önizle
                    <ExternalLink size={12} />
                </a>
            </div>

            {/* İşlem Tablosu */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 font-semibold text-slate-700">Tarih</th>
                                <th className="px-4 py-3 font-semibold text-slate-700">İşletme</th>
                                <th className="px-4 py-3 font-semibold text-slate-700">E-posta</th>
                                <th className="px-4 py-3 font-semibold text-slate-700">Paket</th>
                                <th className="px-4 py-3 font-semibold text-slate-700">Tutar</th>
                                <th className="px-4 py-3 font-semibold text-slate-700">Durum</th>
                                <th className="px-4 py-3 font-semibold text-slate-700">Fatura</th>
                                <th className="px-4 py-3 font-semibold text-slate-700">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                                        {isPending ? "Yükleniyor..." : "Henüz bir işlem bulunamadı."}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((t, index) => (
                                    <tr key={t.orderReferenceCode || index} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-3 text-slate-900 font-medium whitespace-nowrap">
                                            {formatTurkeyDate(new Date(t.paymentDate))}
                                        </td>
                                        <td className="px-4 py-3 text-slate-700 font-medium">
                                            {t.tenantName}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 text-xs">
                                            {t.tenantEmail}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                {t.planName}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-slate-700">
                                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: t.currency || 'TRY' }).format(t.amount)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                className={
                                                    t.orderStatus === 'SUCCESS'
                                                        ? 'bg-green-100 text-green-700 border-green-200'
                                                        : t.orderStatus === 'WAITING'
                                                            ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                                            : 'bg-slate-100 text-slate-600 border-slate-200'
                                                }
                                            >
                                                {t.orderStatus === 'SUCCESS' ? 'Ödendi' : t.orderStatus === 'WAITING' ? 'Bekliyor' : t.orderStatus}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            {t.invoice ? (
                                                <div className="flex items-center gap-2">
                                                    <a
                                                        href={t.invoice.invoice_pdf_url}
                                                        target="_blank"
                                                        className="text-blue-600 hover:text-blue-700"
                                                        title="Faturayı Görüntüle"
                                                    >
                                                        <FileText size={16} />
                                                    </a>
                                                    {t.invoice.email_sent && (
                                                        <span className="text-green-500" title="Mail gönderildi">
                                                            <Check size={14} />
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setBillingDialog({ open: true, transaction: t })}
                                                    className="h-8 px-2 text-slate-600 hover:text-blue-600"
                                                    title="Fatura Bilgileri"
                                                >
                                                    <Info size={14} className="mr-1" />
                                                    Bilgi
                                                </Button>
                                                {!t.invoice ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setUploadDialog({ open: true, transaction: t })}
                                                        className="h-8 px-2 text-slate-600 hover:text-blue-600"
                                                        title="Fatura Yükle"
                                                    >
                                                        <Upload size={14} className="mr-1" />
                                                        Yükle
                                                    </Button>
                                                ) : !t.invoice.email_sent ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleSendEmail(t.invoice!.id)}
                                                        disabled={sendingEmail === t.invoice.id}
                                                        className="h-8 px-2 text-slate-600 hover:text-green-600"
                                                        title="Mail Gönder"
                                                    >
                                                        {sendingEmail === t.invoice.id ? (
                                                            <Loader2 size={14} className="mr-1 animate-spin" />
                                                        ) : (
                                                            <Send size={14} className="mr-1" />
                                                        )}
                                                        Gönder
                                                    </Button>
                                                ) : (
                                                    <span className="text-xs text-green-600 flex items-center gap-1">
                                                        <Check size={12} /> Gönderildi
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Upload Dialog */}
            {uploadDialog.transaction && (
                <InvoiceUploadDialog
                    isOpen={uploadDialog.open}
                    onClose={() => setUploadDialog({ open: false, transaction: null })}
                    transaction={uploadDialog.transaction}
                    onUploaded={handleRefresh}
                />
            )}

            {/* Billing Info Dialog */}
            {billingDialog.transaction && (
                <BillingInfoDialog
                    isOpen={billingDialog.open}
                    onClose={() => setBillingDialog({ open: false, transaction: null })}
                    transaction={billingDialog.transaction}
                />
            )}
        </div>
    );
}
