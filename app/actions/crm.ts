"use server";

import { createClient } from "@/lib/supabase/server";

export async function fetchInstagramProfile(username: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "Oturum açmanız gerekiyor." };
        }

        // 1. Get Tenant ID
        const { data: member } = await supabase
            .from("tenant_members")
            .select("tenant_id")
            .eq("user_id", user.id)
            .single();

        if (!member?.tenant_id) {
            return { success: false, error: "Organizasyon bulunamadı." };
        }

        // 2. Get Instagram Connection
        const { data: connection } = await supabase
            .from("channel_connections")
            .select("access_token_encrypted, meta_identifiers")
            .eq("tenant_id", member.tenant_id)
            .eq("channel", "instagram")
            .eq("status", "connected")
            .single();

        if (!connection || !connection.access_token_encrypted) {
            return { success: false, error: "Instagram bağlantısı bulunamadı veya aktif değil." };
        }

        const accessToken = connection.access_token_encrypted;
        let igId = connection.meta_identifiers?.ig_id;
        const pageId = connection.meta_identifiers?.page_id;

        // Fallback: If ig_id is missing but we have page_id, try to fetch connected IG account dynamically
        if (!igId && pageId) {
            try {
                // Fetch linked IG account from Page
                const pageResp = await fetch(`https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account&access_token=${accessToken}`);
                const pageData = await pageResp.json();

                if (pageData.instagram_business_account?.id) {
                    igId = pageData.instagram_business_account.id;
                    console.log("Dynamically resolved IG ID:", igId);
                } else {
                    console.warn("Could not find linked instagram_business_account for page", pageId, pageData);
                }
            } catch (e) {
                console.error("Error fetching IG ID from Page ID:", e);
            }
        }

        if (!igId) {
            return { success: false, error: "Instagram Business ID (ig_id) bulunamadı. Lütfen Ayarlar sayfasından Instagram bağlantısını kontrol ediniz." };
        }

        // 3. Call Graph API
        // Clean username
        const cleanUsername = username.replace('@', '').trim();

        const url = `https://graph.facebook.com/v18.0/${igId}?fields=business_discovery.username(${cleanUsername}){profile_picture_url}&access_token=${accessToken}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("Meta API Error:", data.error);
            if (data.error.code === 100 || data.error.type === 'OAuthException') {
                return { success: false, error: `Kullanıcı bulunamadı veya gizli hesap. (Meta Hata Kodu: ${data.error.code}, Subcode: ${data.error.error_subcode || '-'})` };
            }
            return { success: false, error: `Instagram API hatası: ${data.error.message} (Kod: ${data.error.code})` };
        }

        const profilePic = data.business_discovery?.profile_picture_url;

        if (profilePic) {
            return { success: true, url: profilePic };
        } else {
            return { success: false, error: "Profil fotoğrafı bulunamadı." };
        }

    } catch (error: any) {
        console.error("fetchInstagramProfile Exception:", error);
        return { success: false, error: "Sunucu hatası: " + error.message };
    }
}
