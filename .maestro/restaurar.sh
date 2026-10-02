#!/bin/bash
# Devolve ao celular o que o setup.sh desligou para a bateria do Maestro:
# o preenchimento automatico (Google) e o corretor do teclado.
# Igual ao restaurar.sh do vupth-partner.
export PATH="$PATH:$HOME/Android/Sdk/platform-tools"
ARQ="$(dirname "$0")/.autofill_antes"
if [ -f "$ARQ" ]; then
  adb shell settings put secure autofill_service "$(cat "$ARQ")"
  rm -f "$ARQ"
  echo "Preenchimento automatico restaurado."
else
  echo "Nada guardado do preenchimento automatico — ligue em Configuracoes > Senhas, se quiser."
fi
adb shell settings put secure spell_checker_enabled 1
echo "Corretor religado."
