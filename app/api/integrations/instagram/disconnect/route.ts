import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function DELETE(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { data: member } = await supabase
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

    if (!member) {
        return new NextResponse("No tenant", { status: 400 });
    }

    // Hard delete or soft disconnect?
    // Requirement said: status='disconnected', tokens null.

    // We can just DELETE the row or UPDATE.
    // For 'channel_connections', usually ONE row per channel per tenant.
    // If we delete, we lose history/meta identifiers. 
    // Plan said: status='disconnected', access_token_encrypted=null, meta_identifiers={}

    const admin = createAdminClient();
    const { error } = await admin.from("channel_connections")
        .update({
            status: 'disconnected',
            access_token_encrypted: null,
            meta_identifiers: {},
            connection_method: null
        })
        .match({ tenant_id: member.tenant_id, channel: 'instagram' });

    if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
