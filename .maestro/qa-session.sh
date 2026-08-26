#!/usr/bin/env bash
# Sessao de QA visual, SEM digitar senha em formulario.
#
# Cria (ou reusa) uma conta de teste, faz login pela API e imprime um trecho de
# JavaScript pra colar no console do app web. O app le a sessao do
# localStorage, entao plantar as chaves ali equivale a ter logado.
#
# POR QUE ISTO EXISTE: o `TEST_ACCOUNTS.md` documentava contas de um seed de
# junho que nao existe mais em backend nenhum (conferido em 2026-08-26), e
# ninguem tinha como abrir as telas atras de login pra conferir o visual.
#
#   ./qa-session.sh [local|dev|prod] [email] [senha]
#
# ⚠️ O padrao e `local` DE PROPOSITO: `prod` e o Railway, que e producao.

set -euo pipefail

# Funciona de qualquer diretorio: o script se ancora na propria pasta, entao
# nao precisa de `cd` antes nem importa de onde voce chamou.
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

ENV="${1:-local}"
EMAIL="${2:-qa.visual@vupth.dev}"
SENHA="${3:-Teste@123}"

case "$ENV" in
  local) URL="http://localhost:8080" ;;
  dev)   URL="https://vupth-backend-ia.onrender.com" ;;
  prod)  URL="https://vupth-backend-ia-production.up.railway.app"
         echo "⚠️  PROD e o Railway — voce vai gravar em PRODUCAO. Ctrl-C pra abortar."
         sleep 4 ;;
  *) echo "ambiente invalido: $ENV (use local|dev|prod)"; exit 1 ;;
esac

echo "→ $ENV ($URL)"

# Registro e idempotente na pratica: se ja existir, o login abaixo resolve.
curl -s -m 60 -X POST "$URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$SENHA\"}" > /dev/null 2>&1 || true

RESP=$(curl -s -m 60 -X POST "$URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$SENHA\"}")

SAIDA=$(echo "$RESP" | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
except Exception:
    print("✗ login falhou — resposta nao e JSON"); sys.exit(1)
if "tokens" not in d:
    print("✗ login falhou:", d.get("message") or d); sys.exit(1)

u, t = d["user"], d["tokens"]
print("✓ sessao de", u["email"])
print()
print("Cole no console do app do CLIENTE — http://localhost:8081")
print("(8082 e o app do PARCEIRO; 8080 e o backend, sem tela)")
print()
print("(() => {")
print("  localStorage.setItem(" + json.dumps("vupth_access_token") + ", " + json.dumps(t["access_token"]) + ");")
print("  localStorage.setItem(" + json.dumps("vupth_refresh_token") + ", " + json.dumps(t["refresh_token"]) + ");")
print("  localStorage.setItem(" + json.dumps("vupth_user") + ", " + json.dumps(json.dumps(u)) + ");")
print("  localStorage.setItem(" + json.dumps("vupth_onboarding_seen") + ", " + json.dumps("1") + ");")
print("  location.reload();")
print("})()")
'
)

echo "$SAIDA"

# macOS: manda o JS direto pro clipboard, pra nao ter de selecionar na tela.
if command -v pbcopy > /dev/null 2>&1; then
  echo "$SAIDA" | sed -n '/^(() => {/,/^})()/p' | pbcopy
  echo
  echo "📋 Ja esta na sua area de transferencia."
  echo "   Abra http://localhost:8081, aperte Cmd+Option+J e cole (Cmd+V)."
fi
