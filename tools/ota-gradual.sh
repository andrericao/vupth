#!/usr/bin/env bash
# ota-gradual (DEC-174, André 03/11): o OTA da producao sobe para 10% dos aparelhos (o CI publica com
# --rollout-percentage 10). Este script promove para 100% ou volta atras. Precisa do `eas` logado.
#
# Uso:  tools/ota-gradual.sh status      # lista os ultimos updates da branch production
#       tools/ota-gradual.sh promover    # 10% -> 100% (pergunta antes, mostrando o grupo)
#       tools/ota-gradual.sh reverter    # desfaz o rollout: todos seguem no update anterior (pergunta antes)
# Entre uma etapa e outra: Sentry (erros novos) e painel do Expo (https://expo.dev, Updates > production).
# A guarda de compatibilidade (DEC-152, tools/guardaOta.js) continua valendo: ela roda no CI antes do publicar.
set -euo pipefail
BRANCH="${OTA_BRANCH:-production}"
ACAO="${1:-status}"

ultimo_grupo() {
  eas update:list --branch "$BRANCH" --json --non-interactive --limit 1 \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);const ach=o=>{if(!o||typeof o!=="object")return null;if(o.group)return o;for(const v of Object.values(o)){const r=ach(v);if(r)return r}return null};const u=ach(j);if(!u){process.exit(2)}console.log(u.group+"\t"+(u.message||""))})'
}

confirma() {
  read -r -p "$1 [s/N] " r
  [ "$r" = "s" ] || [ "$r" = "S" ] || { echo "cancelado."; exit 0; }
}

case "$ACAO" in
  status)
    eas update:list --branch "$BRANCH" --limit 5 --non-interactive
    ;;
  promover)
    IFS=$'\t' read -r GRUPO MSG < <(ultimo_grupo) || { echo "nao achei o ultimo update de $BRANCH"; exit 2; }
    echo "grupo $GRUPO — $MSG"
    confirma "Levar este update a 100% dos aparelhos?"
    eas update:edit "$GRUPO" --rollout-percentage 100 --non-interactive
    ;;
  reverter)
    confirma "Desfazer o rollout em andamento de $BRANCH (todos seguem no update anterior)?"
    eas update:revert-update-rollout --branch "$BRANCH" --non-interactive
    ;;
  *)
    echo "uso: $0 status|promover|reverter" >&2
    exit 64
    ;;
esac
