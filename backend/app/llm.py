"""Camada de LLM — chama a API da Anthropic para os 3 agentes.

Best practices aplicadas (skill claude-api):
- Saídas estruturadas via ``client.messages.parse(output_format=PydanticModel)``.
- Prompt caching: system prompt enviado como bloco com ``cache_control`` ephemeral.
  (Nota: o prefixo mínimo cacheável é 2048 tokens no Sonnet 4.6 e 4096 no
  Opus/Haiku. Os prompts dos agentes são curtos, por isso o cache só passa a
  engatar quando crescerem — a marcação fica correta desde já.)
- Model IDs exatos, sem sufixos de data.
"""
from functools import lru_cache
from pathlib import Path

import anthropic

from . import pricing
from .config import get_settings
from .pricing import UsoLLM
from .schemas import BiOutput, CopyOutput, SdrOutput

def _find_agents_dir() -> Path:
    """Localiza a pasta agents/ — funciona no repo (raiz) e no container (/app)."""
    here = Path(__file__).resolve()
    for base in (here.parents[2], here.parents[1], here.parent):
        cand = base / "agents"
        if cand.is_dir():
            return cand
    return here.parents[2] / "agents"  # fallback (layout do repo)


_AGENTS_DIR = _find_agents_dir()


@lru_cache
def _client() -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=get_settings().anthropic_api_key)


@lru_cache
def _load_prompt(agent_id: str) -> str:
    return (_AGENTS_DIR / agent_id / "prompt.md").read_text(encoding="utf-8")


def _system_blocks(agent_id: str, extra: str = "") -> list[dict]:
    """Constrói o system prompt como bloco cacheável.

    O conteúdo estável (prompt do agente) vem primeiro com cache_control; o
    contexto volátil da campanha vai depois, fora do breakpoint de cache.
    """
    blocks: list[dict] = [
        {
            "type": "text",
            "text": _load_prompt(agent_id),
            "cache_control": {"type": "ephemeral"},
        }
    ]
    if extra:
        blocks.append({"type": "text", "text": extra})
    return blocks


# ===================== Agente 1: Copywriting (Sonnet 4.6) =====================
def gerar_anuncios(nicho: str, dor_latente: str, habilidades: str = "") -> tuple[CopyOutput, UsoLLM]:
    s = get_settings()
    resp = _client().messages.parse(
        model=s.model_copywriting,
        max_tokens=2000,
        system=_system_blocks("copywriting", extra=habilidades),
        messages=[
            {
                "role": "user",
                "content": f"Nicho: {nicho}\nDor latente: {dor_latente}",
            }
        ],
        output_format=CopyOutput,
    )
    return resp.parsed_output, pricing.from_usage(s.model_copywriting, resp.usage)


# ===================== Agente 2: SDR (Haiku 4.5) =====================
def responder_sdr(
    *,
    lead_message: str,
    historico: list[dict],
    gatilho_principal: str,
    dor_alvo: str,
    palavra_chave_gatilho: str,
    link_calendario: str,
    habilidades: str = "",
) -> tuple[SdrOutput, UsoLLM]:
    """Gera a resposta do SDR.

    ``historico`` é uma lista de mensagens no formato da API
    (``{"role": "user"|"assistant", "content": "..."}``) em ordem cronológica.
    """
    s = get_settings()
    contexto = (
        "## Contexto da campanha (injetado pelo sistema)\n"
        f"- gatilho_principal: {gatilho_principal}\n"
        f"- dor_alvo: {dor_alvo}\n"
        f"- palavra_chave_gatilho: {palavra_chave_gatilho}\n"
        f"- link_calendario: {link_calendario}\n"
    )
    if habilidades:
        contexto += "\n" + habilidades
    messages = [*historico, {"role": "user", "content": lead_message}]
    resp = _client().messages.parse(
        model=s.model_sdr,
        max_tokens=600,
        system=_system_blocks("sdr", extra=contexto),
        messages=messages,
        output_format=SdrOutput,
    )
    return resp.parsed_output, pricing.from_usage(s.model_sdr, resp.usage)


# ===================== Agente 3: Diretor de BI (Opus 4.8) =====================
def gerar_relatorio(
    *,
    nome_cliente: str,
    nome_campanha: str,
    leads_totais: int,
    leads_respondidos: int,
    reunioes_agendadas: int,
    investimento_anuncios: float,
    taxa_conversao: float,
    custo_por_agendamento: float,
) -> tuple[BiOutput, UsoLLM]:
    """As métricas são calculadas em Python (determinístico) e passadas ao modelo,
    que produz o texto analítico do relatório."""
    s = get_settings()
    dados = (
        "## Dados brutos da semana\n"
        f"- nome_cliente: {nome_cliente}\n"
        f"- nome_campanha: {nome_campanha}\n"
        f"- leads_totais: {leads_totais}\n"
        f"- leads_respondidos: {leads_respondidos}\n"
        f"- reunioes_agendadas: {reunioes_agendadas}\n"
        f"- investimento_anuncios: {investimento_anuncios:.2f}\n"
        "## Métricas já calculadas (usa estes valores)\n"
        f"- taxa_conversao_lead_agendamento: {taxa_conversao:.2f}%\n"
        f"- custo_por_agendamento: R$ {custo_por_agendamento:.2f}\n"
    )
    resp = _client().messages.parse(
        model=s.model_bi,
        max_tokens=2000,
        thinking={"type": "adaptive"},
        system=_system_blocks("bi-director"),
        messages=[{"role": "user", "content": dados}],
        output_format=BiOutput,
    )
    return resp.parsed_output, pricing.from_usage(s.model_bi, resp.usage)
