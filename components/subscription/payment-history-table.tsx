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

interface PaymentHistoryTableProps {
    orders: any[];
}

export function PaymentHistoryTable({ orders }: PaymentHistoryTableProps) {
    if (!orders || orders.length === 0) {
        return (
            <div className="p-12 text-center border rounded-xl bg-slate-50 border-slate-200 border-dashed">
                <p className="text-slate-500">Henüz bir ödeme geçmişi bulunmuyor.</p>
            </div>
        );
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
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {orders.map((order: any, index: number) => {
                            const date = new Date(order.startPeriod || order.createdDate || Date.now());
                            const formattedDate = formatTurkeyDate(date);
                            const amount = order.price ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: order.currencyCode || 'TRY' }).format(order.price) : '-';
                            const status = order.orderStatus || order.paymentStatus || 'UNKNOWN';

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
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
