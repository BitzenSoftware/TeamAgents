-- =====================================================================
-- TeamAgents — Migração 010: Social Config (Discord, Facebook, Instagram)
-- =====================================================================

CREATE TABLE IF NOT EXISTS social_config (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id                      uuid NOT NULL REFERENCES clientes (id) ON DELETE CASCADE,

  -- Discord
  discord_webhook_url             text,

  -- Facebook
  facebook_page_id                text,
  facebook_page_access_token      text,

  -- Instagram (Business Account ligado à Facebook Page)
  instagram_business_account_id   text,

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_social_config_cliente UNIQUE (cliente_id)
);

CREATE OR REPLACE FUNCTION set_social_config_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_social_config_updated_at ON social_config;
CREATE TRIGGER trg_social_config_updated_at
  BEFORE UPDATE ON social_config
  FOR EACH ROW EXECUTE FUNCTION set_social_config_updated_at();

ALTER TABLE social_config ENABLE ROW LEVEL SECURITY;
