"""Custeio real por tokens — garante que o crédito cobrado segue o modelo usado.

Cada chamada à Anthropic devolve `usage` (input/output/cache). Aqui convertemos
isso em custo USD pelo preço do modelo efetivamente usado e depois em créditos,
com uma margem embutida (USD_POR_CREDITO) e um piso por operação. Assim nunca se
cobra abaixo do custo real → sem prejuízo.
"""
from __future__ import annotations

import math
from dataclasses import dataclass

from .config import get_settings

# Preço por 1.000.000 de tokens (USD): (input, output). Mantém os IDs exatos.
PRECO_USD_POR_1M: dict[str, tuple[float, float]] = {
    "claude-opus-4-8": (5.0, 25.0),
    "claude-sonnet-4-6": (3.0, 15.0),
    "claude-haiku-4-5": (1.0, 5.0),
}
# Modelo desconhecido → assume o mais caro (Opus): conservador, nunca subfatura.
_PRECO_FALLBACK = (5.0, 25.0)

# Multiplicadores de cache da Anthropic (sobre o preço de input).
_CACHE_WRITE_MULT = 1.25
_CACHE_READ_MULT = 0.10


@dataclass
class UsoLLM:
    modelo: str
    input_tokens: int
    output_tokens: int
    cache_write: int
    cache_read: int
    custo_usd: float

    @property
    def tokens_total(self) -> int:
        return self.input_tokens + self.output_tokens + self.cache_write + self.cache_read


def _g(usage, *nomes: str) -> int:
    for n in nomes:
        v = getattr(usage, n, None)
        if v:
            return int(v)
    return 0


def from_usage(modelo: str, usage) -> UsoLLM:
    """Constrói o UsoLLM (com custo USD) a partir do objeto usage da Anthropic."""
    p_in, p_out = PRECO_USD_POR_1M.get(modelo, _PRECO_FALLBACK)
    inp = _g(usage, "input_tokens")
    out = _g(usage, "output_tokens")
    cw = _g(usage, "cache_creation_input_tokens")
    cr = _g(usage, "cache_read_input_tokens")
    custo = (
        inp * p_in
        + cw * p_in * _CACHE_WRITE_MULT
        + cr * p_in * _CACHE_READ_MULT
        + out * p_out
    ) / 1_000_000.0
    return UsoLLM(modelo=modelo, input_tokens=inp, output_tokens=out, cache_write=cw, cache_read=cr, custo_usd=custo)


def soma(usos: list[UsoLLM]) -> UsoLLM:
    """Agrega vários usos (ex.: orquestrador + workers + síntese) num só."""
    return UsoLLM(
        modelo="+".join(sorted({u.modelo for u in usos})) or "—",
        input_tokens=sum(u.input_tokens for u in usos),
        output_tokens=sum(u.output_tokens for u in usos),
        cache_write=sum(u.cache_write for u in usos),
        cache_read=sum(u.cache_read for u in usos),
        custo_usd=sum(u.custo_usd for u in usos),
    )


def creditos_de_custo(custo_usd: float, minimo: int = 1) -> int:
    """Converte custo USD em créditos (arredonda p/ cima), nunca abaixo do piso."""
    upc = get_settings().usd_por_credito or 0.004
    cr = math.ceil(custo_usd / upc) if custo_usd and custo_usd > 0 else 0
    return max(cr, minimo)
