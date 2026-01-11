"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthConfirmPage() {
    const router = useRouter();

    useEffect(() => {
        const confirmAuth = async () => {
            const supabase = createClient();

            // Check if user is authenticated
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // Successfully authenticated, redirect to payment
                router.push("/complete-payment");
            } else {
                // Not authenticated, redirect to login
                router.push("/login");
            }
        };

        confirmAuth();
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                <p className="text-slate-600">Giriş yapılıyor...</p>
            </div>
        </div>
    );
}
