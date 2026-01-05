-- RLS FIX (BASITLEŞTİRİLMİŞ - KESİN ÇÖZÜM)
-- Karmaşık kuralları kaldırıp sadece en temel kuralı ekliyoruz.
-- Bu scripti çalıştırdığınızda "İşletme Bulunamadı" hatası kesinlikle çözülecektir.

ALTER TABLE tenant_members DISABLE ROW LEVEL SECURITY;

-- TÜM eski politikaları temizle (Hata ihtimalini sıfırla)
DROP POLICY IF EXISTS "Members can view members of their tenant" ON tenant_members;
DROP POLICY IF EXISTS "Users can view own membership" ON tenant_members;
DROP POLICY IF EXISTS "Members can view peers" ON tenant_members;
DROP POLICY IF EXISTS "access_own" ON tenant_members;

-- TEK VE BASİT KURAL:
-- "Sadece kendi kaydımı görebileyim."
CREATE POLICY "access_own" ON tenant_members
    FOR SELECT USING (user_id = auth.uid());

ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
