"""Fluxos multi-agente ("Organograma Vivo") — orquestração real entre os
assistentes de um projeto da Gestão.

Papéis: o **Gerente** planeja (comando livre) e sintetiza no fim; os
**Executores** produzem entregas em cadeia (cada etapa lê as anteriores);
o **Revisor** é o quality gate — aprova ou devolve a entrega uma vez com
parecer, e o executor refaz.

A execução corre em BackgroundTasks (mesmo padrão do webhook WhatsApp): o
endpoint devolve a execução imediatamente e o frontend faz polling do estado.
Cada etapa é uma chamada LLM cobrada por uso real (mesma contabilidade do
chat de projeto). A síntese final vira um relatório do projeto — entrando no
contexto compartilhado que todos os agentes leem (`_projeto_contexto`).
"""
from datetime import datetime, timezone

from pydantic import BaseModel, Field

from . import flow, llm, pricing
from .config import get_settings
from .db import get_db
from .schemas import ASSISTENTES

MAX_ETAPAS = 6          # teto de etapas por execução (guardrail de custo/loop)
_MAX_RESULTADO = 60_000  # cap do texto persistido por etapa
_MAX_CTX_ETAPA = 15_000  # cap de cada entrega anterior injetada no contexto


# ===================== Playbooks (times prontos) =====================
PLAYBOOKS: dict[str, dict] = {
    "lancamento": {
        "nome": "Lançamento de Produto",
        "descricao": "Da estratégia ao plano completo: posicionamento, cronograma, orçamento, aquisição e revisão jurídica.",
        "etapas": [
            ("estrategia", "Faça a análise SWOT completa do lançamento descrito no briefing e recomende o posicionamento (público, promessa, diferenciais)."),
            ("projetos", "Monte o cronograma executivo do lançamento em fases (semanas), com marcos, dependências e mapa de riscos com mitigação — baseado na análise estratégica anterior."),
            ("financeiro", "Monte o orçamento do lançamento: investimento por fase, projeção de receita em 3 cenários (pessimista/base/otimista) e ponto de equilíbrio."),
            ("crescimento", "Defina o plano de aquisição: canais recomendados, 3 experimentos de growth priorizados e métricas de sucesso das primeiras 4 semanas."),
            ("juridico", "Produza o checklist jurídico do lançamento: riscos legais, termos necessários, LGPD e pontos de atenção nos materiais propostos."),
        ],
    },
    "diagnostico": {
        "nome": "Diagnóstico da Empresa",
        "descricao": "Raio-X do negócio: finanças, operações, pessoas, auditoria e um plano de ação priorizado.",
        "etapas": [
            ("financeiro", "Faça o diagnóstico financeiro com base no briefing e documentos do projeto: saúde do caixa, custos, precificação e 3 recomendações priorizadas."),
            ("operacoes", "Faça o diagnóstico operacional: processos críticos, gargalos e desperdícios, com proposta de SOP para os 2 processos mais frágeis."),
            ("rh", "Faça o diagnóstico de pessoas: estrutura de equipe, lacunas de contratação e riscos trabalhistas visíveis no contexto."),
            ("auditoria", "Audite os diagnósticos anteriores: inconsistências entre eles, riscos não cobertos e oportunidades de melhoria."),
            ("estrategia", "Consolide tudo num plano de ação executivo: OKRs do trimestre e 10 ações priorizadas por impacto × esforço."),
        ],
    },
    "trafego": {
        "nome": "Campanha de Tráfego",
        "descricao": "Campanha completa: oferta, estrutura de mídia, orçamento e cronograma de execução.",
        "etapas": [
            ("produto", "Defina a oferta da campanha com base no briefing: proposta de valor, ancoragem de preço e combos/upsells."),
            ("crescimento", "Estruture a campanha: canais (Meta/Google), segmentação, funil até o WhatsApp e metas de CPL/CAC."),
            ("financeiro", "Monte o orçamento: investimento sugerido, CPL máximo aceitável e projeção de ROI em 3 cenários."),
            ("projetos", "Monte o cronograma de execução de 4 semanas: preparação, lançamento, otimização e relatório — com marcos e responsáveis."),
        ],
    },
}


def playbooks_listar() -> list[dict]:
    return [
        {"id": pid, "nome": p["nome"], "descricao": p["descricao"],
         "agente_ids": [a for a, _ in p["etapas"]]}
        for pid, p in PLAYBOOKS.items()
    ]


# ===================== Papéis por projeto =====================
def papeis_get(cliente_id: str, proj_id: str) -> dict | None:
    proj = flow._proj_do_cliente(cliente_id, proj_id)
    if not proj:
        return None
    rows = get_db().table("projeto_papeis").select("agente_id, papel").eq("projeto_id", proj_id).execute().data or []
    return {"papeis": {r["agente_id"]: r["papel"] for r in rows if r["agente_id"] in ASSISTENTES},
            "revisao_ativa": bool(proj.get("revisao_ativa", True))}


def papeis_set(cliente_id: str, proj_id: str, papeis: dict[str, str],
               revisao_ativa: bool | None = None) -> dict | None:
    if not flow._proj_do_cliente(cliente_id, proj_id):
        return None
    if revisao_ativa is not None:
        get_db().table("projetos").update({"revisao_ativa": revisao_ativa}).eq("id", proj_id).execute()
    agentes = set(flow._link_agentes("projeto_agentes", "projeto_id", proj_id))
    limpos = {a: p for a, p in papeis.items()
              if a in agentes and p in ("gerente", "executor", "revisor")}
    # No máximo 1 gerente e 1 revisor — mantém o primeiro de cada.
    vistos: set[str] = set()
    finais: dict[str, str] = {}
    for a, p in limpos.items():
        if p in ("gerente", "revisor") and p in vistos:
            p = "executor"
        vistos.add(p)
        finais[a] = p
    db = get_db()
    db.table("projeto_papeis").delete().eq("projeto_id", proj_id).execute()
    if finais:
        db.table("projeto_papeis").insert(
            [{"projeto_id": proj_id, "agente_id": a, "papel": p} for a, p in finais.items()]
        ).execute()
    return papeis_get(cliente_id, proj_id)


def _resolver_papeis(agentes: list[str], papeis: dict[str, str]) -> tuple[str, str | None]:
    """Devolve (gerente, revisor). Defaults: Projetos gerencia, Auditoria revisa."""
    gerente = next((a for a, p in papeis.items() if p == "gerente"), None)
    if not gerente:
        gerente = "projetos" if "projetos" in agentes else (agentes[0] if agentes else "projetos")
    revisor = next((a for a, p in papeis.items() if p == "revisor" and a != gerente), None)
    if not revisor and "auditoria" in agentes and "auditoria" != gerente:
        revisor = "auditoria"
    return gerente, revisor


# ===================== Planejador (comando livre) =====================
class _EtapaPlanejada(BaseModel):
    agente_id: str = Field(description="id do agente executor (um dos disponíveis)")
    tarefa: str = Field(description="tarefa objetiva e completa para esse agente")


class _PlanoFluxo(BaseModel):
    titulo: str = Field(description="título curto do fluxo (máx. 8 palavras)")
    etapas: list[_EtapaPlanejada]


def _planejar(gerente: str, agentes: list[str], comando: str, contexto: str) -> tuple[_PlanoFluxo, pricing.UsoLLM]:
    s = get_settings()
    disponiveis = "\n".join(f"- {a}" for a in agentes)
    instrucao = (
        "## Papel: Gerente do fluxo\n"
        "Você vai DECOMPOR o comando do usuário em etapas sequenciais, cada uma "
        "delegada a um agente da equipe do projeto. Regras:\n"
        f"- No máximo {MAX_ETAPAS} etapas; use o mínimo necessário.\n"
        "- Cada etapa deve ser autossuficiente e objetiva (o agente não poderá te perguntar nada).\n"
        "- Assuma premissas razoáveis a partir do contexto do projeto em vez de pedir esclarecimentos.\n"
        "- Ordene as etapas para que cada uma aproveite as entregas anteriores.\n"
        f"### Agentes disponíveis (use apenas estes ids)\n{disponiveis}\n"
    )
    resp = llm._client().messages.parse(
        model=s.model_assistente,
        max_tokens=1500,
        system=llm._system_blocks(gerente, extra=instrucao + ("\n" + contexto if contexto else "")),
        messages=[{"role": "user", "content": f"Comando do usuário:\n{comando}"}],
        output_format=_PlanoFluxo,
    )
    plano = resp.parsed_output
    plano.etapas = [e for e in plano.etapas if e.agente_id in agentes][:MAX_ETAPAS]
    return plano, pricing.from_usage(s.model_assistente, resp.usage)


# ===================== Revisor (quality gate) =====================
class _Revisao(BaseModel):
    aprovado: bool = Field(description="true se a entrega cumpre a tarefa com qualidade")
    parecer: str = Field(description="parecer curto: o que está bom e o que corrigir")


def _revisar(revisor: str, tarefa: str, entrega: str) -> tuple[_Revisao, pricing.UsoLLM]:
    s = get_settings()
    instrucao = (
        "## Papel: Revisor (quality gate do fluxo)\n"
        "Avalie se a entrega abaixo cumpre a tarefa com qualidade profissional. "
        "Reprove apenas por problemas concretos (erro, omissão relevante, inconsistência) — "
        "não por preferência de estilo."
    )
    resp = llm._client().messages.parse(
        model=s.model_assistente,
        max_tokens=800,
        system=llm._system_blocks(revisor, extra=instrucao),
        messages=[{"role": "user", "content": f"### Tarefa\n{tarefa}\n\n### Entrega\n{entrega[:_MAX_CTX_ETAPA]}"}],
        output_format=_Revisao,
    )
    return resp.parsed_output, pricing.from_usage(s.model_assistente, resp.usage)


# ===================== Execução =====================
_EXEC_COLS = "id, projeto_id, titulo, comando, playbook, status, resumo, erro, creditos, custo_usd, created_at, updated_at"
_ETAPA_COLS = "id, ordem, agente_id, tarefa, status, resultado, revisao, updated_at"


def _agora() -> str:
    return datetime.now(timezone.utc).isoformat()


def _upd_exec(exec_id: str, patch: dict) -> None:
    get_db().table("fluxo_execucoes").update({**patch, "updated_at": _agora()}).eq("id", exec_id).execute()


def _upd_etapa(etapa_id: str, patch: dict) -> None:
    get_db().table("fluxo_etapas").update({**patch, "updated_at": _agora()}).eq("id", etapa_id).execute()


def execucoes_listar(cliente_id: str, proj_id: str) -> list[dict]:
    if not flow._proj_do_cliente(cliente_id, proj_id):
        return []
    rows = (get_db().table("fluxo_execucoes").select(_EXEC_COLS)
            .eq("projeto_id", proj_id).order("created_at", desc=True).limit(30).execute().data or [])
    return rows


def execucao_obter(cliente_id: str, exec_id: str) -> dict | None:
    rows = (get_db().table("fluxo_execucoes").select(_EXEC_COLS + ", cliente_id")
            .eq("id", exec_id).eq("cliente_id", cliente_id).limit(1).execute().data)
    if not rows:
        return None
    ex = rows[0]
    ex.pop("cliente_id", None)
    etapas = (get_db().table("fluxo_etapas").select(_ETAPA_COLS)
              .eq("execucao_id", exec_id).order("ordem").execute().data or [])
    ex["etapas"] = etapas
    return ex


def iniciar(cliente_id: str, proj_id: str, playbook: str | None, comando: str | None) -> dict | None:
    """Cria a execução (status 'planejando') e devolve-a. O trabalho pesado
    acontece em `executar` (BackgroundTasks)."""
    proj = flow._proj_do_cliente(cliente_id, proj_id)
    if not proj:
        return None
    agentes = flow._link_agentes("projeto_agentes", "projeto_id", proj_id)
    if not agentes:
        raise ValueError("Este projeto não tem agentes. Adicione agentes na Gestão.")
    if playbook and playbook not in PLAYBOOKS:
        raise ValueError("Playbook desconhecido.")
    if not playbook and not (comando or "").strip():
        raise ValueError("Informe um comando ou escolha um playbook.")

    n_prev = len(PLAYBOOKS[playbook]["etapas"]) if playbook else MAX_ETAPAS
    # Pré-checagem de créditos: ~2 por etapa + planejamento/síntese do Gerente.
    flow.verificar_limite(cliente_id, 2 * n_prev + 2)

    titulo = PLAYBOOKS[playbook]["nome"] if playbook else (comando or "").strip().splitlines()[0][:80]
    row = {"projeto_id": proj_id, "cliente_id": cliente_id, "titulo": titulo,
           "comando": (comando or "").strip(), "playbook": playbook, "status": "planejando"}
    ex = get_db().table("fluxo_execucoes").insert(row).execute().data[0]
    ex["etapas"] = []
    return ex


def executar(exec_id: str) -> None:
    """Motor do fluxo (corre em background): planeja → executa etapas em cadeia
    → quality gate do Revisor → síntese final do Gerente vira relatório."""
    db = get_db()
    rows = db.table("fluxo_execucoes").select("*").eq("id", exec_id).limit(1).execute().data
    if not rows:
        return
    ex = rows[0]
    cliente_id, proj_id = ex["cliente_id"], ex["projeto_id"]
    proj = flow._proj_do_cliente(cliente_id, proj_id)
    if not proj:
        _upd_exec(exec_id, {"status": "erro", "erro": "Projeto não encontrado."})
        return

    agentes = flow._link_agentes("projeto_agentes", "projeto_id", proj_id)
    cfg = papeis_get(cliente_id, proj_id) or {}
    gerente, revisor = _resolver_papeis(agentes, cfg.get("papeis") or {})
    if not cfg.get("revisao_ativa", True):
        revisor = None  # quality gate desligado neste projeto
    contexto_proj = flow._projeto_contexto(proj)
    s = get_settings()
    usos: list[pricing.UsoLLM] = []

    def _consumir(uso: pricing.UsoLLM) -> None:
        usos.append(uso)
        flow.consumir_creditos(cliente_id, pricing.creditos_de_custo(uso.custo_usd, minimo=1), "assistente", uso=uso)

    try:
        # --- 1) Etapas: do playbook (reatribuindo ausentes ao Gerente) ou planejadas ---
        if ex.get("playbook"):
            plano = [(a if a in agentes else gerente, t) for a, t in PLAYBOOKS[ex["playbook"]]["etapas"]]
        else:
            flow.verificar_limite(cliente_id, 2)
            p, uso_p = _planejar(gerente, agentes, ex.get("comando") or "", contexto_proj)
            _consumir(uso_p)
            if p.titulo:
                _upd_exec(exec_id, {"titulo": p.titulo[:80]})
            plano = [(e.agente_id, e.tarefa) for e in p.etapas]
        if not plano:
            _upd_exec(exec_id, {"status": "erro", "erro": "O Gerente não conseguiu montar um plano. Detalhe melhor o comando."})
            return

        etapas = db.table("fluxo_etapas").insert([
            {"execucao_id": exec_id, "ordem": i, "agente_id": a, "tarefa": t}
            for i, (a, t) in enumerate(plano)
        ]).execute().data
        etapas.sort(key=lambda e: e["ordem"])
        _upd_exec(exec_id, {"status": "rodando"})

        # --- 2) Executa em cadeia; cada etapa lê as entregas anteriores ---
        entregas: list[tuple[str, str, str]] = []  # (agente, tarefa, resultado)

        def _executar_etapa(agente: str, tarefa: str, feedback: str = "") -> str:
            flow.verificar_limite(cliente_id, 2)
            extra = flow._habilidades_texto(cliente_id, agente=agente)
            extra = (extra + "\n\n" + contexto_proj) if (extra and contexto_proj) else (contexto_proj or extra)
            partes = []
            if entregas:
                partes.append("## Entregas anteriores deste fluxo (aproveite-as)\n" + "\n\n".join(
                    f"### {a} — {t[:120]}\n{r[:_MAX_CTX_ETAPA]}" for a, t, r in entregas))
            partes.append(
                "## Sua tarefa neste fluxo\n" + tarefa +
                "\nProduza a entrega completa em markdown, sem fazer perguntas — assuma premissas razoáveis a partir do contexto."
            )
            if feedback:
                partes.append("## Parecer do Revisor (corrija antes de reentregar)\n" + feedback)
            resp = llm._client().messages.create(
                model=s.model_assistente, max_tokens=4096,
                system=llm._system_blocks(agente, extra=extra),
                messages=[{"role": "user", "content": "\n\n".join(partes)}],
            )
            _consumir(pricing.from_usage(s.model_assistente, resp.usage))
            return "".join(b.text for b in resp.content if getattr(b, "type", None) == "text").strip()

        for et in etapas:
            _upd_etapa(et["id"], {"status": "rodando"})
            resultado = _executar_etapa(et["agente_id"], et["tarefa"])

            revisao_txt = ""
            if revisor and revisor != et["agente_id"]:
                _upd_etapa(et["id"], {"status": "revisao", "resultado": resultado[:_MAX_RESULTADO]})
                flow.verificar_limite(cliente_id, 1)
                rev, uso_r = _revisar(revisor, et["tarefa"], resultado)
                _consumir(uso_r)
                revisao_txt = ("✅ " if rev.aprovado else "❌ ") + rev.parecer
                if not rev.aprovado:
                    _upd_etapa(et["id"], {"status": "refazendo", "revisao": revisao_txt})
                    resultado = _executar_etapa(et["agente_id"], et["tarefa"], feedback=rev.parecer)
                    revisao_txt += "\n↻ Refeita após o parecer."

            _upd_etapa(et["id"], {"status": "concluida", "resultado": resultado[:_MAX_RESULTADO], "revisao": revisao_txt})
            entregas.append((et["agente_id"], et["tarefa"], resultado))

        # --- 3) Síntese final do Gerente → vira relatório do projeto (memória compartilhada) ---
        flow.verificar_limite(cliente_id, 2)
        sintese = _executar_etapa(
            gerente,
            "Sintetize as entregas deste fluxo num resumo executivo: o que foi produzido, "
            "decisões recomendadas, riscos em aberto e próximos passos. Seja direto.",
        )
        total = pricing.soma(usos)
        _upd_exec(exec_id, {"status": "concluida", "resumo": sintese[:_MAX_RESULTADO],
                            "creditos": pricing.creditos_de_custo(total.custo_usd, minimo=1),
                            "custo_usd": float(total.custo_usd)})
        titulo_rel = (db.table("fluxo_execucoes").select("titulo").eq("id", exec_id).limit(1).execute().data or [{}])[0].get("titulo") or "Fluxo"
        flow.projeto_relatorio_add(cliente_id, proj_id, {
            "titulo": f"[Fluxo] {titulo_rel}", "conteudo": sintese, "agente_id": gerente,
        })
    except flow.LimiteCreditosError as e:
        total = pricing.soma(usos) if usos else None
        _upd_exec(exec_id, {"status": "sem_creditos", "erro": str(e),
                            **({"custo_usd": float(total.custo_usd)} if total else {})})
    except Exception as e:  # noqa: BLE001 — estado do job precisa refletir qualquer falha
        _upd_exec(exec_id, {"status": "erro", "erro": str(e)[:500]})
