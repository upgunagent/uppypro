"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ConnectPayload = {
    channel: "whatsapp" | "instagram";
    phone_number_id?: string;
    waba_id?: string;
    page_id?: string;
    access_token: string;
};

export async function connectChannelAction(data: ConnectPayload) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // 1. Get Tenant
    const { data: member } = await supabase
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

    if (!member) return { success: false, error: "Tenant not found" };

    // 2. Prepare Meta Identifiers
    // We assume the user inputs correct IDs.
    const metaIdentifiers: any = {};
    if (data.channel === "whatsapp") {
        metaIdentifiers.phone_number_id = data.phone_number_id;
        metaIdentifiers.waba_id = data.waba_id;
        // Also map phone_number_id as a key for webhook lookup optimization if needed
        metaIdentifiers.mock_id = data.phone_number_id;
    } else {
        metaIdentifiers.page_id = data.page_id;
        metaIdentifiers.mock_id = data.page_id;
    }

    // 3. Upsert Connection
    const { error } = await supabase.from("channel_connections").upsert({
        tenant_id: member.tenant_id,
        channel: data.channel,
        status: "connected",
        meta_identifiers: metaIdentifiers,
        access_token_encrypted: data.access_token // TODO: Encrypt this in production
    }, { onConflict: "tenant_id, channel" });

    if (error) return { success: false, error: error.message };

    revalidatePath("/panel/settings");
    return { success: true };
}

import { createAdminClient } from "@/lib/supabase/admin";

export async function disconnectChannelAction(channel: "whatsapp" | "instagram") {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: member } = await supabase
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

    if (!member) throw new Error("Tenant not found");

    const admin = createAdminClient();

    // We hard delete the connection
    const { error } = await admin
        .from("channel_connections")
        .delete()
        .match({ tenant_id: member.tenant_id, channel: channel });

    if (error) {
        console.error("Disconnect error:", error);
        throw new Error(error.message);
    }

    revalidatePath("/panel/settings");
}
