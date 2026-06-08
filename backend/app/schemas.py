"""Modelos Pydantic — saídas estruturadas dos agentes e payloads da API."""
from enum import Enum

from pydantic import BaseModel, Field


# ===================== Agente 1: Copywriting =====================
class CopyMetadata(BaseModel):
    gatilho_principal: str
    dor_alvo: str
    desejo_alvo: str
    palavra_chave_gatilho: str


class CopyOutput(BaseModel):
    """Saída estruturada do agente de copywriting."""
    anuncio_dor: str = Field(description="Opção 1 — anúncio focado na dor, com emojis e CTA WhatsApp")
    anuncio_beneficio: str = Field(description="Opção 2 — anúncio focado no benefício/desejo")
    metadata: CopyMetadata


class CopyRequest(BaseModel):
    # cliente_id NÃO vem do body — é derivado do token (ver auth.current_cliente_id)
    nicho: str
    dor_latente: str
    nome_cliente: str
    nome_campanha: str
    link_calendario: str | None = None


# ===================== Agente 2: SDR =====================
class SdrAction(str, Enum):
    CONTINUE = "CONTINUE"
    SCHEDULE_MEETING = "SCHEDULE_MEETING"
    TRANSFER_TO_HUMAN = "TRANSFER_TO_HUMAN"


class SdrStatus(str, Enum):
    UNQUALIFIED = "UNQUALIFIED"
    IN_PROGRESS = "IN_PROGRESS"
    QUALIFIED = "QUALIFIED"


class SdrOutput(BaseModel):
    """Saída estruturada do SDR — sempre devolve resposta + estado."""
    response: str = Field(description="Texto curto (máx 3 frases) a enviar ao lead no WhatsApp")
    action: SdrAction
    qualification_status: SdrStatus


# ===================== Agente 3: Diretor de BI =====================
class BiMetrics(BaseModel):
    taxa_conversao_lead_agendamento: float
    custo_por_agendamento: float


class BiOutput(BaseModel):
    """Saída estruturada do relatório de BI."""
    relatorio_whatsapp: str = Field(description="Mensagem formatada pronta a enviar no WhatsApp do cliente")


# ===================== Onboarding (criar tenant) =====================
class OnboardingPayload(BaseModel):
    # Só o nome é obrigatório; o resto pode ser preenchido depois em Configurações.
    nome_empresa: str = Field(min_length=2)
    whatsapp_instance_name: str | None = None
    whatsapp_token: str | None = None
    whatsapp_api_url: str | None = None
    calendario_link: str | None = None
    whatsapp_dono: str | None = None


# ===================== Editar config (Configurações) =====================
class ConfigUpdate(BaseModel):
    whatsapp_instance_name: str | None = None
    whatsapp_token: str | None = None
    whatsapp_api_url: str | None = None
    calendario_link: str | None = None
    whatsapp_dono: str | None = None
    limite_mensal_leads: int | None = None


# ===================== Habilidades (base de conhecimento) =====================
class HabilidadeCreate(BaseModel):
    titulo: str = Field(min_length=1)
    conteudo: str = Field(min_length=1)


class HabilidadeUpdate(BaseModel):
    titulo: str | None = None
    conteudo: str | None = None
    ativo: bool | None = None


# ===================== Planos (superadmin) =====================
class PlanoCreate(BaseModel):
    nome: str = Field(min_length=1)
    creditos_mensais: int = 0
    preco: float = 0
    stripe_price_id: str | None = None
    ativo: bool = True
    ordem: int = 0


class PlanoUpdate(BaseModel):
    nome: str | None = None
    creditos_mensais: int | None = None
    preco: float | None = None
    stripe_price_id: str | None = None
    ativo: bool | None = None
    ordem: int | None = None


# ===================== Social Config =====================
class SocialConfigUpdate(BaseModel):
    discord_webhook_url: str | None = None
    facebook_page_id: str | None = None
    facebook_page_access_token: str | None = None
    instagram_business_account_id: str | None = None


class SocialPostRequest(BaseModel):
    mensagem: str = Field(min_length=1)
    image_url: str | None = None


# ===================== Webhook do WhatsApp =====================
class InboundMessage(BaseModel):
    """Mensagem normalizada vinda do provider de WhatsApp."""
    instance: str = Field(description="Nome da instância (roteia para o cliente dono)")
    whatsapp: str = Field(description="Número do lead em E.164, ex: +5511999999999")
    text: str
    nome: str | None = None
