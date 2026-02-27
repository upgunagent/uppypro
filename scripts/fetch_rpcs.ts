import { createClient } from '@supabase/supabase-js';
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
    console.log("Fetching RPCs...");
    const query = `
        SELECT routine_name, routine_definition
        FROM information_schema.routines
        WHERE routine_type = 'FUNCTION' 
          AND routine_schema = 'public'
          AND routine_name IN ('check_availability', 'create_appointment', 'get_my_appointments', 'cancel_appointment', 'reschedule_appointment');
    `;

    // We can't run raw SQL easily without pg driver or rpc, so let's use the postgres module
}
run();
