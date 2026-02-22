import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PasswordForm } from "./password-form";

export default async function AdminPasswordPage() {
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

    return (
        <div className="space-y-8 p-8 pl-10 max-w-[1400px]">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Şifre Değişikliği</h1>
                    <p className="text-slate-500">Yönetici hesabınızın şifresini buradan güncelleyebilirsiniz.</p>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 max-w-2xl">
                <PasswordForm />
            </div>
        </div>
    );
}
