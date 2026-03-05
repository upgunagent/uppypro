const fs = require('fs');
const path = require('path');
const env = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const vars = {};
env.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) vars[key.trim()] = rest.join('=').trim();
});

const { createClient } = require('@supabase/supabase-js');
const sb = createClient(vars.NEXT_PUBLIC_SUPABASE_URL, vars.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
    const { data, error } = await sb.from('webhook_logs')
        .select('body, headers, error_message, created_at')
        .in('error_message', ['OUTBOUND_ERROR', 'OUTBOUND_SUCCESS'])
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.log('DB ERROR:', error);
        process.exit(1);
    }

    data?.forEach((d, i) => {
        console.log(`\n=== LOG ${i + 1} (${d.error_message}) ===`);
        console.log('Time:', d.created_at);
        if (d.body?.template) {
            console.log('Template:', JSON.stringify(d.body.template, null, 2));
        } else {
            console.log('Body Type:', d.body?.type, '| To:', d.body?.to);
        }
        if (d.headers?.response?.error) {
            console.log('API Error:', JSON.stringify(d.headers.response.error, null, 2));
        }
        if (d.headers?.response?.messages) {
            console.log('Success msgId:', d.headers.response.messages[0]?.id);
        }
    });
    process.exit(0);
})();
