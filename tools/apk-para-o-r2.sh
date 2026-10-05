#!/bin/bash
# O APK mais novo de producao no endereco fixo (link-de-divulgacao, Andre 05/10).
#
#   bash tools/apk-para-o-r2.sh
#
# Pega o ultimo build `prod-apk` terminado no EAS, baixa e sobe no bucket R2
# como `vupth.apk` (nome fixo). O site redireciona `/baixar` para ele
# (public/_redirects), entao o link que circula nunca muda. Rodar depois de
# cada `eas build --profile prod-apk`.
#
# Precisa: login no EAS (`eas whoami`), jq, e no ambiente
#   R2_BUCKET              nome do bucket (ex.: vupth-apk)
#   CLOUDFLARE_API_TOKEN   token com R2 Edit
#   CLOUDFLARE_ACCOUNT_ID  a conta do Cloudflare
set -euo pipefail

: "${R2_BUCKET:?defina R2_BUCKET}"
: "${CLOUDFLARE_API_TOKEN:?defina CLOUDFLARE_API_TOKEN}"
: "${CLOUDFLARE_ACCOUNT_ID:?defina CLOUDFLARE_ACCOUNT_ID}"

BUILD=$(npx --yes eas-cli build:list --platform android --build-profile prod-apk \
  --status finished --limit 1 --json --non-interactive)
URL=$(echo "$BUILD" | jq -r '.[0].artifacts.buildUrl // empty')
VERSAO=$(echo "$BUILD" | jq -r '.[0].appVersion // "?"')
if [ -z "$URL" ]; then
  echo "ERRO: nenhum build prod-apk terminado no EAS."
  exit 1
fi

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
echo "Baixando o APK $VERSAO: $URL"
curl -fL --retry 3 -o "$TMP/vupth.apk" "$URL"

echo "Subindo para r2://$R2_BUCKET/vupth.apk"
npx --yes wrangler r2 object put "$R2_BUCKET/vupth.apk" --remote \
  --file "$TMP/vupth.apk" \
  --content-type application/vnd.android.package-archive \
  --cache-control "no-cache"

echo "Pronto: /baixar entrega o $VERSAO."
