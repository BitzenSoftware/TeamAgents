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
    # IDs das habilidades a injetar no prompt. [] ou omitido = nenhuma (poupa tokens).
    # A lista é explícita: para "todas", o frontend envia todos os IDs.
    habilidade_ids: list[str] | None = None


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
    agendar_em: str | None = Field(
        default=None,
        description="SÓ quando action=SCHEDULE_MEETING e a pessoa confirmou um horário: copie aqui o inicio_iso EXATO do horário escolhido (da lista de horários reais). Caso contrário, deixe nulo.",
    )


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
    whatsapp_numero: str | None = None  # número da linha (E.164) p/ link de captação
    calcom_api_key: str | None = None
    calcom_event_type_id: int | None = None
    calendario_link: str | None = None
    whatsapp_dono: str | None = None
    limite_mensal_leads: int | None = None


# ===================== Habilidades (base de conhecimento) =====================
class AgenteSkill(str, Enum):
    """A que agente pertence a habilidade. `global` aplica-se a todos."""
    GLOBAL = "global"
    COPYWRITING = "copywriting"
    SDR = "sdr"
    BI = "bi"
    ASSISTENTE = "assistente"


class HabilidadeCreate(BaseModel):
    titulo: str = Field(min_length=1)
    conteudo: str = Field(min_length=1)
    agente: AgenteSkill = AgenteSkill.GLOBAL


class HabilidadeUpdate(BaseModel):
    titulo: str | None = None
    conteudo: str | None = None
    ativo: bool | None = None
    agente: AgenteSkill | None = None


class CampanhaUpdate(BaseModel):
    """Edição de uma campanha gerada — só os campos que o utilizador afina."""
    nome_campanha: str | None = None
    anuncio_dor: str | None = None
    anuncio_beneficio: str | None = None
    palavra_chave_gatilho: str | None = None


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


class CheckoutRequest(BaseModel):
    plano_id: str = Field(min_length=1)


# ===================== Pacotes de créditos avulsos =====================
class PacoteCreate(BaseModel):
    nome: str = Field(min_length=1)
    creditos: int = 0
    preco: float = 0
    stripe_price_id: str | None = None
    ativo: bool = True
    ordem: int = 0


class PacoteUpdate(BaseModel):
    nome: str | None = None
    creditos: int | None = None
    preco: float | None = None
    stripe_price_id: str | None = None
    ativo: bool | None = None
    ordem: int | None = None


class CompraPacoteRequest(BaseModel):
    pacote_id: str = Field(min_length=1)


class ConcederCreditosRequest(BaseModel):
    """Admin concede créditos de cortesia (avulsos) a uma empresa."""
    creditos: int = Field(gt=0, le=100000)


# ===================== Social Config =====================
class SocialConfigUpdate(BaseModel):
    discord_webhook_url: str | None = None
    facebook_page_id: str | None = None
    facebook_page_access_token: str | None = None
    instagram_business_account_id: str | None = None


class SocialPostRequest(BaseModel):
    mensagem: str = Field(min_length=1)
    image_url: str | None = None


class TokenExchangeRequest(BaseModel):
    user_access_token: str = Field(min_length=1)


class OAuthFacebookExchange(BaseModel):
    code: str
    redirect_uri: str


# ===================== Agente Executivo (Email & Atas) =====================
class TipoItem(str, Enum):
    EMAIL = "email"
    ATA = "ata"


class Prioridade(str, Enum):
    ALTA = "alta"
    MEDIA = "media"
    BAIXA = "baixa"


class ItemBruto(BaseModel):
    """Um item discreto separado pelo orquestrador (um email ou uma ata)."""
    tipo: TipoItem
    titulo: str = Field(description="Assunto do email / nome da reunião")
    conteudo: str = Field(description="Texto integral desse item")


class PlanoExecucao(BaseModel):
    """Saída do orquestrador: o input dividido em itens discretos."""
    itens: list[ItemBruto]


class AcaoItem(BaseModel):
    descricao: str
    responsavel: str | None = None
    prazo: str | None = None


class ItemProcessado(BaseModel):
    """Contrato rígido worker -> sintetizador (limita o output do worker)."""
    tipo: TipoItem
    titulo: str
    resumo: str = Field(description="2 a 4 frases com a essência")
    prioridade: Prioridade
    acoes: list[AcaoItem] = Field(default_factory=list)
    decisoes: list[str] = Field(default_factory=list)


class SinteseExecutiva(BaseModel):
    """Visão executiva consolidada de todos os itens processados."""
    resumo_geral: str
    prioridades: list[str] = Field(default_factory=list)
    acoes_consolidadas: list[AcaoItem] = Field(default_factory=list)
    decisoes_consolidadas: list[str] = Field(default_factory=list)


class ExecutivoResultado(BaseModel):
    """Resultado completo de um processamento (síntese + itens + relatório de falhas)."""
    sintese: SinteseExecutiva
    itens: list[ItemProcessado] = Field(default_factory=list)
    n_itens: int = 0
    n_falhas: int = 0
    # Custeio real (preenchido pelo engine a partir do usage de todas as chamadas).
    custo_usd: float = 0.0
    tokens_in: int = 0
    tokens_out: int = 0
    modelo: str | None = None


class ExecutivoRequest(BaseModel):
    entrada: str = Field(min_length=1, description="Email(s) ou ata(s) colados/carregados")
    titulo: str | None = None


# --- Fase 2: integração de email por OAuth ---
class OAuthGoogleExchange(BaseModel):
    code: str
    redirect_uri: str


class EmailSyncRequest(BaseModel):
    provider: str = "gmail"
    max_results: int = Field(default=10, ge=1, le=25)
    tarefa_ids: list[str] | None = None  # se vier, corre só essas; senão todas as ativas


# --- Tarefas dirigidas do Agente Executivo ---
# Períodos válidos da frequência de uma tarefa do Agente Executivo.
FREQUENCIAS = ("diaria", "semanal", "quinzenal", "mensal", "trimestral", "semestral")


class TarefaExecutivoCreate(BaseModel):
    nome: str = Field(min_length=1)
    remetente: str | None = None
    palavras_chave: str | None = None
    janela_dias: int = Field(default=1, ge=1, le=180)
    frequencia: str = "diaria"      # período (ver FREQUENCIAS)
    automatica: bool = False        # True = corre no cron; False = só ao sincronizar
    dia_semana: int | None = Field(default=None, ge=0, le=6)  # semanal/quinzenal (0=Seg)
    dia_mes: int | None = Field(default=None, ge=1, le=31)    # mensal/trimestral/semestral
    hora: int = Field(default=7, ge=0, le=23)                 # hora local de execução (automática)
    fuso: str = "America/Sao_Paulo"                           # fuso horário da hora
    ativo: bool = True
    instrucoes: str | None = None  # o que extrair desses emails
    habilidade_ids: list[str] = Field(default_factory=list)


class TarefaExecutivoUpdate(BaseModel):
    nome: str | None = None
    remetente: str | None = None
    palavras_chave: str | None = None
    janela_dias: int | None = Field(default=None, ge=1, le=180)
    frequencia: str | None = None
    automatica: bool | None = None
    dia_semana: int | None = Field(default=None, ge=0, le=6)
    dia_mes: int | None = Field(default=None, ge=1, le=31)
    hora: int | None = Field(default=None, ge=0, le=23)
    fuso: str | None = None
    ativo: bool | None = None
    instrucoes: str | None = None
    habilidade_ids: list[str] | None = None


# ===================== Blog (CMS do superadmin) =====================
class BlogPostCreate(BaseModel):
    titulo: str = Field(min_length=1)
    slug: str | None = None
    resumo: str | None = None
    meta_description: str | None = None
    conteudo: str = ""
    capa_url: str | None = None
    publicado: bool = False


class BlogPostUpdate(BaseModel):
    titulo: str | None = None
    slug: str | None = None
    resumo: str | None = None
    meta_description: str | None = None
    conteudo: str | None = None
    capa_url: str | None = None
    publicado: bool | None = None


# ===================== Suporte (chat cliente <-> admin) =====================
class SuporteMensagem(BaseModel):
    mensagem: str = Field(min_length=1, max_length=4000)


# ===================== Diretoria Growth (menu do superadmin) =====================
# IDs dos diretores que o CEO pode acionar na orquestração.
GROWTH_DIRETORES = ("growth-marketing", "growth-comercial", "growth-projetos")
# Agentes com quem o superadmin pode conversar diretamente (chat).
GROWTH_AGENTES_CHAT = (
    "growth-ceo", "growth-marketing", "growth-comercial",
    "growth-projetos", "growth-ghostwriter",
)


class GrowthMensagem(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1)


class GrowthChatRequest(BaseModel):
    """Conversa direta com um agente da diretoria (ex.: Coach de Vendas)."""
    agente: str = "growth-ceo"
    mensagens: list[GrowthMensagem] = Field(min_length=1)


class GrowthComandoRequest(BaseModel):
    """Objetivo passado ao CEO; ele planeja, aciona os diretores e consolida."""
    objetivo: str = Field(min_length=3, max_length=4000)


class DiretivaGrowth(BaseModel):
    """O CEO atribui uma diretiva a um diretor (saída do planejamento)."""
    diretor: str = Field(description="Um de: growth-marketing | growth-comercial | growth-projetos")
    foco: str = Field(description="O que esse diretor deve entregar, específico e acionável")


class PlanoGrowth(BaseModel):
    """Saída estruturada do CEO no papel de orquestrador."""
    leitura_estrategica: str = Field(description="Leitura curta do que importa neste objetivo")
    diretivas: list[DiretivaGrowth] = Field(description="Só os diretores realmente necessários")


class PostGerado(BaseModel):
    titulo: str = Field(description="Rótulo interno curto do post")
    conteudo: str = Field(description="Texto completo pronto para publicar (gancho + corpo + CTA + hashtags)")


class PostsGerados(BaseModel):
    posts: list[PostGerado]


class GrowthPostsRequest(BaseModel):
    """Pede ao Ghostwriter N posts sobre um tema."""
    tema: str = Field(min_length=3, max_length=2000)
    quantidade: int = Field(default=3, ge=1, le=6)
    tom: str | None = Field(default=None, description="Exemplos/observações de tom de voz do fundador")


class GrowthPostUpdate(BaseModel):
    titulo: str | None = None
    conteudo: str | None = None
    status: str | None = Field(default=None, pattern="^(rascunho|aprovado|agendado|publicado)$")
    agendado_para: str | None = None


class GrowthConfigUpdate(BaseModel):
    modo_aprovacao: str | None = Field(default=None, pattern="^(manual|auto)$")


# ===================== Webhook do WhatsApp =====================
class InboundMessage(BaseModel):
    """Mensagem normalizada vinda do provider de WhatsApp."""
    instance: str = Field(description="Nome da instância (roteia para o cliente dono)")
    whatsapp: str = Field(description="Número do lead em E.164, ex: +5511999999999")
    text: str
    nome: str | None = None
