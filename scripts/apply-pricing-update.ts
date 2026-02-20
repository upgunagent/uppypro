
import { createAdminClient } from "@/lib/supabase/admin";
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
    console.log("Applying Migration: 20260219190000_migrate_pricing_to_tl.sql");
    const supabase = createAdminClient();

    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260219190000_migrate_pricing_to_tl.sql');

    try {
        const sql = fs.readFileSync(migrationPath, 'utf8');
        console.log("Migration File Read OK. Length:", sql.length);

        // Supabase-js doesn't expose raw SQL execution easily via client without RPC.
        // But if there is a 'exec_sql' function defined in database (which is common in this project's pattern if I recall correctly from logs)
        // I should check if I can execute SQL.
        // If not, I'll log instruction. The user has access to Supabase dashboard likely.

        // Alternatively, I can't execute raw SQL directly via postgrest if no RPC.
        // Let's try to update `pricing` rows one by one using API.

        console.log("Updating pricing via API (since raw SQL exec might fail if no RPC)...");

        // 1. Inbox
        await updatePrice('inbox', {
            monthly_price_try: 895,
            monthly_price_usd: null,
            iyzico_pricing_plan_reference_code: 'a12a8c6c-7fda-4be7-b845-fd74bcf8487c'
        });

        // 2. AI
        await updatePrice('uppypro_ai', {
            monthly_price_try: 3995,
            monthly_price_usd: null,
            iyzico_pricing_plan_reference_code: '16551506-5da3-4a46-b7ca-b786c82d7410'
        });

        // 3. New Plans
        const newPlans = [
            { key: 'uppypro_corporate_small', price: 4995, ref: '0b25350a-8a9e-488e-8298-bbf577aa8c7c', name: 'Kurumsal Small', prodName: 'UppyPro Kurumsal (Small)' },
            { key: 'uppypro_corporate_medium', price: 6995, ref: 'af08a2ff-ba92-42ee-9c57-c740864878f5', name: 'Kurumsal Medium', prodName: 'UppyPro Kurumsal (Medium)' },
            { key: 'uppypro_corporate_large', price: 9995, ref: 'e371268a-19bc-4405-9e28-10970f81a109', name: 'Kurumsal Large', prodName: 'UppyPro Kurumsal (Large)' },
            { key: 'uppypro_corporate_xl', price: 12995, ref: '64d19b9b-48df-44e2-af2b-163741027bbd', name: 'Kurumsal XL', prodName: 'UppyPro Kurumsal (XL)' }
        ];

        for (const plan of newPlans) {
            await insertProductIfNotExists(plan.key, plan.prodName);
            await insertOrUpdatePlan(plan);
        }

        console.log("Migration applied via API successfully.");

    } catch (e) {
        console.error("Migration Error:", e);
    }

    async function insertProductIfNotExists(key: string, name: string) {
        const { data: existing } = await supabase
            .from('products')
            .select('key')
            .eq('key', key)
            .single();

        if (!existing) {
            const { error } = await supabase
                .from('products')
                .insert({
                    key: key,
                    name: name,
                    description: `${name} Abonelik Paketi`,
                    ai_tier: 'pro',
                    tool_limit: 99999
                });

            if (error) console.error(`Error inserting product ${key}:`, error);
            else console.log(`Inserted product ${key}`);
        } else {
            console.log(`Product ${key} already exists.`);
        }
    }

    async function updatePrice(key: string, updates: any) {
        const { error } = await supabase
            .from('pricing')
            .update(updates)
            .eq('product_key', key)
            .eq('billing_cycle', 'monthly');

        if (error) console.error(`Error updating ${key}:`, error);
        else console.log(`Updated ${key}`);
    }

    async function insertOrUpdatePlan(plan: any) {
        // Check if exists
        const { data: existing } = await supabase
            .from('pricing')
            .select('id')
            .eq('product_key', plan.key)
            .eq('billing_cycle', 'monthly')
            .single();

        if (existing) {
            const { error } = await supabase
                .from('pricing')
                .update({
                    monthly_price_try: plan.price,
                    monthly_price_usd: null,
                    iyzico_pricing_plan_reference_code: plan.ref,
                    note: `UppyPro ${plan.name} (TL)`
                })
                .eq('id', existing.id);

            if (error) console.error(`Error updating ${plan.key}:`, error);
            else console.log(`Updated existing ${plan.key}`);
        } else {
            const { error } = await supabase
                .from('pricing')
                .insert({
                    product_key: plan.key,
                    billing_cycle: 'monthly',
                    monthly_price_try: plan.price,
                    monthly_price_usd: null,
                    iyzico_pricing_plan_reference_code: plan.ref,
                    setup_fee_try: 0,
                    note: `UppyPro ${plan.name} (TL)`
                });

            if (error) console.error(`Error inserting ${plan.key}:`, error);
            else console.log(`Inserted new ${plan.key}`);
        }
    }
}

main();
