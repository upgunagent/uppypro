-- 0001_core_schema.sql

-- Enable uuid-ossp for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- A) Enums
CREATE TYPE member_role AS ENUM ('agency_admin', 'tenant_owner', 'tenant_agent');
CREATE TYPE channel_type AS ENUM ('whatsapp', 'instagram');
CREATE TYPE conversation_mode AS ENUM ('BOT', 'HUMAN');
CREATE TYPE message_direction AS ENUM ('IN', 'OUT');
CREATE TYPE sender_type AS ENUM ('CUSTOMER', 'BOT', 'HUMAN');
CREATE TYPE subscription_status AS ENUM ('pending', 'active', 'past_due', 'canceled');
CREATE TYPE billing_cycle AS ENUM ('monthly', 'annual');
CREATE TYPE ai_tier AS ENUM ('none', 'starter', 'medium', 'pro');

-- B) Core Tables

-- 1. tenants
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. profiles (extends auth.users)
CREATE TABLE profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. tenant_members (Many-to-Many: Users <-> Tenants)
CREATE TABLE tenant_members (
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
    role member_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (tenant_id, user_id)
);

-- 4. channel_connections
CREATE TABLE channel_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    channel channel_type NOT NULL,
    status TEXT DEFAULT 'disconnected', -- connected, disconnected, error
    meta_identifiers JSONB DEFAULT '{}'::jsonb, -- Store phone_number_id, waba_id, ig_id etc.
    access_token_encrypted TEXT, -- Ideally use Supabase Vault or similar, storing basic encrypted text for MVP
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, channel)
);

-- 5. agent_settings
CREATE TABLE agent_settings (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    ai_operational_enabled BOOLEAN DEFAULT FALSE,
    n8n_webhook_url TEXT,
    default_mode conversation_mode DEFAULT 'HUMAN',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. conversations
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    channel channel_type NOT NULL,
    external_thread_id TEXT NOT NULL, -- WA phone number or IG thread ID
    customer_handle TEXT, -- Customer name or number
    mode conversation_mode DEFAULT 'HUMAN',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, channel, external_thread_id)
);

-- 7. messages
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    direction message_direction NOT NULL,
    sender sender_type NOT NULL, -- Who sent it?
    text TEXT,
    payload JSONB, -- For media, templates, etc.
    external_message_id TEXT, -- Meta message ID
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_messages_dedupe ON messages(tenant_id, external_message_id) WHERE external_message_id IS NOT NULL;
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_conversations_tenant_id ON conversations(tenant_id);

-- Trigger to create profile on auth.user creation (optional but good practice)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
