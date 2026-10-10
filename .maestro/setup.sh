#!/bin/bash
# Prepara a bateria do Maestro do CLIENT (roteiro: .maestro/bateria_completa.yaml).
# Espelha o setup.sh do vupth-partner.
#
# Uso:  bash .maestro/bateria.sh (chama este setup, roda e restaura). Sozinho,
#       bash .maestro/setup.sh so prepara o celular.
#
# Precisa de: celular com "Depuracao USB" ligada, conectado no cabo, com o APK
# de PREVIEW instalado (com.vupth.client.preview — aponta para o staging).
# O Maestro ja esta em ~/.maestro/bin.

export PATH="$PATH:$HOME/Android/Sdk/platform-tools:$HOME/.maestro/bin"
API="https://vupth-backend-ia.onrender.com"
APP_ID="com.vupth.client.preview"

echo "=== VUPTH Client — bateria Maestro (staging) ==="

# 1. Celular conectado
# Com --device na bateria (DEC-33), o ANDROID_SERIAL diz qual aparelho.
DEVICE=$(adb devices | grep -w "device" | grep "^${ANDROID_SERIAL:-}" | head -1)
if [ -z "$DEVICE" ]; then
  echo "ERRO: nenhum celular. Ligue a Depuracao USB, conecte o cabo e aceite o aviso no celular."
  exit 1
fi
echo "Celular: $DEVICE"

# 2. APK de preview instalado
if ! adb shell pm list packages | grep -q "$APP_ID"; then
  echo "ERRO: o APK de preview ($APP_ID) nao esta instalado."
  exit 1
fi
echo "APK de preview: OK"

# 3. Teclado sem corretor (o Maestro digita pelo teclado do aparelho)
adb shell settings put secure spell_checker_enabled 0
adb shell settings put secure show_ime_with_hard_keyboard 1
echo "Corretor desligado: OK"

# 4. Sem o preenchimento automatico do Google (Partner, 25/09: ele ofereceu uma
#    conta salva por cima do campo e a bateria se perdeu). O valor de antes
#    fica guardado e o restaurar.sh o devolve.
ANTES=$(adb shell settings get secure autofill_service | tr -d '\r')
if [ "$ANTES" != "null" ] && [ -n "$ANTES" ]; then
  echo "$ANTES" > "$(dirname "$0")/.autofill_antes"
fi
adb shell settings put secure autofill_service null
echo "Preenchimento automatico desligado: OK (ao terminar: bash .maestro/restaurar.sh)"

# 5. Acordar o staging. O keep-warm (DEC-4) o mantem acordado das 6:00 as
#    23:50; fora disso, o primeiro pedido leva ~50 s.
echo -n "Acordando o staging"
for i in $(seq 1 30); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 60 "$API/actuator/health/readiness")
  if [ "$CODE" = "200" ]; then echo " — pronto"; break; fi
  echo -n "."
  sleep 3
done
if [ "$CODE" != "200" ]; then
  echo ""
  echo "ERRO: o staging nao respondeu (ultimo codigo: $CODE)."
  exit 1
fi

# 6. A loja de teste abre das 00:00 as 23:59 — perto da meia-noite o servidor
#    a fecha sozinho (auto-fechamento) e a bateria se perde.
HORA=$(date +%H%M)
if [ "$HORA" -ge 2330 ]; then
  echo "AVISO: sao $(date +%H:%M). A loja de teste fecha as 23:59 — rode depois da meia-noite."
fi

# Chamado pela bateria.sh (BATERIA=1), ela segue sozinha daqui.
[ -n "$BATERIA" ] && exit 0

echo ""
echo "Tudo pronto. A bateria inteira, com o commit esperado e os logs, e um comando so:"
echo ""
echo "  bash .maestro/bateria.sh"
