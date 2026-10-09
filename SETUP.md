# Montar um PC do zero — VUPTH Client

DEC-28 (5), Andre 08/10: "se eu perder o computador local, não posso perder nada".
Tudo o que o app, os testes e a bateria usam está no GitHub. Os segredos não
estão aqui: eles vivem no EAS, no GitHub Actions e no cofre de senhas do Andre
(lista em vupth-docs → aba Client → Solicitadas, "pc-descartavel").

## 1. Clonar (as três pastas lado a lado)

```bash
mkdir -p ~/Documentos/programacao && cd ~/Documentos/programacao
git clone https://github.com/andrericao/vupth.git        # este repositório
git clone https://github.com/andrericao/vupth-docs.git   # as regras e o Quadro (os hooks leem ../vupth-docs)
git clone https://github.com/andrericao/vupth-partner.git # só para as etapas conjuntas da bateria (18–22)
cd vupth && git checkout cloud
```

## 2. Node e dependências

- Node 22 (`.nvmrc`; o mínimo é o `engines.node`, >= 20.19.4). Com o nvm:
  `nvm install 22 && nvm use 22`. O pre-push acha o Node certo sozinho
  (`.githooks/node-certo.sh`).
- `npm ci`
- O `npm ci` já liga o pre-push (o `prepare` faz `git config core.hooksPath .githooks`):
  lint, typecheck, jest com cobertura e expo-doctor antes de todo push.

## 3. Testes

```bash
npm run lint && npm run typecheck
npx jest --ci --coverage        # o mesmo gate do CI (coverageThreshold, a catraca)
```

A falha do jest no pre-push fica em `.logs-teste/`, fora do git.

## 4. Rodar o app

- Web: `npm run web`. Fala com o staging (o `.env` versionado aponta para
  ele; o override pessoal vai em `.env.local`, ignorado).
- Celular: o APK de preview (`com.vupth.client.preview`) vem do EAS: `eas build -p android --profile preview`,
  ou o link do último build em expo.dev. O código novo chega por OTA (canal `preview`)
  depois do merge cloud → dev.

## 5. A bateria Maestro (celular no cabo)

1. Android SDK platform-tools (`adb`) em `~/Android/Sdk/platform-tools`.
2. Maestro em `~/.maestro/bin`: `curl -Ls "https://get.maestro.mobile.dev" | bash`.
3. Celular com a Depuração USB ligada e o APK de preview instalado. Para as
   etapas conjuntas, também o APK de preview do Partner (`com.vupth.partner.preview`)
   e o clone `../vupth-partner`; sem eles, essas etapas ficam ⏭.
4. `bash .maestro/bateria.sh`. Ela prepara o celular (`setup.sh`), acorda o
   staging, confere o commit do OTA e roda as etapas. No fim, o `restaurar.sh`
   devolve o corretor e o preenchimento automático.

As contas de teste vêm da API (cada etapa cria a sua) e de
`.maestro/TEST_ACCOUNTS.md`. A senha das contas de teste é pública (`Teste@123`).
A bateria não usa arquivo de fora do repositório. Os logs ficam em
`.maestro/logs/<rodada>/` e sobem para o GitHub ao fim da rodada.

## 6. Claude Code

Os hooks e as regras moram no vupth-docs (DEC-28): `../vupth-docs/regras/CLAUDE-equipes.md`.
