#!/bin/bash
# A bateria do Client com UM comando (Andre, 03/10 — commit-sem-flag):
#
#   bash .maestro/bateria.sh
#
# Prepara o celular (setup.sh), acha sozinha o commit esperado (o ultimo da
# branch da pasta no GitHub — a dev e o OTA do canal preview), roda o roteiro e devolve o
# autofill e o corretor (restaurar.sh), mesmo se a rodada falhar.
#
# Ao fim, o relatorio etapa a etapa (✅/❌/⏭), na tela e em relatorio.txt.
# Os logs e prints de cada rodada caem em .maestro/logs/<data> (no .gitignore,
# logs-da-bateria-na-pasta): a equipe le o erro sem o Andre colar. Rodada
# verde nao guarda nada; a falha fica ate uma rodada seguinte passar do passo
# que falhou — ai os logs dela sao apagados sozinhos.

DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$(dirname "$DIR")"
export PATH="$PATH:$HOME/Android/Sdk/platform-tools:$HOME/.maestro/bin"
APP_ID="com.vupth.client.preview"
API="https://vupth-backend-ia.onrender.com"

# Uma bateria por vez no aparelho (DEC-17): duas sessoes do Maestro no mesmo
# celular brigam pelo driver. Client e Partner usam o mesmo celular.
OUTRA=$(pgrep -af "^java .*maestro.cli.AppKt test")
if [ -n "$OUTRA" ]; then
  echo "ERRO: ja ha uma bateria do Maestro rodando neste computador — espere ela terminar:"
  echo "$OUTRA" | cut -c1-160
  exit 1
fi

BATERIA=1 bash "$DIR/setup.sh" || exit 1
trap 'bash "$DIR/restaurar.sh"' EXIT

# A branch da pasta: a dev no vupth, a feat/nativewind na worktree dela.
BRANCH=$(git -C "$REPO" branch --show-current)
git -C "$REPO" fetch -q origin "$BRANCH" 2>/dev/null
COMMIT=$(git -C "$REPO" rev-parse --short=8 "origin/$BRANCH")
echo "Commit esperado no app: $COMMIT (origin/$BRANCH)"

# Supervisao (bateria-supervisionada, DEC-15) — o mesmo formato do Partner.
# Sem resposta em 1 min, segue sem supervisao.
#   0 = sozinha: o papel do profissional e feito pela API.
#   1 = um tipo de usuario: o Andre so acompanha.
#   2 = os dois: o Andre e o profissional, no Partner do segundo celular —
#       fecha a fila (etapa 08) e aceita o pedido de corte (etapa 10); a
#       bateria espera ate 5 min por cada acao.
SUPERVISAO=0
read -r -t 60 -p "Teste com supervisao? (s/N) " RESP
if [ "$RESP" = "s" ] || [ "$RESP" = "S" ]; then
  SUPERVISAO=1
  read -r -t 60 -p "Um tipo de usuario ou os dois? (1/2) " RESP
  [ "$RESP" = "2" ] && SUPERVISAO=2
fi
echo ""
# Os 6 ultimos digitos do relogio em segundos: contas novas a cada rodada.
TAG=$(date +%s | tail -c 7)
case "$SUPERVISAO" in
  0) echo "Sem supervisao." ;;
  1) echo "Supervisionada, so o Client." ;;
  2) echo "Supervisionada, Client e Partner. No segundo celular, o Partner (senha Teste@123):"
     echo "   👤 conta do profissional: prop_c${TAG}@teste.com — Prof${TAG}, na Loja C${TAG}"
     echo "      (a bateria cria a conta no comeco; entre depois do passo 00.04)"
     echo "   👤 quando aparecer \"08.0A\": feche a fila do Prof${TAG} (ate 5 min)"
     echo "   👤 quando aparecer \"10.0A\": aceite o pedido de corte do Cliente${TAG} (ate 5 min)" ;;
esac
echo ""

LOGS="$DIR/logs"
RODADA="$LOGS/$(date +%Y-%m-%d_%H%M%S)"
mkdir -p "$RODADA"
echo "Logs desta rodada: ${RODADA#$REPO/}"
echo ""

maestro test \
  -e APP_ID="$APP_ID" -e API="$API" -e SENHA=Teste@123 -e COMMIT="$COMMIT" \
  -e TAG="$TAG" -e SUPERVISAO="$SUPERVISAO" \
  --debug-output "$RODADA" --flatten-debug-output \
  --test-output-dir "$RODADA" \
  "$DIR/bateria_completa.yaml" 2>&1 | tee "$RODADA/console.txt"
STATUS=${PIPESTATUS[0]}

# O maestro.log tem uma linha "<label> RUNNING" quando o passo comeca e
# "<label> COMPLETED" (ou SKIPPED) quando termina; a falha nao tem linha. O
# passo que falhou e o ULTIMO "NN.MM · ..." que comecou e nao terminou — o mais
# de dentro (a etapa que o chamou tambem nao terminou, mas comecou antes).
LOG="$RODADA/maestro.log"
passos() { grep -oP 'runCommands\$lambda\$\d+: \K\d\d\.[\dA-Z]{2} · .*(?= ('"$1"')$)' "$LOG" 2>/dev/null; }

FALHOU=""
if [ "$STATUS" -ne 0 ]; then
  FALHOU=$(passos RUNNING | grep -vxFf <(passos 'COMPLETED|SKIPPED') | tail -1)
fi

# Relatorio etapa a etapa (bateria-nao-para, 03/10): cada "00.NN · ..." do
# roteiro com ✅ (terminou), ❌ (comecou e nao terminou) ou ⏭ (nao rodou) —
# mesmo parando numa altura, da para saber o que passou.
relatorio() {
  grep -oP 'label: "\K00\.\d\d · [^"]*' "$DIR/bateria_completa.yaml" | while IFS= read -r etapa; do
    if passos 'COMPLETED|SKIPPED' | grep -qxF "$etapa"; then echo "✅ $etapa"
    elif passos RUNNING | grep -qxF "$etapa"; then echo "❌ $etapa"
    else echo "⏭  $etapa (nao rodou)"; fi
  done
}
echo ""
echo "=== Relatorio da rodada ==="
relatorio | tee "$RODADA/relatorio.txt"

# Rodadas antigas: sai a que falhou num passo que esta rodada passou (ou toda
# falha, se esta passou inteira) e a que ficou sem marca (interrompida).
for antiga in "$LOGS"/*/; do
  antiga="${antiga%/}"
  [ "$antiga" = "$RODADA" ] && continue
  if [ "$STATUS" -eq 0 ] || [ ! -f "$antiga/falhou_em" ] ||
     passos COMPLETED | grep -qxF "$(cat "$antiga/falhou_em")"; then
    rm -rf "$antiga"
  fi
done

echo ""
if [ "$STATUS" -eq 0 ]; then
  rm -rf "$RODADA"
  echo "Bateria verde — nenhum log guardado."
else
  echo "${FALHOU:-sem passo NN.MM (falhou antes da 00.01)}" > "$RODADA/falhou_em"
  echo "Bateria parou em: ${FALHOU:-antes da 00.01}"
  # print-da-falha (DEC-16): o print da falha com o nome do passo, para o Andre
  # mandar e a equipe achar o log — ex.: FALHA_05.05_espera-o-aviso-da-politica-da-multa.png
  PRINT=$(ls -t "$RODADA"/screenshot-❌-*.png 2>/dev/null | head -1)
  if [ -n "$PRINT" ]; then
    NOME=$(printf '%s' "${FALHOU:-00.00 · antes da 00.01}" | iconv -f utf-8 -t ascii//TRANSLIT 2>/dev/null |
      tr '[:upper:]' '[:lower:]' | sed -E 's/^([0-9]{2}\.[0-9a-z]{2})[^a-z0-9]*/\1_/; s/[^a-z0-9._]+/-/g; s/-+$//')
    cp "$PRINT" "$RODADA/FALHA_${NOME}.png"
    echo "Print da falha: ${RODADA#$REPO/}/FALHA_${NOME}.png"
  fi
  echo "Logs e prints em: ${RODADA#$REPO/}"
fi
exit "$STATUS"
