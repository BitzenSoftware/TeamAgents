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
