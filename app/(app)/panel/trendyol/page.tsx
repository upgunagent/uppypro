import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTenantTrendyolData } from "./actions";
import { TrendyolClient } from "./trendyol-client";

export const dynamic = "force-dynamic";

export default async function TrendyolPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return redirect("/login");

    const { data: member } = await supabase
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

    if (!member?.tenant_id) return redirect("/panel/inbox");

    // Check if this tenant has a Trendyol connection
    const { count } = await supabase
        .from("channel_connections")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", member.tenant_id)
        .eq("channel", "trendyol")
        .eq("status", "connected");

    if (!count || count === 0) {
        return redirect("/panel/inbox");
    }

    const data = await getTenantTrendyolData(member.tenant_id);

    return (
        <Suspense
            fallback={
                <div className="p-8 text-center text-slate-400">Yükleniyor...</div>
            }
        >
            <TrendyolClient
                totalProducts={data.totalProducts}
                answeredQuestions={data.answeredQuestions}
                monthlyAnswered={data.monthlyAnswered}
                stockAlerts={data.stockAlerts}
                recentQuestions={data.recentQuestions}
            />
        </Suspense>
    );
}
