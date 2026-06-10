"""Agente Executivo — orquestrador (Opus) + workers (Haiku) em paralelo + síntese.

Padrão orchestrator-worker (best practices Anthropic):
- **Orquestrador** (Opus) divide o texto colado/carregado em itens discretos
  (cada email ou cada ata) — saída estruturada ``PlanoExecucao``.
- **Workers** (Haiku) processam cada item em paralelo, com contrato JSON rígido
  (``ItemProcessado``) que limita o output e poupa tokens.
- **Fan-out resiliente:** semáforo de concorrência + timeout + 1 retry curto +
  ``asyncio.gather(return_exceptions=True)`` — uma falha isolada não derruba o
  lote; a síntese é feita sobre os itens com êxito, reportando as falhas.
- **Sintetizador** (Opus) consolida os itens num resumo executivo único.

Prompt caching: o persona do agente vai como bloco ``cache_control`` ephemeral,
estável entre as três chamadas (igual ao padrão em ``llm.py``).
"""
import asyncio

import anthropic

from . import pricing
from .config import get_settings
from .llm import _load_prompt  # reutiliza o loader de agents/<id>/prompt.md
from .pricing import UsoLLM
from .schemas import (
    ExecutivoResultado,
    ItemBruto,
    ItemProcessado,
    PlanoExecucao,
    SinteseExecutiva,
    TipoItem,
)

_AGENT_ID = "assistente-executivo"
_WORKER_TIMEOUT = 60.0       # segundos por worker (Haiku é rápido)
_WORKER_CONCURRENCY = 6      # semáforo: nº de workers simultâneos
_MAX_ITENS = 30             # teto defensivo contra inputs gigantes

_INSTR_PLANEAR = (
    "## Tarefa atual: ORQUESTRADOR — dividir\n"
    "Separa o texto seguinte em itens discretos (um por email ou por ata). "
    "Não resumas; apenas classifica (`tipo`), dá um `titulo` curto e devolve o "
    "`conteudo` integral de cada item. Se for um único item, devolve uma lista "
    "com um só elemento."
)
_INSTR_WORKER = (
    "## Tarefa atual: WORKER — processar UM item\n"
    "Resume o item, atribui prioridade e extrai ações e decisões. Atém-te ao "
    "texto: não inventes responsáveis, prazos nem decisões."
)
_INSTR_SINTESE = (
    "## Tarefa atual: SINTETIZADOR — consolidar\n"
    "Consolida os itens já processados numa visão executiva única: resumo geral, "
    "prioridades por ordem, ações deduplicadas e decisões tomadas."
)


def _sys(extra: str = "") -> list[dict]:
    """System prompt: persona estável (cacheável) + instrução volátil da tarefa."""
    blocks: list[dict] = [
        {
            "type": "text",
            "text": _load_prompt(_AGENT_ID),
            "cache_control": {"type": "ephemeral"},
        }
    ]
    if extra:
        blocks.append({"type": "text", "text": extra})
    return blocks


async def _planear(client: anthropic.AsyncAnthropic, entrada: str) -> tuple[PlanoExecucao, UsoLLM]:
    s = get_settings()
    resp = await client.messages.parse(
        model=s.model_exec_orchestrator,
        max_tokens=8000,
        system=_sys(_INSTR_PLANEAR),
        messages=[{"role": "user", "content": entrada}],
        output_format=PlanoExecucao,
    )
    return resp.parsed_output, pricing.from_usage(s.model_exec_orchestrator, resp.usage)


async def _processar_item(
    client: anthropic.AsyncAnthropic,
    sem: asyncio.Semaphore,
    item: ItemBruto,
    habilidades: str,
    instrucoes: str = "",
) -> tuple[ItemProcessado, UsoLLM]:
    """Processa um item com timeout + 1 retry curto, sob o semáforo de concorrência."""
    s = get_settings()
    instr = _INSTR_WORKER
    if instrucoes:
        instr += f"\n\n## Foco pedido pelo utilizador para esta tarefa\n{instrucoes}"
    if habilidades:
        instr += "\n\n" + habilidades
    user = f"Tipo: {item.tipo.value}\nTítulo: {item.titulo}\n\n{item.conteudo}"
    async with sem:
        for tentativa in range(2):
            try:
                resp = await asyncio.wait_for(
                    client.messages.parse(
                        model=s.model_exec_worker,
                        max_tokens=1500,
                        system=_sys(instr),
                        messages=[{"role": "user", "content": user}],
                        output_format=ItemProcessado,
                    ),
                    timeout=_WORKER_TIMEOUT,
                )
                return resp.parsed_output, pricing.from_usage(s.model_exec_worker, resp.usage)
            except Exception:
                if tentativa == 0:
                    await asyncio.sleep(1.5)
                    continue
                raise
    raise RuntimeError("unreachable")


async def _sintetizar(
    client: anthropic.AsyncAnthropic, itens: list[ItemProcessado], n_falhas: int
) -> tuple[SinteseExecutiva, UsoLLM]:
    s = get_settings()
    partes = []
    for i, it in enumerate(itens, 1):
        partes.append(
            f"### Item {i} [{it.tipo.value}] {it.titulo}\n"
            f"Prioridade: {it.prioridade.value}\n"
            f"Resumo: {it.resumo}\n"
            f"Ações: {'; '.join(a.descricao for a in it.acoes) or '—'}\n"
            f"Decisões: {'; '.join(it.decisoes) or '—'}"
        )
    nota = f"\n\n(Nota: {n_falhas} item(ns) falharam o processamento; síntese parcial.)" if n_falhas else ""
    resp = await client.messages.parse(
        model=s.model_exec_orchestrator,
        max_tokens=2500,
        system=_sys(_INSTR_SINTESE),
        messages=[{"role": "user", "content": "\n\n".join(partes) + nota}],
        output_format=SinteseExecutiva,
    )
    return resp.parsed_output, pricing.from_usage(s.model_exec_orchestrator, resp.usage)


async def _engine(
    client: anthropic.AsyncAnthropic, itens: list[ItemBruto], habilidades: str, instrucoes: str = ""
) -> ExecutivoResultado:
    """Fan-out resiliente sobre itens JÁ discretos + síntese. Sem passo de planeamento."""
    itens = itens[:_MAX_ITENS]
    if not itens:
        vazio = SinteseExecutiva(resumo_geral="Não foi detetado conteúdo processável no texto fornecido.")
        return ExecutivoResultado(sintese=vazio, itens=[], n_itens=0, n_falhas=0)

    sem = asyncio.Semaphore(_WORKER_CONCURRENCY)
    resultados = await asyncio.gather(
        *(_processar_item(client, sem, it, habilidades, instrucoes) for it in itens),
        return_exceptions=True,
    )
    usos: list[UsoLLM] = []
    ok: list[ItemProcessado] = []
    for r in resultados:
        if isinstance(r, tuple):
            item, uso = r
            ok.append(item)
            usos.append(uso)
    n_falhas = len(resultados) - len(ok)

    if ok:
        sintese, uso_s = await _sintetizar(client, ok, n_falhas)
        usos.append(uso_s)
    else:
        sintese = SinteseExecutiva(
            resumo_geral="Não foi possível processar nenhum dos itens detetados. Tenta novamente."
        )
    total = pricing.soma(usos)
    return ExecutivoResultado(
        sintese=sintese, itens=ok, n_itens=len(itens), n_falhas=n_falhas,
        custo_usd=total.custo_usd, tokens_in=total.input_tokens, tokens_out=total.output_tokens, modelo=total.modelo,
    )


async def processar_itens(
    itens: list[ItemBruto], habilidades: str = "", instrucoes: str = ""
) -> ExecutivoResultado:
    """Processa itens JÁ discretos (ex.: cada email do Gmail) — SEM planeamento.

    Evita o orquestrador re-emitir o conteúdo (que truncava o JSON com muitos
    emails) e é mais barato: o fan-out de workers é determinístico.
    """
    async with anthropic.AsyncAnthropic(api_key=get_settings().anthropic_api_key) as client:
        return await _engine(client, itens, habilidades, instrucoes)


async def processar(entrada: str, habilidades: str = "") -> ExecutivoResultado:
    """Processa um texto colado/carregado. Tenta separar em itens; se o plano falhar
    (ex.: texto enorme que trunca o JSON), trata tudo como um único item — robusto.

    Cria um cliente async novo por chamada (cada request corre o seu próprio
    event loop via ``asyncio.run``); reutilizar um cliente entre loops fechados
    daria "Event loop is closed".
    """
    async with anthropic.AsyncAnthropic(api_key=get_settings().anthropic_api_key) as client:
        try:
            plano, _ = await _planear(client, entrada)
            itens = plano.itens
        except Exception:
            itens = [ItemBruto(tipo=TipoItem.ATA, titulo="Conteúdo", conteudo=entrada)]
        return await _engine(client, itens, habilidades)
