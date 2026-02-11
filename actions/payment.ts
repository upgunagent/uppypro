"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

// PayTR Credentials from Env
const MERCHANT_ID = process.env.PAYTR_MERCHANT_ID;
const MERCHANT_KEY = process.env.PAYTR_MERCHANT_KEY;
const MERCHANT_SALT = process.env.PAYTR_MERCHANT_SALT;
const PAYTR_URL = "https://www.paytr.com/odeme/api/get-token";

export type PaytrTokenResult = {
    token?: string;
    error?: string;
};

export async function getPaytrToken(data: {
    userIp: string;
    userId: string;
    email: string;
    name: string;
    phone: string;
    address: string;
    paymentAmount: number; // In TL (Example: 125.50)
    basketId: string; // Order ID or similar
    productName: string;
}): Promise<PaytrTokenResult> {

    if (!MERCHANT_ID || !MERCHANT_KEY || !MERCHANT_SALT) {
        console.error("PayTR credentials missing");
        return { error: "Ödeme sistemi yapılandırma hatası." };
    }

    try {
        const user_basket = JSON.stringify([[data.productName, data.paymentAmount.toFixed(2), 1]]);
        const merchant_oid = data.basketId; // Unique Order ID
        const payment_amount = Math.round(data.paymentAmount * 100); // Kuruş cinsinden (Örn: 100.00 TL -> 10000)
        const currency = "TL";
        const test_mode = "1"; // Test mode active - Change to "0" for production if needed, or control via env

        // Generate Hash
        // concat: merchant_id + user_ip + merchant_oid + email + payment_amount + user_basket + no_installment + max_installment + currency + test_mode;
        const no_installment = "1"; // Taksit yok
        const max_installment = "0";

        const hashStr =
            MERCHANT_ID +
            data.userIp +
            merchant_oid +
            data.email +
            payment_amount +
            user_basket +
            no_installment +
            max_installment +
            currency +
            test_mode;

        const paytr_token = crypto
            .createHmac("sha256", MERCHANT_KEY)
            .update(hashStr + MERCHANT_SALT)
            .digest("base64");

        // Prepare Form Data
        const formData = new URLSearchParams();
        formData.append("merchant_id", MERCHANT_ID);
        formData.append("user_ip", data.userIp);
        formData.append("merchant_oid", merchant_oid);
        formData.append("email", data.email);
        formData.append("payment_amount", payment_amount.toString());
        formData.append("paytr_token", paytr_token);
        formData.append("user_basket", user_basket);
        formData.append("debug_on", "1");
        formData.append("no_installment", no_installment);
        formData.append("max_installment", max_installment);
        formData.append("user_name", data.name);
        formData.append("user_address", data.address);
        formData.append("user_phone", data.phone);
        formData.append("merchant_ok_url", `${process.env.NEXT_PUBLIC_APP_URL}/complete-payment?status=success&oid=${merchant_oid}`);
        formData.append("merchant_fail_url", `${process.env.NEXT_PUBLIC_APP_URL}/complete-payment?status=fail&oid=${merchant_oid}`);
        formData.append("timeout_limit", "30");
        formData.append("currency", currency);
        formData.append("test_mode", test_mode);

        const response = await fetch(PAYTR_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: formData,
        });

        const resData = await response.json();

        if (resData.status === "success") {
            return { token: resData.token };
        } else {
            console.error("PayTR Error:", resData.reason);
            return { error: `Ödeme başlatılamadı: ${resData.reason}` };
        }

    } catch (error: any) {
        console.error("PayTR Exception:", error);
        return { error: error.message };
    }
}
