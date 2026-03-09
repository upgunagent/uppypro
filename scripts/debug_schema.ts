import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log("Checking columns in 'messages' table...");

    // Try to select a single message
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching message:', error);
    } else if (data && data.length > 0) {
        const columns = Object.keys(data[0]);
        console.log('Columns found:', columns.join(', '));
        console.log('Contains status:', columns.includes('status'));
        console.log('Contains is_read:', columns.includes('is_read'));
    } else {
        console.log('No messages found to check schema.');
    }
}

checkSchema();
