#!/usr/bin/env bash
# Muda o plano do backend no Render entre "free" e "starter" — in-place, sem
# mudar URL/dados/env vars. Zero impacto no frontend.
#
# Uso:
#   RENDER_API_KEY=rnd_xxx ./scripts/render_plan.sh starter   # upgrade
#   RENDER_API_KEY=rnd_xxx ./scripts/render_plan.sh free      # downgrade
#
# A API key NUNCA fica no repo — passa-se por variável de ambiente.
set -euo pipefail

SERVICE_ID="srv-d8gc1fmk1jcs73cr4llg"   # teamagents-api
PLAN="${1:-}"

if [[ -z "${RENDER_API_KEY:-}" ]]; then
  echo "ERRO: define RENDER_API_KEY=rnd_..." >&2; exit 1
fi
if [[ "$PLAN" != "free" && "$PLAN" != "starter" ]]; then
  echo "Uso: $0 <free|starter>" >&2; exit 1
fi

echo "A mudar o plano para: $PLAN ..."
curl -s -X PATCH \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"serviceDetails\":{\"plan\":\"$PLAN\"}}" \
  "https://api.render.com/v1/services/$SERVICE_ID" \
  | python -c "import sys,json; d=json.load(sys.stdin); print('plano agora:', d.get('serviceDetails',{}).get('plan'))"

echo "Feito. O Render aplica a mudança em segundos, sem mexer no URL nem nos dados."
