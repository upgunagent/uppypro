"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { initializeSubscriptionCheckout as initIyzicoCheckout } from "@/lib/iyzico";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type PaymentInitResult = {
    checkoutFormContent?: string;
    token?: string;
    error?: string;
};

function formatPhoneNumber(phone: string): string {
    if (!phone) return '';
    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, '');

    // If it starts with '0', remove it (e.g., 0532... -> 532...)
    if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
    }

    // If it doesn't start with '90', add it (e.g., 532... -> 90532...)
    if (!cleaned.startsWith('90')) {
        cleaned = '90' + cleaned;
    }

    // Add + prefix
    return '+' + cleaned;
}

export async function initializeSubscriptionPayment(data: {
    pricingPlanReferenceCode: string;
    user: {
        id: string;
        email: string;
        name: string;
        phone: string;
        address: string;
        identityNumber?: string;
    };
    tenantId: string;
}): Promise<PaymentInitResult> {

    try {
        const supabase = createAdminClient();

        const gsmNumber = formatPhoneNumber(data.user.phone) || '+905555555555';

        // Wrapper for Iyzico
        const result = await initIyzicoCheckout({
            pricingPlanReferenceCode: data.pricingPlanReferenceCode,
            subscriptionInitialStatus: 'ACTIVE', // Start immediately
            callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/iyzico-callback`,
            customer: {
                name: data.user.name.split(' ')[0] || 'Ad',
                surname: data.user.name.split(' ').slice(1).join(' ') || 'Soyad',
                email: data.user.email,
                gsmNumber: gsmNumber,
                identityNumber: data.user.identityNumber || '11111111111', // Default if missing
                billingAddress: {
                    contactName: data.user.name,
                    city: 'Istanbul', // Should come from form
                    country: 'Turkey',
                    address: data.user.address || 'Adres belirtilmedi',
                    zipCode: '34000'
                },
                shippingAddress: {
                    contactName: data.user.name,
                    city: 'Istanbul',
                    country: 'Turkey',
                    address: data.user.address || 'Adres belirtilmedi',
                    zipCode: '34000'
                }
            }
        });

        if (result.status !== 'success') {
            console.error("Iyzico Init Error:", result.errorMessage);
            // Adding a timestamp or random ID to force a change that MUST be visible
            return { error: `[E-${Date.now().toString().slice(-4)}] Ödeme başlatılamadı: ${result.errorMessage} (Tel: ${gsmNumber})` };
        }

        return {
            checkoutFormContent: result.checkoutFormContent,
            token: result.token
        };

    } catch (error: any) {
        console.error("Payment Init Exception:", error);
        return { error: error.message };
    }
}
