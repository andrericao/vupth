#!/bin/bash
# A bateria do Client com UM comando (Andre, 03/10 — commit-sem-flag):
#
#   bash .maestro/bateria.sh
#
# Prepara o celular (setup.sh), acha sozinha o commit esperado (o ultimo da
# branch da pasta no GitHub — a dev e o OTA do canal preview), roda o roteiro e devolve o
# autofill e o corretor (restaurar.sh), mesmo se a rodada falhar.
#
# Os logs e prints de cada rodada caem em .maestro/logs/<data> (no .gitignore,
# logs-da-bateria-na-pasta): a equipe le o erro sem o Andre colar. Rodada
# verde nao guarda nada; a falha fica ate uma rodada seguinte passar do passo
# que falhou — ai os logs dela sao apagados sozinhos.

DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$(dirname "$DIR")"
export PATH="$PATH:$HOME/Android/Sdk/platform-tools:$HOME/.maestro/bin"
APP_ID="com.vupth.client.preview"
API="https://vupth-backend-ia.onrender.com"

BATERIA=1 bash "$DIR/setup.sh" || exit 1
trap 'bash "$DIR/restaurar.sh"' EXIT

# A branch da pasta: a dev no vupth, a feat/nativewind na worktree dela.
BRANCH=$(git -C "$REPO" branch --show-current)
git -C "$REPO" fetch -q origin "$BRANCH" 2>/dev/null
COMMIT=$(git -C "$REPO" rev-parse --short=8 "origin/$BRANCH")
echo "Commit esperado no app: $COMMIT (origin/$BRANCH)"

LOGS="$DIR/logs"
RODADA="$LOGS/$(date +%Y-%m-%d_%H%M%S)"
mkdir -p "$RODADA"
echo "Logs desta rodada: ${RODADA#$REPO/}"
echo ""

maestro test \
  -e APP_ID="$APP_ID" -e API="$API" -e SENHA=Teste@123 -e COMMIT="$COMMIT" \
  --debug-output "$RODADA" --flatten-debug-output \
  --test-output-dir "$RODADA" \
  "$DIR/bateria_completa.yaml" 2>&1 | tee "$RODADA/console.txt"
STATUS=${PIPESTATUS[0]}

# O maestro.log tem uma linha "<label> RUNNING" quando o passo comeca e
# "<label> COMPLETED" (ou SKIPPED) quando termina; a falha nao tem linha. O
# passo que falhou e o ULTIMO "NN.MM · ..." que comecou e nao terminou — o mais
# de dentro (a etapa que o chamou tambem nao terminou, mas comecou antes).
LOG="$RODADA/maestro.log"
passos() { grep -oP 'runCommands\$lambda\$\d+: \K\d\d\.\d\d · .*(?= ('"$1"')$)' "$LOG" 2>/dev/null; }

FALHOU=""
if [ "$STATUS" -ne 0 ]; then
  FALHOU=$(passos RUNNING | grep -vxFf <(passos 'COMPLETED|SKIPPED') | tail -1)
fi

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
  echo "Logs e prints em: ${RODADA#$REPO/}"
fi
exit "$STATUS"
