-- 20240101000002_billing_schema.sql

-- 8. products
CREATE TABLE products (
    key TEXT PRIMARY KEY, -- base_inbox, ai_starter, ai_medium, ai_pro
    name TEXT NOT NULL,
    description TEXT,
    ai_tier ai_tier NOT NULL DEFAULT 'none',
    tool_limit INT DEFAULT 0
);

-- 9. pricing
CREATE TABLE pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_key TEXT REFERENCES products(key) ON DELETE CASCADE,
    billing_cycle billing_cycle NOT NULL,
    monthly_price_try INT NOT NULL, -- In Cents/Kurus
    setup_fee_try INT DEFAULT 0,    -- In Cents/Kurus
    note TEXT
);

-- 10. subscriptions
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    status subscription_status DEFAULT 'pending',
    base_product_key TEXT NOT NULL REFERENCES products(key),
    ai_product_key TEXT REFERENCES products(key),
    billing_cycle billing_cycle NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    current_period_end TIMESTAMPTZ,
    iyzico_reference JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    provider TEXT DEFAULT 'iyzico',
    type TEXT, -- setup_fee, first_payment, recurring, annual
    amount_try INT NOT NULL, -- Kurus
    status TEXT DEFAULT 'initiated', -- initiated, success, failed
    provider_ref JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
