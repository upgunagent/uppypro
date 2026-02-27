"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { playNotificationSound } from "@/lib/notification-sound";

/**
 * Global notification sound listener.
 * This component should be mounted in the app layout so it runs regardless of which page is open.
 * It listens for new notifications via Supabase realtime and plays a sound when one arrives.
 */
export function NotificationSoundListener({ tenantId }: { tenantId?: string }) {
    const isInitialLoadRef = useRef(true);

    useEffect(() => {
        if (!tenantId) return;

        const supabase = createClient();

        const channel = supabase
            .channel(`global-notification-sound-${tenantId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    filter: `tenant_id=eq.${tenantId}`
                },
                () => {
                    // Skip sound only on the very first connection burst, not on actual new inserts
                    if (isInitialLoadRef.current) {
                        isInitialLoadRef.current = false;
                        return;
                    }
                    playNotificationSound();
                }
            )
            .subscribe();

        // After a short delay, mark initial load as done
        // (Supabase may send a snapshot event right after subscribing)
        const timer = setTimeout(() => {
            isInitialLoadRef.current = false;
        }, 2000);

        return () => {
            clearTimeout(timer);
            supabase.removeChannel(channel);
        };
    }, [tenantId]);

    return null;
}
