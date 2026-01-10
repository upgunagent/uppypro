
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase URL or Service Key");
    process.exit(1);
}

const admin = createClient(supabaseUrl, supabaseServiceKey);

async function fixProducts() {
    console.log("Checking products...");

    const expectedProducts = [
        { key: 'base_inbox', name: 'UppyPro Inbox', description: 'Temel mesajlaşma paketi', ai_tier: 'none', tool_limit: 0 },
        { key: 'uppypro_ai', name: 'UppyPro AI', description: 'Yapay zeka özellikleri', ai_tier: 'medium', tool_limit: 50 },
        { key: 'uppypro_enterprise', name: 'UppyPro Kurumsal', description: 'Kurumsal özellikler ve otomasyon', ai_tier: 'pro', tool_limit: 9999 }
    ];

    for (const p of expectedProducts) {
        const { data: existing, error } = await admin.from('products').select('*').eq('key', p.key).single();

        if (error && error.code !== 'PGRST116') {
            console.error(`Error checking ${p.key}:`, error);
            continue;
        }

        if (!existing) {
            console.log(`Inserting missing product: ${p.key}`);
            const { error: insertError } = await admin.from('products').insert(p);
            if (insertError) {
                console.error(`Failed to insert ${p.key}:`, insertError);
            } else {
                console.log(`Inserted ${p.key}`);
            }
        } else {
            console.log(`Product exists: ${p.key}`);
        }
    }
}

fixProducts();
