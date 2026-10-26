#!/bin/bash
# Prepara a bateria do Maestro do CLIENT (roteiro: .maestro/bateria_completa.yaml).
# Espelha o setup.sh do vupth-partner.
#
# Uso:  bash .maestro/bateria.sh (chama este setup, roda e restaura). Sozinho,
#       bash .maestro/setup.sh so prepara o celular.
#       bash .maestro/setup.sh --publicar-ota  # publica o OTA da dev antes (publicar-ota.sh)
#
# Precisa de: celular com "Depuracao USB" ligada, conectado no cabo, com o APK
# de PREVIEW instalado (com.vupth.client.preview — aponta para o staging).
# O Maestro ja esta em ~/.maestro/bin.

export PATH="$PATH:$HOME/Android/Sdk/platform-tools:$HOME/.maestro/bin"
API="https://vupth-backend-ia.onrender.com"
APP_ID="com.vupth.client.preview"

echo "=== VUPTH Client — bateria Maestro (staging) ==="

# maestro-publica-o-ota (22/10): com --publicar-ota o script publica o EAS Update da dev (canal
# preview) antes de tocar no celular; se o OTA falhar, diz claramente e PARA — o Andre publica a
# mao (comando no topo do publicar-ota.sh).
for ARG in "$@"; do
  if [ "$ARG" = "--publicar-ota" ]; then
    bash "$(dirname "$0")/publicar-ota.sh" || { echo "ERRO: OTA nao publicado — a bateria parou."; exit 1; }
  fi
done

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

# 4b. Emulador (emulador-lento, Andre 10/10 19h: "o emulador e mais lento,
#     deve haver um preparo para isso"): sem animacoes e sem o app Google, que
#     disputam os 2 nucleos do PC com o app e trazem o aviso "Process system
#     isn't responding" (o apoio/esperar_o_sistema.yaml toca em "Wait").
#     Permissoes por pm grant nao: o clearState de cada etapa as zera, e as
#     etapas testam a caixa do sistema (negar, a tela 10, o "permitir" da 13).
case "${ANDROID_SERIAL:-$DEVICE}" in
  emulator-*)
    for CHAVE in window_animation_scale transition_animation_scale animator_duration_scale; do
      adb shell settings put global "$CHAVE" 0
    done
    adb shell pm disable-user --user 0 com.google.android.googlequicksearchbox >/dev/null 2>&1
    # Bateria 25/10 01:28: 10 etapas cairam em "prepara a etapa" (Paste text, DEADLINE_EXCEEDED em 120 s). O
    # logcat mostra "Unable to freeze binder for <pid>: -11" e "Sending oneway calls to frozen process"
    # logo antes de "Crash of app dev.mobile.maestro": o congelador de apps do Android (cached apps
    # freezer) congela o driver do Maestro enquanto o app testado fica na frente, e a instrumentacao cai
    # (a 2a tentativa cai igual, porque o aparelho segue igual). Desliga o congelador e o modo soneca.
    # A chave do congelador so vale depois de reiniciar o emulador: se ainda cair, reinicie-o uma vez.
    adb shell settings put global cached_apps_freezer disabled >/dev/null 2>&1
    adb shell device_config put activity_manager_native_boot use_freezer false >/dev/null 2>&1
    adb shell dumpsys deviceidle disable >/dev/null 2>&1
    adb shell settings put global app_standby_enabled 0 >/dev/null 2>&1
    echo "Emulador: sem animacoes, sem o app Google e sem o congelador de apps: OK"
    ;;
esac

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
