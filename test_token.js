require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('channel_connections')
    .select('id, channel, access_token_encrypted')
    .eq('channel', 'whatsapp')
    .order('created_at', { ascending: false })
    .limit(1);
    
  if (error) {
    console.error('DB Error:', error);
  } else if (data && data.length > 0) {
    const token = data[0].access_token_encrypted;
    console.log('Original token length:', token.length);
    console.log('Includes whitespace/newline:', /\\s/.test(token));
    console.log('Exact token json string:', JSON.stringify(token));
  } else {
    console.log('No token found');
  }
  process.exit(0);
}
run();
