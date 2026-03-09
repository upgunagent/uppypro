const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing DB credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLogs() {
    const { data, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) {
        console.error("Error fetching logs:", error);
        return;
    }

    let found = false;
    for (const log of data) {
        if (log.body && log.body.entry) {
            const entry = log.body.entry[0];
            if (entry.messaging) {
                for (const msg of entry.messaging) {
                    if (msg.read) {
                        console.log("FOUND INSTAGRAM READ WEBHOOK:");
                        console.log(JSON.stringify(log.body, null, 2));
                        console.log("------------------");
                        found = true;
                    }
                }
            }
        }
    }

    if (!found) {
        console.log("No Instagram read webhooks found in the last 100 logs.");
    }
}

checkLogs();
