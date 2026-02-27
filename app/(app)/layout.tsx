import { AppSidebar } from "@/components/app-sidebar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { SubscriptionBlockOverlay } from "@/components/subscription-block-overlay";
import { NotificationSoundListener } from "@/components/notification-sound-listener";
import { clsx } from "clsx";

export default async function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        redirect("/login");
    }

    const { data: memberData } = await supabase
        .from("tenant_members")
        .select("role, tenant_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

    const role = memberData?.role || null;
    const tenantId = memberData?.tenant_id;

    // Subscription enforcement (admin kullanıcılar hariç)
    let subscriptionBlockReason: 'canceled' | 'past_due' | 'unpaid' | 'suspended' | 'pending_payment' | null = null;

    if (role !== 'agency_admin' && tenantId) {
        const { data: subscription } = await supabase
            .from("subscriptions")
            .select("status, current_period_end")
            .eq("tenant_id", tenantId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (subscription) {
            const { status, current_period_end } = subscription;

            if (status === 'canceled') {
                subscriptionBlockReason = 'canceled';
            } else if (status === 'pending_payment') {
                subscriptionBlockReason = 'pending_payment';
            } else if (['past_due', 'unpaid', 'suspended'].includes(status)) {
                // 3 gün grace period: current_period_end + 3 gün geçtiyse engelle
                if (current_period_end) {
                    const gracePeriodEnd = new Date(current_period_end);
                    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3);
                    if (new Date() > gracePeriodEnd) {
                        subscriptionBlockReason = status as 'past_due' | 'unpaid' | 'suspended';
                    }
                }
            }
        }
    }

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <AppSidebar role={role} tenantId={tenantId} />
            {/* Global notification sound listener - works on all pages */}
            {role !== "agency_admin" && tenantId && (
                <NotificationSoundListener tenantId={tenantId} />
            )}
            <main className={clsx(
                "flex-1 ml-0 flex flex-col h-[100dvh] overflow-y-auto pb-16 md:pb-0 md:mb-0",
                role === "agency_admin" ? "md:ml-64" : "md:ml-20"
            )}>
                {children}
            </main>
            <MobileBottomNav />
            {subscriptionBlockReason && (
                <SubscriptionBlockOverlay reason={subscriptionBlockReason} />
            )}
        </div>
    );
}
