"""Motor de agenda nativo — cálculo de disponibilidade dos profissionais.

Disponibilidade = escala do profissional − almoço − ausências − agendamentos
existentes, fatiada pela duração do serviço, num fuso único por conta.

Tudo determinístico (Python puro). Os horários (escala/almoço) são `time`
locais; convertemos para datetimes no fuso da conta. As comparações de conflito
são feitas em UTC (timestamptz vindos da BD).

dia_semana: 0=domingo .. 6=sábado.
"""
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

TZ = ZoneInfo("America/Sao_Paulo")  # fuso único por conta (configurável depois)


def _parse_time(v) -> time | None:
    if not v:
        return None
    if isinstance(v, time):
        return v
    s = str(v)
    for fmt in ("%H:%M:%S", "%H:%M"):
        try:
            return datetime.strptime(s, fmt).time()
        except ValueError:
            continue
    return None


def _parse_dt(v) -> datetime | None:
    if not v:
        return None
    if isinstance(v, datetime):
        return v if v.tzinfo else v.replace(tzinfo=TZ)
    try:
        d = datetime.fromisoformat(str(v).replace("Z", "+00:00"))
        return d if d.tzinfo else d.replace(tzinfo=TZ)
    except ValueError:
        return None


def _parse_date(v) -> date | None:
    if isinstance(v, date) and not isinstance(v, datetime):
        return v
    try:
        return date.fromisoformat(str(v)[:10])
    except (ValueError, TypeError):
        return None


def _dia_semana(d: date) -> int:
    """date.weekday(): seg=0..dom=6 → nosso esquema dom=0..sáb=6."""
    return (d.weekday() + 1) % 7


def _overlaps(a_ini: datetime, a_fim: datetime, b_ini: datetime, b_fim: datetime) -> bool:
    return a_ini < b_fim and b_ini < a_fim


def slots_profissional(
    *,
    escala_por_dia: dict[int, dict],
    ausencias: list[dict],
    ocupados: list[tuple[datetime, datetime]],
    duracao_min: int,
    dias_futuros: int = 14,
    agora: datetime | None = None,
) -> list[dict]:
    """Gera os horários livres de UM profissional para um serviço de `duracao_min`.

    - ``escala_por_dia``: {dia_semana: {hora_inicio, hora_fim, intervalo_min, almoco_inicio, almoco_fim}}
    - ``ausencias``: linhas de profissional_ausencias.
    - ``ocupados``: agendamentos já marcados (início, fim) em datetime aware.
    Devolve [{inicio_iso, fim_iso, rotulo}], em ordem cronológica.
    """
    agora = agora or datetime.now(TZ)
    duracao = timedelta(minutes=max(duracao_min, 5))
    out: list[dict] = []

    for offset in range(dias_futuros + 1):
        dia = (agora + timedelta(days=offset)).date()
        esc = escala_por_dia.get(_dia_semana(dia))
        if not esc:
            continue  # não trabalha nesse dia

        h_ini = _parse_time(esc.get("hora_inicio"))
        h_fim = _parse_time(esc.get("hora_fim"))
        if not h_ini or not h_fim:
            continue
        passo = timedelta(minutes=max(int(esc.get("intervalo_min") or 30), 5))
        almoco_i = _parse_time(esc.get("almoco_inicio"))
        almoco_f = _parse_time(esc.get("almoco_fim"))

        janela_ini = datetime.combine(dia, h_ini, tzinfo=TZ)
        janela_fim = datetime.combine(dia, h_fim, tzinfo=TZ)
        almoco = None
        if almoco_i and almoco_f:
            almoco = (datetime.combine(dia, almoco_i, tzinfo=TZ), datetime.combine(dia, almoco_f, tzinfo=TZ))

        # Bloqueios de ausência que tocam esse dia.
        bloqueios: list[tuple[datetime, datetime]] = []
        for a in ausencias:
            di = _parse_date(a.get("data_inicio"))
            df = _parse_date(a.get("data_fim")) or di
            if not di or not (di <= dia <= df):
                continue
            if a.get("tipo") == "horas":
                ai = _parse_time(a.get("hora_inicio"))
                af = _parse_time(a.get("hora_fim"))
                if ai and af:
                    bloqueios.append((datetime.combine(dia, ai, tzinfo=TZ), datetime.combine(dia, af, tzinfo=TZ)))
            else:
                bloqueios.append((janela_ini, janela_fim))  # dia inteiro

        slot_ini = janela_ini
        while slot_ini + duracao <= janela_fim:
            slot_fim = slot_ini + duracao
            if slot_ini < agora:
                slot_ini += passo
                continue
            conflito = False
            if almoco and _overlaps(slot_ini, slot_fim, almoco[0], almoco[1]):
                conflito = True
            if not conflito:
                for b in bloqueios:
                    if _overlaps(slot_ini, slot_fim, b[0], b[1]):
                        conflito = True
                        break
            if not conflito:
                for o_ini, o_fim in ocupados:
                    if _overlaps(slot_ini, slot_fim, o_ini, o_fim):
                        conflito = True
                        break
            if not conflito:
                out.append({
                    "inicio_iso": slot_ini.isoformat(),
                    "fim_iso": slot_fim.isoformat(),
                    "rotulo": _rotulo(slot_ini),
                })
            slot_ini += passo

    return out


_DIAS_PT = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"]


def _rotulo(dt: datetime) -> str:
    dia = _DIAS_PT[dt.weekday()]
    return f"{dia}-feira {dt.day:02d}/{dt.month:02d} às {dt.hour:02d}:{dt.minute:02d}" if dt.weekday() < 5 \
        else f"{dia} {dt.day:02d}/{dt.month:02d} às {dt.hour:02d}:{dt.minute:02d}"
