"""Configuração central — lê o .env via pydantic-settings."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Anthropic
    anthropic_api_key: str

    # Supabase
    supabase_url: str
    supabase_service_role_key: str

    # WhatsApp provider
    whatsapp_api_url: str = ""
    whatsapp_api_key: str = ""
    whatsapp_instance: str = "default"

    # App
    webhook_verify_token: str = ""
    # Origens permitidas para CORS (separadas por vírgula). "*" só em dev.
    allowed_origins: str = "*"
    # Email do superadmin (gere os planos)
    superadmin_email: str = "bitzensoftware@bitzen.app"

    # Facebook App (para troca de token de longa duração)
    facebook_app_id: str = ""
    facebook_app_secret: str = ""

    # Google OAuth (Agente Executivo — ligar Gmail, Fase 2)
    google_client_id: str = ""
    google_client_secret: str = ""

    # Custeio por tokens: USD de custo de API que 1 crédito "absorve".
    # Menor = cobra mais créditos (mais margem). A receita/crédito (mesmo no plano
    # mais barato) é várias vezes este valor, por isso a margem fica garantida.
    usd_por_credito: float = 0.004
    # Câmbio USD→BRL para mostrar custo/margem em reais no painel Empresas.
    usd_brl: float = 5.40

    # Stripe (assinaturas dos planos)
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_currency: str = "brl"
    # URL pública do frontend (para os redirects do Checkout/Portal)
    frontend_url: str = "https://teamagents.bitzen.app"

    # Model IDs (exatos — não acrescentar sufixos de data)
    model_copywriting: str = "claude-sonnet-4-6"
    model_sdr: str = "claude-haiku-4-5"
    model_bi: str = "claude-opus-4-8"

    # Agente Executivo: orquestrador/síntese (Opus) + workers em paralelo (Haiku)
    model_exec_orchestrator: str = "claude-opus-4-8"
    model_exec_worker: str = "claude-haiku-4-5"


@lru_cache
def get_settings() -> Settings:
    return Settings()
