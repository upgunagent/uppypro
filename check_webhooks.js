const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  'https://sxddrjjiohqflealwfnw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZGRyamppb2hxZmxlYWx3Zm53Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU0NTQ5MiwiZXhwIjoyMDgzMTIxNDkyfQ.64I0FDDHUj1L0-rxB_SYEKkKRK0GYhaBfcYMr-jrb8I'
);

async function fix() {
  // Gerçek recipient ID (webhook'lardan gelen)
  const REAL_IG_USER_ID = '17841405829551252';
  
  // Ana tenant (UPGUN PRODÜKSİYON) - mesajlar buraya gitmeli
  const MAIN_TENANT = '643458a5-32b3-4f76-8cc6-92049d900de0';
  
  // 1. Ana tenant'ın ig_user_id alanını güncelle
  const { data: conn } = await sb
    .from('channel_connections')
    .select('meta_identifiers')
    .eq('tenant_id', MAIN_TENANT)
    .eq('channel', 'instagram')
    .single();

  if (conn) {
    const updatedMeta = {
      ...conn.meta_identifiers,
      ig_user_id: REAL_IG_USER_ID,
      ig_id: REAL_IG_USER_ID
    };

    const { error } = await sb
      .from('channel_connections')
      .update({ meta_identifiers: updatedMeta })
      .eq('tenant_id', MAIN_TENANT)
      .eq('channel', 'instagram');

    if (error) {
      console.error('Update error:', error);
    } else {
      console.log('✅ UPGUN PRODÜKSİYON ig_user_id güncellendi:', REAL_IG_USER_ID);
      console.log('   Eski:', conn.meta_identifiers.ig_user_id);
      console.log('   Yeni:', REAL_IG_USER_ID);
    }
  }

  // 2. Duplikat tenant'ın (HAYRİ ÖZGÜR TOPKAN) ig bağlantısını da güncelle veya sil
  const OTHER_TENANT = 'acdafb2d-ab5c-4fff-baf1-9685be429de8';
  const { data: otherConn } = await sb
    .from('channel_connections')
    .select('meta_identifiers')
    .eq('tenant_id', OTHER_TENANT)
    .eq('channel', 'instagram')
    .single();

  if (otherConn) {
    const updatedOtherMeta = {
      ...otherConn.meta_identifiers,
      ig_user_id: REAL_IG_USER_ID,
      ig_id: REAL_IG_USER_ID
    };

    await sb
      .from('channel_connections')
      .update({ meta_identifiers: updatedOtherMeta })
      .eq('tenant_id', OTHER_TENANT)
      .eq('channel', 'instagram');
    
    console.log('✅ HAYRİ ÖZGÜR TOPKAN ig_user_id de güncellendi:', REAL_IG_USER_ID);
  }

  // 3. Doğrulama
  console.log('\n=== DOĞRULAMA ===');
  const { data: allConns } = await sb
    .from('channel_connections')
    .select('tenant_id, meta_identifiers')
    .eq('channel', 'instagram');

  for (const c of allConns || []) {
    const { data: t } = await sb.from('tenants').select('name').eq('id', c.tenant_id).single();
    console.log(`${t?.name}: ig_user_id=${c.meta_identifiers?.ig_user_id}`);
  }

  process.exit(0);
}

fix().catch(e => { console.error(e); process.exit(1); });
