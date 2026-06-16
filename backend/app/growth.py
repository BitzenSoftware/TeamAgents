"""Diretoria Growth — equipe privada de agentes do superadmin para vender o
TeamAgents (conteúdo de LinkedIn + coach de vendas).

Padrão orchestrator-worker (igual ao Agente Executivo, mas síncrono — são poucos
diretores por comando):
- **CEO** (Opus) planeja: lê o objetivo e distribui diretivas aos diretores.
- **Diretores** (Sonnet/Opus) executam cada diretiva (conversa de turno único).
- **CEO** sintetiza os entregáveis num briefing executivo.

Também expõe:
- ``conversar`` — chat livre com qualquer agente (usado pelo Coach de Vendas e
  pela Sala de Comando em modo conversa).
- ``gerar_posts`` — o Ghostwriter produz N posts prontos para o LinkedIn.

Reutiliza o cliente e o loader de prompts de ``llm.py`` (prompt caching incluído).
"""
from .config import get_settings
from .llm import _client, _system_blocks
from . import pricing
from .pricing import UsoLLM
from .schemas import (
    GROWTH_DIRETORES,
    DiretivaGrowth,
    PlanoGrowth,
    PostGerado,
    PostsGerados,
)

_NOMES = {
    "growth-ceo": "CEO / Estrategista-Chefe",
    "growth-marketing": "Diretor de Marketing",
    "growth-comercial": "Diretor Comercial",
    "growth-projetos": "Diretor de Projetos",
    "growth-ghostwriter": "Ghostwriter de LinkedIn",
}

# Opus para raciocínio estratégico (CEO) e nuance de venda (Comercial); Sonnet
# para os demais. Resolvido por settings para ficar configurável.
_OPUS = {"growth-ceo": "model_growth_ceo", "growth-comercial": "model_growth_comercial"}


def _modelo(agente: str) -> str:
    s = get_settings()
    attr = _OPUS.get(agente)
    return getattr(s, attr) if attr else s.model_growth_diretor


def conversar(agente: str, mensagens: list[dict], extra: str = "", max_tokens: int = 1800) -> tuple[str, UsoLLM]:
    """Chat de turno(s) com um agente da diretoria. ``mensagens`` no formato da API."""
    model = _modelo(agente)
    kwargs: dict = {}
    if agente in _OPUS:  # Opus 4.8 — raciocínio adaptativo
        kwargs["thinking"] = {"type": "adaptive"}
    resp = _client().messages.create(
        model=model,
        max_tokens=max_tokens,
        system=_system_blocks(agente, extra=extra),
        messages=mensagens,
        **kwargs,
    )
    texto = "".join(b.text for b in resp.content if getattr(b, "type", None) == "text").strip()
    return texto, pricing.from_usage(model, resp.usage)


def _planear(objetivo: str) -> tuple[PlanoGrowth, UsoLLM]:
    s = get_settings()
    instr = (
        "## Tarefa atual: ORQUESTRADOR — planejar\n"
        "Leia o objetivo do fundador. Faça a leitura estratégica e distribua "
        "diretivas APENAS aos diretores necessários. Diretores válidos: "
        f"{', '.join(GROWTH_DIRETORES)}. Cada diretiva deve ser específica e acionável."
    )
    resp = _client().messages.parse(
        model=s.model_growth_ceo,
        max_tokens=1500,
        system=_system_blocks("growth-ceo", extra=instr),
        messages=[{"role": "user", "content": f"Objetivo do fundador:\n{objetivo}"}],
        output_format=PlanoGrowth,
    )
    return resp.parsed_output, pricing.from_usage(s.model_growth_ceo, resp.usage)


def _sintetizar(objetivo: str, entregaveis: list[dict]) -> tuple[str, UsoLLM]:
    partes = [f"### {e['diretor_nome']}\n{e['conteudo']}" for e in entregaveis]
    instr = (
        "## Tarefa atual: SINTETIZADOR — consolidar\n"
        "Junte os entregáveis dos diretores num briefing executivo curto que o "
        "fundador lê em 1 minuto: panorama, o que fazer primeiro e próximos passos. "
        "Corte o genérico; destaque o que move o ponteiro."
    )
    user = f"Objetivo original:\n{objetivo}\n\nEntregáveis dos diretores:\n\n" + "\n\n".join(partes)
    return conversar("growth-ceo", [{"role": "user", "content": user}], extra=instr, max_tokens=1800)


def orquestrar(objetivo: str) -> tuple[dict, UsoLLM]:
    """CEO planeja → diretores executam → CEO consolida. Devolve o resultado + custo total."""
    usos: list[UsoLLM] = []
    plano, uso_plano = _planear(objetivo)
    usos.append(uso_plano)

    entregaveis: list[dict] = []
    for d in plano.diretivas:
        if d.diretor not in GROWTH_DIRETORES:
            continue
        instr = (
            "## Diretiva do CEO para você\n"
            f"{d.foco}\n\nContexto — objetivo geral do fundador:\n{objetivo}\n\n"
            "Entregue algo pronto para usar, no seu formato (plano, scripts, lista de tarefas)."
        )
        conteudo, uso = conversar(d.diretor, [{"role": "user", "content": instr}], max_tokens=1800)
        usos.append(uso)
        entregaveis.append({
            "diretor": d.diretor,
            "diretor_nome": _NOMES.get(d.diretor, d.diretor),
            "foco": d.foco,
            "conteudo": conteudo,
        })

    if entregaveis:
        briefing, uso_s = _sintetizar(objetivo, entregaveis)
        usos.append(uso_s)
    else:
        briefing = plano.leitura_estrategica

    resultado = {
        "leitura_estrategica": plano.leitura_estrategica,
        "entregaveis": entregaveis,
        "briefing": briefing,
    }
    return resultado, pricing.soma(usos)


def gerar_posts(tema: str, quantidade: int = 3, tom: str = "") -> tuple[list[PostGerado], UsoLLM]:
    """Ghostwriter gera N posts prontos para o LinkedIn sobre um tema."""
    s = get_settings()
    extra = ""
    if tom:
        extra = "## Tom de voz / exemplos do fundador (clone este tom)\n" + tom
    user = (
        f"Escreva {quantidade} post(s) para o LinkedIn sobre: {tema}\n"
        "Cada post pronto para publicar, com ângulos diferentes entre si."
    )
    resp = _client().messages.parse(
        model=s.model_growth_diretor,
        max_tokens=3000,
        system=_system_blocks("growth-ghostwriter", extra=extra),
        messages=[{"role": "user", "content": user}],
        output_format=PostsGerados,
    )
    return resp.parsed_output.posts, pricing.from_usage(s.model_growth_diretor, resp.usage)
