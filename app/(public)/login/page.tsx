
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function LoginPage({
    searchParams,
}: {
    searchParams: { message: string };
}) {
    const signIn = async (formData: FormData) => {
        "use server";

        const email = formData.get("email") as string;
        const password = formData.get("password") as string;
        const supabase = await createClient();

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return redirect("/login?message=Could not authenticate user");
        }

        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            // Check for agency_admin role
            const { createAdminClient } = await import("@/lib/supabase/admin"); // Dynamic import to avoid build cycle if any
            const adminDb = createAdminClient();

            const { data: membership } = await adminDb
                .from("tenant_members")
                .select("role")
                .eq("user_id", user.id)
                .eq("role", "agency_admin")
                .maybeSingle();

            if (membership) {
                return redirect("/admin/tenants");
            }
        }

        return redirect("/panel/inbox");
    };

    return (
        <div className="flex items-center justify-center py-12 md:py-24">
            <div className="w-full max-w-md p-8 space-y-6 glass rounded-xl">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold">Giriş Yap</h1>
                    <p className="text-gray-400">İşletme hesabınıza giriş yapın</p>
                </div>

                <form className="space-y-4" action={signIn}>
                    <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="email">
                            Email
                        </label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="isim@sirketiniz.com"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="password">
                            Şifre
                        </label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            required
                        />
                    </div>

                    {searchParams?.message && (
                        <p className="text-red-500 text-sm">{searchParams.message}</p>
                    )}

                    <Button type="submit" className="w-full">
                        Giriş Yap
                    </Button>
                </form>

                <div className="text-center text-sm">
                    Hesabınız yok mu?{" "}
                    <Link href="/signup" className="underline hover:text-primary">
                        Üye Olun
                    </Link>
                </div>
            </div>
        </div>
    );
}
