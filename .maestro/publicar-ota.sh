#!/bin/bash
# maestro-publica-o-ota (Andre, 22/10): publica o EAS Update da dev (canal
# preview) com o que o repositorio ja usa — o mesmo comando do job `ota` do
# ci.yml — para a bateria rodar sem o Andre atualizar o OTA a mao. Espelha o
# publicar-ota.sh do vupth-partner.
#
# Uso:  bash .maestro/publicar-ota.sh
#       bash .maestro/bateria.sh --publicar-ota   # publica e segue para a bateria
#
# Comando manual, uma linha (se este script falhar):
#   EXPO_PUBLIC_API_ENV=staging eas update --branch preview --message "bateria" --non-interactive
#
# Para na primeira falha e diz o que houve; nunca instala nada. O celular so
# pega o bundle novo se a bateria conferir o commit na tela de Configuracoes
# (a etapa 00 da bateria ja faz isso com o COMMIT esperado).

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"

EAS="$(command -v eas)"
if [ -z "$EAS" ]; then
  EAS="$(ls -1 "$HOME"/.nvm/versions/node/*/bin/eas 2>/dev/null | tail -1)"
fi
if [ -z "$EAS" ]; then
  echo "ERRO: o eas-cli nao esta instalado neste computador. Publique o OTA a mao (comando no topo deste arquivo)."
  exit 2
fi

# O OTA sai da pasta: so vale se ela estiver no commit da origin/dev.
git -C "$RAIZ" fetch -q origin dev 2>/dev/null || echo "AVISO: sem fetch — usando a origin/dev que a pasta ja conhece."
LOCAL=$(git -C "$RAIZ" rev-parse HEAD)
REMOTO=$(git -C "$RAIZ" rev-parse origin/dev)
if [ "$LOCAL" != "$REMOTO" ]; then
  echo "ERRO: a pasta nao esta no commit da origin/dev ($(git -C "$RAIZ" rev-parse --short HEAD) contra $(git -C "$RAIZ" rev-parse --short origin/dev)). Faca git pull (ou push) antes."
  exit 3
fi

if ! (cd "$RAIZ" && "$EAS" whoami >/dev/null 2>&1) && [ -z "$EXPO_TOKEN" ]; then
  echo "ERRO: o eas nao esta logado (rode eas login ou exporte EXPO_TOKEN). Publique o OTA a mao (comando no topo deste arquivo)."
  exit 4
fi

# ota-so-compativel (DEC-152): nao publica OTA para um app sem os modulos nativos dele.
NODE="$(command -v node)"
if [ -z "$NODE" ]; then
  NODE="$(ls -1 "$HOME"/.nvm/versions/node/*/bin/node 2>/dev/null | tail -1)"
fi
if [ -z "$NODE" ] || ! (cd "$RAIZ" && "$NODE" tools/guardaOta.js); then
  echo "ERRO: o guarda do OTA bloqueou (o projeto nativo mudou, ou nao deu para comparar). Falta um build novo: nao publique o OTA."
  exit 5
fi

MSG="bateria Maestro · $(git -C "$RAIZ" log -1 --format=%h%x20%s origin/dev)"
echo "Publicando o OTA da dev (canal preview): $MSG"
if ! (cd "$RAIZ" && EXPO_PUBLIC_API_ENV=staging "$EAS" update --branch preview --message "$MSG" --non-interactive); then
  echo "ERRO: o EAS Update falhou. A bateria NAO vai rodar. Publique a mao (comando no topo deste arquivo) e rode a bateria de novo."
  exit 1
fi
echo "OTA publicado. A bateria confere o commit na tela de Configuracoes antes de comecar."
