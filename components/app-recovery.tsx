"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Enhanced App Recovery:
 * - Monitors visibility changes (tab background/foreground)
 * - Auto-reconnects Supabase realtime channels when tab becomes visible
 * - Refreshes auth session silently
 * - Never shows "Bağlantı Koptu" — always tries to recover silently
 * - Only reloads as absolute last resort after multiple failed attempts
 */
export function AppRecovery() {
    const lastHiddenAt = useRef<number | null>(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;
    const isRecovering = useRef(false);

    const silentRecover = useCallback(async () => {
        if (isRecovering.current) return; // Prevent concurrent recoveries
        isRecovering.current = true;

        try {
            const supabase = createClient();

            // 1. Refresh the auth session (prevents token expiration issues)
            try {
                const { error } = await supabase.auth.refreshSession();
                if (error) {
                    console.warn("[AppRecovery] Session refresh failed:", error.message);
                    // If session is truly expired, redirect to login
                    if (error.message?.includes('expired') || error.message?.includes('invalid')) {
                        window.location.href = '/login';
                        return;
                    }
                } else {
                    console.log("[AppRecovery] Session refreshed successfully");
                }
            } catch (authErr) {
                console.warn("[AppRecovery] Auth refresh error:", authErr);
            }

            // 2. Check server connectivity
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);

            const res = await fetch("/api/health", {
                method: "HEAD",
                cache: "no-store",
                signal: controller.signal,
            }).catch(() => null);

            clearTimeout(timeout);

            if (res && res.ok) {
                // Server is reachable, connection is fine
                reconnectAttempts.current = 0;
                console.log("[AppRecovery] Health check passed, connection OK");

                // 3. Reconnect Supabase Realtime by removing and re-adding channels
                // The individual components will re-subscribe on their own via useEffect
                // We just need to make sure the underlying connection is alive
                try {
                    const channels = supabase.getChannels();
                    if (channels.length === 0) {
                        console.log("[AppRecovery] No active channels, components will re-subscribe");
                    } else {
                        // Force reconnect by removing all channels — components will re-subscribe
                        // via their own useEffect hooks when they detect the channel is gone
                        for (const channel of channels) {
                            const state = channel.state;
                            if (state === 'errored' || state === 'closed') {
                                console.log(`[AppRecovery] Removing dead channel: ${channel.topic}`);
                                await supabase.removeChannel(channel);
                            }
                        }
                    }
                } catch (channelErr) {
                    console.warn("[AppRecovery] Channel cleanup error:", channelErr);
                }
            } else {
                // Server not reachable
                reconnectAttempts.current++;
                console.warn(`[AppRecovery] Health check failed (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);

                if (reconnectAttempts.current >= maxReconnectAttempts) {
                    // Last resort: reload the page
                    console.warn("[AppRecovery] Max attempts reached, reloading page...");
                    window.location.reload();
                }
            }
        } catch (err) {
            console.error("[AppRecovery] Recovery error:", err);
            reconnectAttempts.current++;

            if (reconnectAttempts.current >= maxReconnectAttempts) {
                window.location.reload();
            }
        } finally {
            isRecovering.current = false;
        }
    }, []);

    useEffect(() => {
        // 1. Visibility Change — tab came back from background
        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden") {
                lastHiddenAt.current = Date.now();
            }

            if (document.visibilityState === "visible" && lastHiddenAt.current) {
                const hiddenDuration = Date.now() - lastHiddenAt.current;
                lastHiddenAt.current = null;

                // If hidden for more than 30 seconds, do a silent recovery
                if (hiddenDuration > 30_000) {
                    console.log(`[AppRecovery] Tab was hidden for ${Math.round(hiddenDuration / 1000)}s, recovering...`);
                    silentRecover();
                }
            }
        };

        // 2. Page Lifecycle API — "freeze" -> "resume"
        const handleResume = () => {
            console.log("[AppRecovery] Page resumed from freeze");
            silentRecover();
        };

        // 3. Online/Offline — connection restored
        const handleOnline = () => {
            console.log("[AppRecovery] Network connection restored");
            silentRecover();
        };

        // 4. Periodic heartbeat — check every 2 minutes to catch silent disconnects
        const heartbeatInterval = setInterval(() => {
            if (document.visibilityState === "visible") {
                // Only do lightweight check when visible
                const supabase = createClient();
                const channels = supabase.getChannels();
                const hasDeadChannels = channels.some((ch: any) => ch.state === 'errored' || ch.state === 'closed');
                
                if (hasDeadChannels) {
                    console.log("[AppRecovery] Detected dead channels, recovering...");
                    silentRecover();
                }
            }
        }, 120_000); // Every 2 minutes

        document.addEventListener("visibilitychange", handleVisibilityChange);
        document.addEventListener("resume", handleResume);
        window.addEventListener("online", handleOnline);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            document.removeEventListener("resume", handleResume);
            window.removeEventListener("online", handleOnline);
            clearInterval(heartbeatInterval);
        };
    }, [silentRecover]);

    return null;
}
