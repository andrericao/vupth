#!/usr/bin/env bash
# Sessao de QA visual, SEM digitar senha em formulario.
#
# Cria (ou reusa) a conta de teste, faz login pela API e imprime um trecho de
# JavaScript pra colar no console do app web. Os apps leem a sessao do
# armazenamento do navegador, entao plantar as chaves ali equivale a ter logado.
#
#   ./qa-session.sh                    # cliente, backend local
#   ./qa-session.sh parceiro           # parceiro (cria profissional + vincula)
#   ./qa-session.sh cliente dev        # cliente, contra o Render
#
# ⚠️ O ambiente padrao e `local` DE PROPOSITO: `prod` e o Railway, producao.
#
# POR QUE ISTO EXISTE: o `TEST_ACCOUNTS.md` documentava contas de um seed de
# junho que nao existe mais em backend nenhum (conferido em 2026-08-26), e as
# telas atras de login nunca tinham sido conferidas visualmente.

set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

APP="${1:-cliente}"
ENV="${2:-local}"

case "$ENV" in
  local) URL="http://localhost:8080" ;;
  dev)   URL="https://vupth-backend-ia.onrender.com" ;;
  prod)  URL="https://vupth-backend-ia-production.up.railway.app"
         echo "⚠️  PROD e o Railway — voce vai gravar em PRODUCAO. Ctrl-C pra abortar."
         sleep 4 ;;
  *) echo "ambiente invalido: $ENV (use local|dev|prod)"; exit 1 ;;
esac

case "$APP" in
  cliente)  EMAIL="qa.visual@vupth.dev"; PORTA=8081 ;;
  parceiro) EMAIL="qa.prof@vupth.dev";   PORTA=8082 ;;
  *) echo "app invalido: $APP (use cliente|parceiro)"; exit 1 ;;
esac
SENHA="Teste@123"

echo "→ $APP em $ENV ($URL)"

api() { curl -s -m 90 "$@"; }

# Registro e idempotente na pratica: se ja existir, o login abaixo resolve.
api -X POST "$URL/auth/register" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$SENHA\"}" > /dev/null 2>&1 || true

RESP=$(api -X POST "$URL/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$SENHA\"}")

TOKEN=$(echo "$RESP" | python3 -c 'import json,sys
try: print(json.load(sys.stdin)["tokens"]["access_token"])
except Exception: pass')

if [ -z "$TOKEN" ]; then
  echo "✗ login falhou:"; echo "$RESP" | head -c 300; echo; exit 1
fi

# O parceiro precisa de PERFIL PROFISSIONAL e de VINCULO — sem os dois a tela
# da Fila nao tem o que mostrar.
if [ "$APP" = "parceiro" ]; then
  api -X POST "$URL/professional/register" -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"name":"QA Visual","specialty":"BARBER"}' > /dev/null 2>&1 || true

  LOJA=$(api "$URL/establishment" | python3 -c 'import json,sys
d=json.load(sys.stdin); l = d if isinstance(d,list) else d.get("content",[])
abertas=[e for e in l if e.get("is_open")]
print((abertas or l)[0]["id"] if l else "")')

  if [ -n "$LOJA" ]; then
    api -X POST "$URL/professional/affiliate" -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" -d "{\"establishmentId\":\"$LOJA\"}" > /dev/null 2>&1 || true
  fi

  # Relogar: o papel PROFESSIONAL so entra no JWT no token seguinte.
  RESP=$(api -X POST "$URL/auth/login" -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$SENHA\"}")
fi

SAIDA=$(APP="$APP" PORTA="$PORTA" python3 -c '
import json, os, sys
d = json.load(sys.stdin)
u, t = d["user"], d["tokens"]
app, porta = os.environ["APP"], os.environ["PORTA"]

# ⚠️ Armazenamento DIFERENTE por app: o parceiro tem um shim de
# expo-secure-store que usa sessionStorage (mitigacao do D8); o cliente usa
# localStorage. Plantar no lugar errado nao loga e nao da erro.
store = "sessionStorage" if app == "parceiro" else "localStorage"
J = json.dumps

print("\u2713 sessao de " + u["email"])
print()
print("Cole no console do app do " + app.upper() + " \u2014 http://localhost:" + porta)
print()
print("(() => {")
print("  " + store + ".setItem(" + J("vupth_access_token") + ", " + J(t["access_token"]) + ");")
print("  " + store + ".setItem(" + J("vupth_refresh_token") + ", " + J(t["refresh_token"]) + ");")
if app == "cliente":
    print("  localStorage.setItem(" + J("vupth_user") + ", " + J(json.dumps(u)) + ");")
    print("  localStorage.setItem(" + J("vupth_onboarding_seen") + ", " + J("1") + ");")
print("  location.reload();")
print("})()")
' <<< "$RESP")

echo "$SAIDA"

if command -v pbcopy > /dev/null 2>&1; then
  echo "$SAIDA" | sed -n '/^(() => {/,/^})()/p' | pbcopy
  echo
  echo "📋 Ja esta na sua area de transferencia."
  echo "   Abra http://localhost:$PORTA, aperte Cmd+Option+J e cole (Cmd+V)."
fi
