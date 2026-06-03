"""Orquestração do funil — funções que ligam BD <-> agentes <-> WhatsApp.

A BD é o "quadro-negro": os agentes não falam diretamente, trocam estado aqui.
"""
from . import llm, whatsapp
from .db import get_db
from .schemas import CopyRequest, CopyOutput, SdrAction, SdrStatus

# O SDR responde em enum legível (inglês); a BD usa o enum status_qualificacao
# em português. Mapeamos na fronteira BD.
_STATUS_DB = {
    SdrStatus.UNQUALIFIED: "DESQUALIFICADO",
    SdrStatus.IN_PROGRESS: "EM_ANDAMENTO",
    SdrStatus.QUALIFIED: "QUALIFICADO",
}


# ===================== Agente 1: criar campanha =====================
def criar_campanha(req: CopyRequest) -> dict:
    """Gera os anúncios e persiste a campanha. Síncrono (chamado pela UI do SaaS)."""
    out: CopyOutput = llm.gerar_anuncios(req.nicho, req.dor_latente)
    db = get_db()
    row = {
        "nome_cliente": req.nome_cliente,
        "nome_campanha": req.nome_campanha,
        "nicho": req.nicho,
        "dor_latente": req.dor_latente,
        "anuncio_dor": out.anuncio_dor,
        "anuncio_beneficio": out.anuncio_beneficio,
        "gatilho_principal": out.metadata.gatilho_principal,
        "dor_alvo": out.metadata.dor_alvo,
        "desejo_alvo": out.metadata.desejo_alvo,
        "palavra_chave_gatilho": out.metadata.palavra_chave_gatilho,
        "link_calendario": req.link_calendario,
        "status": "ATIVA",
    }
    res = db.table("campanhas").insert(row).execute()
    return res.data[0]


# ===================== Agente 2: processar mensagem do lead =====================
def _match_campanha(text: str) -> dict | None:
    """Liga o lead a uma campanha pela palavra-chave de entrada contida na mensagem."""
    db = get_db()
    campanhas = db.table("campanhas").select("*").eq("status", "ATIVA").execute().data
    up = text.upper()
    for c in campanhas:
        kw = (c.get("palavra_chave_gatilho") or "").upper()
        if kw and kw in up:
            return c
    return campanhas[0] if campanhas else None


def _get_or_create_lead(campanha_id: str, whatsapp_num: str, nome: str | None) -> dict:
    db = get_db()
    existing = (
        db.table("leads")
        .select("*")
        .eq("campanha_id", campanha_id)
        .eq("whatsapp", whatsapp_num)
        .execute()
        .data
    )
    if existing:
        return existing[0]
    row = {"campanha_id": campanha_id, "whatsapp": whatsapp_num, "nome": nome,
           "status_qualificacao": "FRIO"}
    return db.table("leads").insert(row).execute().data[0]


def _historico(lead_id: str) -> list[dict]:
    db = get_db()
    msgs = (
        db.table("historico_conversas")
        .select("autor, mensagem")
        .eq("lead_id", lead_id)
        .order("created_at")
        .execute()
        .data
    )
    out = []
    for m in msgs:
        role = "assistant" if m["autor"] == "AGENTE" else "user"
        out.append({"role": role, "content": m["mensagem"]})
    return out


def _save_msg(lead_id: str, autor: str, mensagem: str, agente: str | None = None) -> None:
    get_db().table("historico_conversas").insert(
        {"lead_id": lead_id, "autor": autor, "mensagem": mensagem, "agente": agente}
    ).execute()


async def processar_mensagem_lead(whatsapp_num: str, text: str, nome: str | None) -> None:
    """Tarefa de BACKGROUND: qualifica o lead e responde no WhatsApp.

    Roda DEPOIS de o webhook ter devolvido 200 OK ao provider.
    """
    db = get_db()
    campanha = _match_campanha(text)
    if not campanha:
        return  # nenhuma campanha ativa — nada a fazer

    lead = _get_or_create_lead(campanha["id"], whatsapp_num, nome)
    _save_msg(lead["id"], "LEAD", text)

    historico = _historico(lead["id"])
    # remove a última (acabámos de gravar a mensagem atual; passamo-la à parte)
    historico = historico[:-1] if historico else []

    out = llm.responder_sdr(
        lead_message=text,
        historico=historico,
        gatilho_principal=campanha.get("gatilho_principal") or "",
        dor_alvo=campanha.get("dor_alvo") or "",
        palavra_chave_gatilho=campanha.get("palavra_chave_gatilho") or "",
        link_calendario=campanha.get("link_calendario") or "",
    )

    _save_msg(lead["id"], "AGENTE", out.response, agente="sdr")

    # Atualiza estado do lead (mapeando o enum do SDR -> enum da BD)
    updates: dict = {"status_qualificacao": _STATUS_DB[out.qualification_status]}
    if out.action == SdrAction.SCHEDULE_MEETING:
        updates["reuniao_agendada"] = True
        updates["status_qualificacao"] = "QUALIFICADO"
    elif out.action == SdrAction.TRANSFER_TO_HUMAN:
        updates["transferido_humano"] = True
    db.table("leads").update(updates).eq("id", lead["id"]).execute()

    await whatsapp.send_text(whatsapp_num, out.response)


# ===================== Agente 3: relatório semanal =====================
def gerar_relatorio_campanha(campanha_id: str, periodo_inicio: str, periodo_fim: str) -> dict:
    """Agrega métricas da semana, gera o relatório e persiste em `relatorios`."""
    db = get_db()
    campanha = db.table("campanhas").select("*").eq("id", campanha_id).single().execute().data
    leads = db.table("leads").select("*").eq("campanha_id", campanha_id).execute().data

    leads_totais = len(leads)
    leads_respondidos = sum(1 for l in leads if l["status_qualificacao"] != "FRIO")
    reunioes = sum(1 for l in leads if l.get("reuniao_agendada"))
    investimento = float(campanha.get("investimento_anuncios") or 0)

    taxa = (reunioes / leads_totais * 100) if leads_totais else 0.0
    cpag = (investimento / reunioes) if reunioes else 0.0

    out = llm.gerar_relatorio(
        nome_cliente=campanha["nome_cliente"],
        nome_campanha=campanha["nome_campanha"],
        leads_totais=leads_totais,
        leads_respondidos=leads_respondidos,
        reunioes_agendadas=reunioes,
        investimento_anuncios=investimento,
        taxa_conversao=taxa,
        custo_por_agendamento=cpag,
    )

    row = {
        "campanha_id": campanha_id,
        "periodo_inicio": periodo_inicio,
        "periodo_fim": periodo_fim,
        "leads_totais": leads_totais,
        "leads_respondidos": leads_respondidos,
        "reunioes_agendadas": reunioes,
        "investimento_anuncios": investimento,
        "taxa_conversao_lead_agendamento": round(taxa, 2),
        "custo_por_agendamento": round(cpag, 2),
        "relatorio_whatsapp": out.relatorio_whatsapp,
    }
    return db.table("relatorios").insert(row).execute().data[0]
