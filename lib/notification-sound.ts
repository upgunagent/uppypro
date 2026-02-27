"use client";

/**
 * Global AudioContext instance
 */
let audioCtx: AudioContext | null = null;

/**
 * Call this function inside a user gesture (like a click event)
 * to unlock the AudioContext so it can play sounds later.
 */
export function initNotificationSound() {
    if (typeof window === "undefined") return;

    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }

    // Resume the context if it's suspended
    if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => { });
    }
}

/**
 * Play a notification sound using the Web Audio API.
 * Uses the global context to bypass autoplay restrictions.
 */
export function playNotificationSound() {
    try {
        if (typeof window === "undefined") return;

        if (!audioCtx) {
            initNotificationSound();
        }

        if (!audioCtx) return;

        // Try to resume if somehow suspended
        if (audioCtx.state === "suspended") {
            audioCtx.resume().catch(() => { });
        }

        // First tone (higher pitch)
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(880, audioCtx.currentTime);
        gain1.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.start(audioCtx.currentTime);
        osc1.stop(audioCtx.currentTime + 0.3);

        // Second tone (slightly lower, delayed)
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(1174.66, audioCtx.currentTime + 0.15);
        gain2.gain.setValueAtTime(0.2, audioCtx.currentTime + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start(audioCtx.currentTime + 0.15);
        osc2.stop(audioCtx.currentTime + 0.5);

    } catch (err) {
        // Silent fail if audio is not supported or blocked
        console.warn("Audio Context error:", err);
    }
}
