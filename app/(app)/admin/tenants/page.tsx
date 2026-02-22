import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TenantActions } from "./tenant-actions";
import { CheckCircle2, XCircle, ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";

export default async function TenantListPage() {
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
    const { data: tenants, error } = await adminDb
        .from("tenants")
        .select("*, subscriptions(*)")
        .neq("name", "UPGUN AI")
        .order("created_at", { ascending: false });

    if (error) {
        return <div className="text-red-500 bg-red-50 p-4 rounded-lg">Hata: {error.message}</div>;
    }

    return (
        <div className="space-y-8 p-8 pl-10 max-w-[1400px]">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">İşletmeler</h1>
                    <p className="text-slate-500">Sistemdeki tüm işletmelerin listesi ve durumu.</p>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="w-[300px]">İşletme Adı</TableHead>
                            <TableHead>Paket</TableHead>
                            <TableHead>Durum</TableHead>
                            <TableHead>Kam. Onay</TableHead>
                            <TableHead>Kayıt Tarihi</TableHead>
                            <TableHead className="text-right">İşlemler</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tenants?.map((tenant) => {
                            const sub = tenant.subscriptions?.[0];
                            const isCorporate = sub?.ai_product_key?.startsWith('uppypro_corporate_') || sub?.ai_product_key === 'uppypro_enterprise';
                            const isPro = sub?.ai_product_key === 'uppypro_ai';
                            const corporateSize = sub?.ai_product_key?.replace('uppypro_corporate_', '').toUpperCase();

                            return (
                                <TableRow key={tenant.id} className="hover:bg-orange-50/50 transition-colors">
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span className="text-slate-900 font-semibold">{tenant.name}</span>
                                            <span className="text-xs text-slate-400 font-mono">{tenant.id}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {sub ? (
                                                <>
                                                    {isCorporate ? (
                                                        <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-none">
                                                            Kurumsal{corporateSize && corporateSize !== 'ENTERPRISE' ? ` (${corporateSize.charAt(0) + corporateSize.slice(1).toLowerCase()})` : ''}
                                                        </Badge>
                                                    ) : isPro ? (
                                                        <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none">Pro AI</Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100">Inbox</Badge>
                                                    )}
                                                </>
                                            ) : (
                                                <Badge variant="outline" className="text-slate-400 border-slate-200">Paket Yok</Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={sub?.status === 'active' ? 'default' : 'secondary'} className={sub?.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-100 border-none' : ''}>
                                            {sub?.status === 'active' ? "Aktif" : (sub?.status || "Pasif")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-center w-8">
                                            {tenant.marketing_consent ? (
                                                <CheckCircle2 className="text-green-600 w-5 h-5" />
                                            ) : (
                                                <XCircle className="text-slate-300 w-5 h-5" />
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-slate-500">
                                        {new Date(tenant.created_at).toLocaleDateString("tr-TR")}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <TenantActions tenantId={tenant.id} tenantName={tenant.name} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {tenants?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                    Kayıtlı işletme bulunamadı.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
