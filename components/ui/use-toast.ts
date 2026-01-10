"use client"

import { useState, useEffect } from "react";

export type ToastData = {
    id: string;
    title?: string;
    description?: string;
    variant?: "default" | "destructive" | "success"; // Added success
    action?: React.ReactNode;
};

// Global Store
let toasts: ToastData[] = [];
let listeners: Array<() => void> = [];

const emit = () => listeners.forEach((l) => l());

export const toast = (t: Omit<ToastData, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...t, id };

    // Add to top
    toasts = [newToast, ...toasts];
    emit();

    console.log("Toast Added:", newToast);

    // Auto dismiss after 5 seconds
    setTimeout(() => {
        dismiss(id);
    }, 5000);

    return id;
};

export const dismiss = (id: string) => {
    toasts = toasts.filter(t => t.id !== id);
    emit();
    console.log("Toast Dismissed:", id);
}

export const useToast = () => {
    const [_, forceUpdate] = useState(0);

    useEffect(() => {
        const listener = () => forceUpdate(n => n + 1);
        listeners.push(listener);
        return () => {
            listeners = listeners.filter(l => l !== listener);
        }
    }, []);

    return {
        toasts,
        toast,
        dismiss
    };
};
