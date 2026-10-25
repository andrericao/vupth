#!/bin/bash
# A bateria do Client com UM comando (Andre, 03/10 — commit-sem-flag):
#
#   bash .maestro/bateria.sh              # pergunta: completa ou so as que nao passaram
#   bash .maestro/bateria.sh --completa   # roda todas, sem perguntar
#   bash .maestro/bateria.sh --falhas     # so as que nao passaram, sem perguntar
#   bash .maestro/bateria.sh --completa --publicar-ota  # publica o OTA da dev antes (publicar-ota.sh)
#   bash .maestro/bateria.sh --falhas --device emulator-5554  # num aparelho
#                                         escolhido (DEC-33, comandos.html#emulador)
#
# Prepara o celular (setup.sh), acha sozinha o commit esperado (o ultimo da
# branch da pasta no GitHub — a dev e o OTA do canal preview), roda o roteiro e devolve o
# autofill e o corretor (restaurar.sh), mesmo se a rodada falhar.
#
# Ao fim, o relatorio etapa a etapa (✅/❌/⏭), na tela e em relatorio.txt.
# Os logs e prints de cada rodada caem em .maestro/logs/<data>, versionada
# (DEC-29): ao fim, a bateria commita SO a pasta .maestro/logs/ e da push, e a
# equipe le o erro no GitHub, no PC ou na nuvem. Rodada
# verde nao guarda nada; rodada vermelha apaga as antigas e fica so a dela —
# a mesma regra do Partner (limpar-logs, 05/10).

DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$(dirname "$DIR")"
export PATH="$PATH:$HOME/Android/Sdk/platform-tools:$HOME/.maestro/bin"
APP_ID="com.vupth.client.preview"
API="https://vupth-backend-ia.onrender.com"

# Uma bateria por vez (DEC-17). A trava unica da DEC-33 (flock -n /tmp/vupth-maestro.lock) mora aqui dentro:
# a bateria se reabre sob o flock e segura a trava ate o restaurar.sh. So o
# pgrep deixou o Client comecar (11/10 00:41) com o Partner ainda no setup.sh,
# antes do java dele subir.
if [ -z "$VUPTH_TRAVA" ]; then
  VUPTH_TRAVA=1 flock -n -E 75 /tmp/vupth-maestro.lock bash "$0" "$@"
  SAIDA=$?
  [ "$SAIDA" = 75 ] && echo "ERRO: outra bateria segura /tmp/vupth-maestro.lock — espere ela terminar"
  exit "$SAIDA"
fi

# Os argumentos: o modo (--completa/--falhas) e o aparelho (--device <serial>).
# Antes so o $1 era lido, e o "--device emulator-5554" virava o modo (10/10).
MODO=""
APARELHO=""
PUBLICAR_OTA=""
while [ $# -gt 0 ]; do
  case "$1" in
    --completa|--falhas) MODO="$1" ;;
    --publicar-ota) PUBLICAR_OTA="--publicar-ota" ;;
    --device) APARELHO="$2"; shift ;;
  esac
  shift
done
# emulador (DEC-33): com o celular e o emulador no adb, --device escolhe um. O
# ANDROID_SERIAL vale para todo adb daqui, do setup.sh e do restaurar.sh; o
# Maestro recebe o mesmo.
MAESTRO_APARELHO=()
# LENTO (Andre, 11/10: "o emulador e mais lento mesmo, entao compense"):
# multiplica o timeout de todo extendedWaitUntil dos fluxos — 2 no emulador.
LENTO=1
case "$APARELHO" in emulator-*) LENTO=2 ;; esac
if [ -n "$APARELHO" ]; then
  export ANDROID_SERIAL="$APARELHO"
  MAESTRO_APARELHO=(--device "$APARELHO")
fi

# Uma bateria por vez no aparelho (DEC-17): duas sessoes do Maestro no mesmo
# celular brigam pelo driver. Client e Partner usam o mesmo celular.
OUTRA=$(pgrep -af "^java .*maestro.cli.AppKt test")
if [ -n "$OUTRA" ]; then
  echo "ERRO: ja ha uma bateria do Maestro rodando neste computador — espere ela terminar:"
  echo "$OUTRA" | cut -c1-160
  exit 1
fi

BATERIA=1 bash "$DIR/setup.sh" $PUBLICAR_OTA || exit 1
trap 'bash "$DIR/restaurar.sh"' EXIT

# A branch da pasta: a dev no vupth, a feat/nativewind na worktree dela.
BRANCH=$(git -C "$REPO" branch --show-current)
BRANCH_PASTA="$BRANCH"  # para onde vao os logs (DEC-28)
# Na cloud (DEC-26) nao ha OTA: o celular roda o da dev, depois do merge
# cloud->dev do Andre — o commit na linha da versao e o do merge.
[ "$BRANCH" = "cloud" ] && BRANCH=dev
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
     # Cada etapa tem a conta dela (TAG + numero da etapa); entre na conta
     # quando a etapa comecar (depois do passo NN.P3).
     echo "   👤 etapa 08: entre em prop_c${TAG}08@teste.com e, quando aparecer \"08.0A\", feche a fila (ate 5 min)"
     echo "   👤 etapa 10: entre em prop_c${TAG}10@teste.com e, quando aparecer \"10.0A\", aceite o pedido (ate 5 min)"
     echo "   👤 etapa 11: entre em prop_c${TAG}11@teste.com e, quando aparecer \"10.0A\", aceite o pedido (ate 5 min)" ;;
esac
echo ""

LOGS="$DIR/logs"
RODADA="$LOGS/$(date +%Y-%m-%d_%H%M%S)"
mkdir -p "$RODADA"
echo "Logs desta rodada: ${RODADA#$REPO/}"
echo ""

# bateria-nao-para (modelo do Partner): cada etapa de avulsas/ roda num
# `maestro test` proprio e prepara o estado dela pela API. Se uma falha, ela
# fica registrada e a proxima roda. So a 00 (a versao) para tudo: com o
# commit errado no aparelho, nenhuma etapa diz nada.
#
# Uma etapa so: ETAPAS="05 06" bash .maestro/bateria.sh
ETAPAS=${ETAPAS:-"01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21a 21b 22 23 24 25 26 27"}

# bateria-conjunta: as etapas que abrem o Partner no mesmo celular. Precisam do
# APK do Partner instalado e do vupth-partner clonado ao lado do vupth (os
# subfluxos sao lidos de la). Sem um dos dois, elas ficam como ⏭.
CONJUNTAS="18 19 21b 22"

# A 13 (push da vez) depende do push do sistema; no emulador o app nao oferece
# a tela 10 nem pede token (Device.isDevice, bateria 11/10 06:06, 13.A7). Fica
# como ⏭ no emulador e roda no celular. A 24 (a tela do push) tambem: a tela 10
# so vem no aparelho (bateria 11/10 23:57, 24.04).
# A 21 (atraso) derruba o emulador na 21.0B, logo que o Client deveria mostrar
# o aviso do 1o atraso (6 vezes em 11/10; nunca passou dali). Suspeita do app:
# vai ao celular do Andre, com o logcat (orquestrador, 11/10 15h30).
# etapas-curtas (15/10): a 21 virou 21a (abrir a fila pelo card, curta, roda no
# emulador) e 21b (a espera com o Client fechado, o Partner e o aviso) — so a
# 21b fica no celular.
SO_NO_CELULAR="13 21b 24"
PARTNER_OK=1
[ -d "$(dirname "$REPO")/vupth-partner/.maestro/conjunta" ] || PARTNER_OK=0
adb shell pm list packages 2>/dev/null | grep -q "com.vupth.partner.preview" || PARTNER_OK=0

# bateria-pula-aprovados (Andre, 05/10): a etapa verde grava a marca com o
# commit em aprovados.txt (no .gitignore); a proxima rodada no MESMO commit a
# pula. --completa roda tudo e recomeca as marcas.
#
# A pergunta (Andre, 09/10 noite: "quero que o script pergunte se e para rodar
# o teste completo ou apenas os que nao passaram"). "So as que nao passaram"
# pula toda etapa ja verde em aprovados.txt, de qualquer commit; sem resposta
# em 1 min, segue assim.
APROVADOS="$DIR/aprovados.txt"
if [ "$MODO" != "--completa" ] && [ "$MODO" != "--falhas" ]; then
  read -r -t 60 -p "Rodar a bateria completa ou só as que não passaram? (c = completa / F = só as falhas) " RESP
  echo ""
  if [ "$RESP" = "c" ] || [ "$RESP" = "C" ]; then MODO="--completa"; else MODO="--falhas"; fi
fi
if [ "$MODO" = "--completa" ]; then
  rm -f "$APROVADOS"
  echo "Completa: todas as etapas rodam."
else
  echo "Só as que não passaram: as etapas já verdes em aprovados.txt ficam como ⏭."
fi
touch "$APROVADOS"
aprovada() { grep -q "^$1 " "$APROVADOS"; }
aprovar() { grep -vE "^$1 " "$APROVADOS" > "$APROVADOS.tmp"; echo "$1 $COMMIT" >> "$APROVADOS.tmp"; mv "$APROVADOS.tmp" "$APROVADOS"; }

# Os prints "para o Andre" (apoio/para_o_andre.yaml) e a linha do que olhar.
PARA_O_ANDRE="$RODADA/para-o-andre"
juntar_para_o_andre() {
  local pasta="$1" achados
  achados=$(find "$pasta" "$PWD" -maxdepth 2 -name 'para-o-andre_*.png' 2>/dev/null)
  grep -q 'PARA-O-ANDRE:' "$pasta/console.txt" 2>/dev/null || [ -n "$achados" ] || return 0
  mkdir -p "$PARA_O_ANDRE"
  grep -oP 'PARA-O-ANDRE: \K.*' "$pasta/console.txt" >> "$PARA_O_ANDRE/para-o-andre.txt" 2>/dev/null
  [ -n "$achados" ] && echo "$achados" | while IFS= read -r f; do mv "$f" "$PARA_O_ANDRE/"; done
  return 0
}

# O passo NN.MM que falhou: o ULTIMO "NN.MM · ..." que comecou e nao terminou
# no maestro.log da etapa (o mais de dentro).
passos() { grep -oP 'runCommands\$lambda\$\d+: \K\d\d\.[\dA-Z]{2} · .*(?= ('"$2"')$)' "$1/maestro.log" 2>/dev/null; }
falhou_em() { passos "$1" RUNNING | grep -vxFf <(passos "$1" 'COMPLETED|SKIPPED') | tail -1; }

# Roda uma etapa na pasta dela; devolve o status do maestro.
rodar() {
  local nome="$1" pasta="$RODADA/$1"
  mkdir -p "$pasta"
  echo "=== $nome ==="
  # O logcat (avisos e erros) da etapa: a 21 derruba o aparelho na 21.0B e o
  # Maestro nao tem print desse instante (11/10, 5 vezes). Fica so na etapa que
  # falha (a verde apaga a pasta), cortado nas ultimas 3000 linhas.
  adb logcat -c 2>/dev/null
  adb logcat -v time '*:W' > "$pasta/logcat.txt" 2>/dev/null &
  local logcat=$!
  maestro "${MAESTRO_APARELHO[@]}" test \
    -e APP_ID="$APP_ID" -e API="$API" -e SENHA=Teste@123 -e COMMIT="$COMMIT" \
    -e TAG="$TAG" -e SUPERVISAO="$SUPERVISAO" -e LENTO="$LENTO" \
    --debug-output "$pasta" --flatten-debug-output \
    --test-output-dir "$pasta" \
    "$DIR/avulsas/$nome.yaml" 2>&1 | tee "$pasta/console.txt"
  local volta="${PIPESTATUS[0]}"
  kill "$logcat" 2>/dev/null
  tail -n 3000 "$pasta/logcat.txt" > "$pasta/logcat.tmp" 2>/dev/null && mv "$pasta/logcat.tmp" "$pasta/logcat.txt"
  return "$volta"
}

# O print da falha com o nome do passo (DEC-16), na pasta da rodada.
print_da_falha() {
  local pasta="$1" passo="$2" print nome
  print=$(ls -t "$pasta"/screenshot-❌-*.png 2>/dev/null | head -1)
  [ -n "$print" ] || return 0
  nome=$(printf '%s' "${passo:-00.00 · antes do primeiro passo}" | iconv -f utf-8 -t ascii//TRANSLIT 2>/dev/null |
    tr '[:upper:]' '[:lower:]' | sed -E 's/^([0-9]{2}\.[0-9a-z]{2})[^a-z0-9]*/\1_/; s/[^a-z0-9._]+/-/g; s/-+$//')
  cp "$print" "$RODADA/FALHA_${nome}.png"
  echo "   print: ${RODADA#$REPO/}/FALHA_${nome}.png"
}

# A loja de cada etapa abre das 00:00 as 23:59 (loja_aberta.js): montada antes
# da meia-noite e conferida depois, ela vira o dia e a etapa cai sem bug nenhum
# (bateria de 09/10 23:42: a 04 montou a loja e parou em 04.02 as 00:00:43).
# Etapa que comecaria a partir das 23:50 espera ate 00:02.
longe_da_meia_noite() {
  local agora=$((10#$(date +%H) * 60 + 10#$(date +%M)))
  [ "$agora" -ge $((23 * 60 + 50)) ] || [ "$agora" -lt 2 ] || return 0
  local espera=$(( ($(date -d 'tomorrow 00:02' +%s) - $(date +%s)) ))
  [ "$agora" -lt 2 ] && espera=$(( $(date -d 'today 00:02' +%s) - $(date +%s) ))
  echo "   meia-noite perto: espera ${espera}s antes da etapa"
  sleep "$espera"
}

STATUS=0
: > "$RODADA/relatorio.txt"
if ! rodar 00_atualizacao; then
  PASSO=$(falhou_em "$RODADA/00_atualizacao")
  echo "❌ 00 · versão — ${PASSO:-antes do primeiro passo}" | tee -a "$RODADA/relatorio.txt"
  print_da_falha "$RODADA/00_atualizacao" "$PASSO"
  echo "A versão no aparelho não é a $COMMIT: nenhuma etapa rodou."
  STATUS=1
else
  echo "✅ 00 · versão" >> "$RODADA/relatorio.txt"
  for n in $ETAPAS; do
    arquivo=$(basename "$(ls "$DIR"/avulsas/"$n"_*.yaml 2>/dev/null | head -1)" .yaml)
    if [ -z "$arquivo" ]; then
      echo "⏭  $n (não existe em avulsas/)" >> "$RODADA/relatorio.txt"
      continue
    fi
    if [ "$PARTNER_OK" = 0 ] && echo " $CONJUNTAS " | grep -q " $n "; then
      echo "⏭  $arquivo (conjunta: falta o APK do Partner ou o clone ../vupth-partner)" >> "$RODADA/relatorio.txt"
      continue
    fi
    if [ "$LENTO" = 2 ] && echo " $SO_NO_CELULAR " | grep -q " $n "; then
      case "$n" in
        13|24) por="o app não oferece push no emulador — Device.isDevice" ;;
        *)  por="o emulador cai nela; o André roda no celular" ;;
      esac
      echo "⏭  $arquivo (só no celular: $por)" >> "$RODADA/relatorio.txt"
      continue
    fi
    if aprovada "$n"; then
      echo "⏭  $arquivo (já passou no $(grep "^$n " "$APROVADOS" | cut -d' ' -f2) — a completa roda de novo)" >> "$RODADA/relatorio.txt"
      continue
    fi
    longe_da_meia_noite
    # etapas-curtas (15/10): a duracao vai ao relatorio; a etapa que passa de
    # ~5 min e a candidata a virar partes (a verde apaga a pasta e o maestro.log).
    INICIO=$(date +%s)
    rodar "$arquivo"
    VOLTA=$?
    # O emulador some do adb por instantes ("device offline", 21 nas baterias de
    # 11/10 06:06, 07:02 e 09:58, cada vez num passo): nao e o fluxo. Espera o
    # aparelho voltar e roda a etapa de novo, uma vez.
    # Bateria 23/10 23:31 (02.P7): o driver do Maestro (dev.mobile.maestro, a instrumentacao)
    # crashou no emulador AOSP com o app subindo normal; so aparece no logcat da etapa.
    if [ "$VOLTA" -ne 0 ] && { grep -qE "device offline|UiAutomation not connected" "$RODADA/$arquivo/console.txt" 2>/dev/null \
        || grep -q "Crash of app dev.mobile.maestro" "$RODADA/$arquivo/logcat.txt" 2>/dev/null; }; then
      echo "↻ $arquivo: o aparelho saiu do adb ou o driver caiu — de novo, uma vez"
      timeout 120 adb wait-for-device
      sleep 10
      mv "$RODADA/$arquivo" "$RODADA/${arquivo}_1a_tentativa"   # guarda o logcat da queda
      # TAG novo: as contas da 1a tentativa ja existem (409 no 21.P0, 11/10 11:02).
      TAG_DA_RODADA=$TAG
      TAG=$(date +%s | tail -c 7)
      rodar "$arquivo"
      VOLTA=$?
      TAG=$TAG_DA_RODADA
    fi
    juntar_para_o_andre "$RODADA/$arquivo"
    DURA=$(( $(date +%s) - INICIO )); DURA="$((DURA / 60))min$(printf '%02d' $((DURA % 60)))s"
    if [ "$VOLTA" -eq 0 ] && grep -q 'PULADO-CAMPANHA:' "$RODADA/$arquivo/console.txt" 2>/dev/null; then
      # maestro-campanha-cupom-e-link: sem a campanha no ar a etapa pula (nao e falha nem aprovacao).
      echo "⏭  $arquivo ($(grep -oP 'PULADO-CAMPANHA: \K.*' "$RODADA/$arquivo/console.txt" | head -1))" >> "$RODADA/relatorio.txt"
      rm -rf "${RODADA:?}/$arquivo"
    elif [ "$VOLTA" -eq 0 ]; then
      echo "✅ $arquivo ($DURA)" >> "$RODADA/relatorio.txt"
      aprovar "$n"
      rm -rf "${RODADA:?}/$arquivo"   # verde: a pasta da etapa nao guarda nada
    else
      STATUS=1
      PASSO=$(falhou_em "$RODADA/$arquivo")
      echo "❌ $arquivo — parou em ${PASSO:-antes do primeiro passo} ($DURA)" >> "$RODADA/relatorio.txt"
      echo "${PASSO:-}" > "$RODADA/$arquivo/falhou_em"
      print_da_falha "$RODADA/$arquivo" "$PASSO"
    fi
  done
fi

echo ""
echo "=== Relatorio da rodada ==="
cat "$RODADA/relatorio.txt"

# Rodadas antigas (limpar-logs, a regra do Partner): ja foram lidas — a
# rodada desta vez e o estado atual. Verde ou vermelha, so ela pode ficar.
for antiga in "$LOGS"/*/; do
  antiga="${antiga%/}"
  [ "$antiga" = "$RODADA" ] || rm -rf "$antiga"
done

echo ""
if [ -d "$PARA_O_ANDRE" ]; then
  echo "👀 Para o Andre olhar: ${PARA_O_ANDRE#$REPO/} (o que olhar em para-o-andre.txt)"
fi
if [ "$STATUS" -eq 0 ] && [ ! -d "$PARA_O_ANDRE" ]; then
  rm -rf "$RODADA"
  echo "Bateria verde — nenhum log guardado."
elif [ "$STATUS" -eq 0 ]; then
  echo "Bateria verde — fica só a pasta para-o-andre."
else
  echo "Logs e prints em: ${RODADA#$REPO/}"
fi

# DEC-28/29: os logs vao para o GitHub. Commit so de .maestro/logs/ (o pathspec
# deixa de fora o que mais estiver mudado na pasta). O push so sai se o que sobe
# for so os logs — codigo sem push espera o push do Andre.
cd "$REPO" || exit "$STATUS"
git add -A .maestro/logs/
if ! git diff --cached --quiet -- .maestro/logs/; then
  git commit -q -m "chore(logs): bateria Maestro $(basename "$RODADA") — $([ "$STATUS" -eq 0 ] && echo verde || echo FALHA)" -- .maestro/logs/
  git pull -q --rebase --autostash origin "$BRANCH_PASTA" 2>/dev/null
  if git diff --name-only "origin/$BRANCH_PASTA"..HEAD | grep -qv '^.maestro/logs/'; then
    echo "📝 Logs commitados; sobem no proximo push (ha codigo sem push na $BRANCH_PASTA)."
  elif git push -q origin "HEAD:$BRANCH_PASTA"; then
    echo "📤 Logs no GitHub (origin/$BRANCH_PASTA)."
  else
    echo "⚠️  Push dos logs falhou — sobem no proximo push."
  fi
fi
exit "$STATUS"
