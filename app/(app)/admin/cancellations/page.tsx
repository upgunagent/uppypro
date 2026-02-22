import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { ShieldAlert, AlertTriangle, ArrowRight, XCircle, CheckCircle } from "lucide-react";
import { redirect } from "next/navigation";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getPackageName } from "@/lib/subscription-utils";

export default async function CancellationsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: membership } = await supabase
        .from("tenant_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "agency_admin")
        .maybeSingle();

    if (!membership) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-red-500 gap-4">
                <ShieldAlert size={48} />
                <h1 className="text-2xl font-bold">Yetkisiz Erişim</h1>
                <p className="text-gray-500">Bu sayfayı görüntülemek için "Süper Yönetici" yetkisine sahip olmalısınız.</p>
                <Link href="/panel/inbox">
                    <Button variant="outline">Panele Dön</Button>
                </Link>
            </div>
        );
    }

    const adminDb = createAdminClient();

    // Fetch subscriptions that are canceled OR scheduled for cancellation
    const { data: subscriptions, error } = await adminDb
        .from("subscriptions")
        .select(`
            *,
            tenants (
                id,
                name
            )
        `)
        .or('cancel_at_period_end.eq.true,status.eq.canceled')
        .order("cancellation_scheduled_at", { ascending: false });

    if (error) {
        return <div className="text-red-500 bg-red-50 p-4 rounded-lg">Hata: {error.message}</div>;
    }

    return (
        <div className="space-y-8 p-8 pl-10 max-w-[1400px]">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">İptal Talepleri</h1>
                    <p className="text-slate-500">İptal edilen veya dönem sonu iptali planlanan abonelikler.</p>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="w-[250px]">İşletme</TableHead>
                            <TableHead>Paket</TableHead>
                            <TableHead>Durum</TableHead>
                            <TableHead>İptal Sebebi</TableHead>
                            <TableHead>İptal Talep Tarihi</TableHead>
                            <TableHead>Bitiş Tarihi</TableHead>
                            <TableHead className="text-right">İşlem</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {subscriptions?.map((sub: any) => {
                            const tenant = sub.tenants;
                            const isPending = sub.cancel_at_period_end && sub.status === 'active';
                            const isCanceled = sub.status === 'canceled';

                            return (
                                <TableRow key={sub.id} className="hover:bg-orange-50/50 transition-colors">
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span className="text-slate-900 font-semibold">{tenant?.name || "Bilinmeyen İşletme"}</span>
                                            <span className="text-xs text-slate-400 font-mono">{tenant?.id}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="border-slate-200">
                                            {getPackageName(sub)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {isPending ? (
                                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 flex w-fit items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" /> Planlandı
                                            </Badge>
                                        ) : isCanceled ? (
                                            <Badge variant="destructive" className="flex w-fit items-center gap-1">
                                                <XCircle className="w-3 h-3" /> İptal Edildi
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline">{sub.status}</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="max-w-[200px] text-sm">
                                            <p className="font-semibold text-slate-700">{sub.cancel_reason || "-"}</p>
                                            {sub.cancel_reason_details && (
                                                <p className="text-xs text-slate-500 truncate" title={sub.cancel_reason_details}>
                                                    {sub.cancel_reason_details}
                                                </p>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-slate-500 text-sm">
                                        {sub.cancellation_scheduled_at
                                            ? new Date(sub.cancellation_scheduled_at).toLocaleDateString("tr-TR")
                                            : "-"}
                                    </TableCell>
                                    <TableCell className="text-slate-500 text-sm">
                                        {sub.current_period_end
                                            ? new Date(sub.current_period_end).toLocaleDateString("tr-TR")
                                            : "-"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Link href={`/admin/tenants/${tenant?.id}/billing`}>
                                            <Button variant="ghost" size="sm" className="hover:bg-orange-50 hover:text-orange-600">
                                                Yönet <ArrowRight className="w-4 h-4 ml-1" />
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {subscriptions?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                                    İptal talebi bulunamadı.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
