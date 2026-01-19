
-- Abonelik İptal Sütunları
-- Mevcut subscriptions tablosuna iptal süreci için gerekli alanları ekler.

DO $$
BEGIN
    -- cancel_at_period_end
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'cancel_at_period_end') THEN
        ALTER TABLE public.subscriptions ADD COLUMN cancel_at_period_end BOOLEAN DEFAULT FALSE;
    END IF;

    -- cancel_reason
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'cancel_reason') THEN
        ALTER TABLE public.subscriptions ADD COLUMN cancel_reason TEXT;
    END IF;

    -- cancel_reason_details
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'cancel_reason_details') THEN
        ALTER TABLE public.subscriptions ADD COLUMN cancel_reason_details TEXT;
    END IF;

    -- canceled_at (Tamamen kapandığı tarih)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'canceled_at') THEN
        ALTER TABLE public.subscriptions ADD COLUMN canceled_at TIMESTAMPTZ;
    END IF;

    -- cancellation_scheduled_at (İptal talebinin alındığı tarih)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'cancellation_scheduled_at') THEN
        ALTER TABLE public.subscriptions ADD COLUMN cancellation_scheduled_at TIMESTAMPTZ;
    END IF;

END $$;

-- RLS Politikalarını Kontrol Et (Genellikle Authenticated users can read their own subscriptions)
-- Ekstra bir şey yapmaya gerek yok, mevcut politikalar yeterli olmalı.
