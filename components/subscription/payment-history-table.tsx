import { Badge } from "@/components/ui/badge";

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

interface Invoice {
    id: string;
    iyzico_order_reference_code: string;
    invoice_pdf_url: string;
    amount: number;
    plan_name: string;
    payment_date: string;
    email_sent: boolean;
}

interface PaymentHistoryTableProps {
    orders: any[];
    invoices?: Invoice[];
}

export function PaymentHistoryTable({ orders, invoices = [] }: PaymentHistoryTableProps) {
    if (!orders || orders.length === 0) {
        return (
            <div className="p-12 text-center border rounded-xl bg-slate-50 border-slate-200 border-dashed">
                <p className="text-slate-500">Henüz bir ödeme geçmişi bulunmuyor.</p>
            </div>
        );
    }

    // Fatura eşleştirme map'i
    const invoiceMap = new Map<string, Invoice>();
    for (const inv of invoices) {
        if (inv.iyzico_order_reference_code) {
            invoiceMap.set(inv.iyzico_order_reference_code, inv);
        }
    }

    return (
        <div className="border rounded-xl overflow-hidden border-slate-200">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-3 font-semibold text-slate-700">Tarih</th>
                            <th className="px-6 py-3 font-semibold text-slate-700">Tutar</th>
                            <th className="px-6 py-3 font-semibold text-slate-700">Ödeme Yöntemi</th>
                            <th className="px-6 py-3 font-semibold text-slate-700">Durum</th>
                            <th className="px-6 py-3 font-semibold text-slate-700">Fatura</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {orders.map((order: any, index: number) => {
                            const date = new Date(order.startPeriod || order.createdDate || Date.now());
                            const formattedDate = formatTurkeyDate(date);
                            const amount = order.price ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: order.currencyCode || 'TRY' }).format(order.price) : '-';
                            const status = order.orderStatus || order.paymentStatus || 'UNKNOWN';
                            const invoice = invoiceMap.get(order.referenceCode);

                            return (
                                <tr key={order.referenceCode || index} className="hover:bg-slate-50/50">
                                    <td className="px-6 py-4 font-medium text-slate-900">
                                        {formattedDate}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {amount}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        Kredi Kartı
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge
                                            variant={status === 'SUCCESS' ? 'default' : 'secondary'}
                                            className={
                                                status === 'SUCCESS' ? 'bg-green-100 text-green-700 hover:bg-green-100 border-green-200' :
                                                    status === 'WAITING' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200' :
                                                        'bg-slate-100 text-slate-600 hover:bg-slate-100 border-slate-200'
                                            }
                                        >
                                            {status === 'SUCCESS' ? 'Ödendi' : status === 'WAITING' ? 'Bekliyor' : status}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        {invoice ? (
                                            <a
                                                href={invoice.invoice_pdf_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                    <polyline points="14 2 14 8 20 8" />
                                                    <line x1="16" y1="13" x2="8" y2="13" />
                                                    <line x1="16" y1="17" x2="8" y2="17" />
                                                    <polyline points="10 9 9 9 8 9" />
                                                </svg>
                                                Faturayı Görüntüle
                                            </a>
                                        ) : (
                                            <span className="text-xs text-slate-400">—</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
