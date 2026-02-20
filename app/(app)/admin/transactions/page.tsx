import { getAllTransactions } from "@/app/actions/invoice";
import { TransactionsClient } from "./transactions-client";

export const dynamic = "force-dynamic";

export default async function AdminTransactionsPage() {
    const { transactions } = await getAllTransactions();

    return (
        <div className="p-8 max-w-[1400px]">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-900">İşlemler</h1>
                <p className="text-slate-500 mt-1">Tüm abonelik ödemelerini ve faturalarını yönetin.</p>
            </div>

            <TransactionsClient initialTransactions={transactions} />
        </div>
    );
}
