/**
 * Qual backend este bundle fala.
 *
 * Render = STAGING, e e nele que se testa: em device pelo canal `preview`, na
 * web pelo link que comeca com "dev". Railway = PRODUCAO, e so o canal
 * `production` encosta nele (Andre 2026-09-06).
 *
 * ⚠️ POR QUE ISTO NAO E SO UM `process.env`
 *
 * `EXPO_PUBLIC_API_ENV` e embutido no bundle NA HORA DE PUBLICAR, a partir do
 * `.env` da maquina de quem publicou. Quem estivesse com `local` no `.env`
 * (o normal pra rodar no computador) publicaria um app apontando pra
 * `http://localhost:8080` — morto em qualquer aparelho, e sem nenhum erro que
 * diga isso. Chegamos a um comando de distancia disso em 22/08.
 *
 * O CANAL, nao. Ele e carimbado pelo EAS no proprio update e nao depende do
 * ambiente de quem rodou o comando. Entao: havendo canal (bundle publicado),
 * quem decide e o canal; sem canal (rodando local), vale o `.env`.
 *
 * Consequencia pratica: publicar de qualquer maquina, com qualquer `.env`,
 * cai no backend certo. Nao ha mais o que lembrar antes de publicar.
 */
/**
 * `dev` e a MAQUINA (Docker local), `staging` e o Render, `prod` e o Railway.
 *
 * Sao os mesmos tres nomes do backend — `application-dev.properties`,
 * `application-staging.properties`, `application-prod.properties` — e e de
 * proposito: ate 06/09 este app chamava de `dev` o RENDER e de `local` a
 * maquina, invertendo o vocabulario de quem serve a API. A mesma palavra
 * significava a sua maquina de um lado e a nuvem do outro.
 */
export type ApiEnv = "dev" | "staging" | "prod";

/**
 * Canal do EAS -> ambiente. Mesma tabela do `eas.json` dos dois apps.
 *
 * `preview` aponta pro RENDER (staging). Ate 06/09 apontava pro Railway, e a
 * justificativa escrita era "e no Railway que o time testa em device"
 * (22/08) — o que significava, assumidamente, TESTE EM DEVICE GRAVANDO NO
 * BANCO DE PRODUCAO.
 *
 * A premissa caiu duas vezes: em 28/08 ficou `staging` = Render (secao 1w do
 * PRD), e em 06/09 o front-partner corrigiu o lado deles e fechou "o Render e
 * o que se testa". O Andre confirmou pro client no mesmo dia: testa-se no
 * `preview`; o que se MOSTRA a usuario e a versao de `production`.
 *
 * Fica so o `production` encostando no Railway. Efeito esperado, nao bug: o
 * Render Free hiberna, entao o APK de teste ve o portao do `waitForBackend`
 * (~50s) no primeiro acesso depois de ociosidade — o keep-warm foi cancelado
 * em 31/08 de proposito.
 */
export const CANAL_PARA_ENV: Record<string, ApiEnv> = {
  development: "staging",
  preview: "staging",
  production: "prod",
};

export function resolveApiEnv(
  canal: string | null | undefined,
  envDoBundle: string | null | undefined,
): ApiEnv {
  // So canal DECLARADO manda. Um canal fora da tabela nao diz nada sobre
  // backend — pode ser um canal avulso, ou o `"mock"` que o jest-expo devolve
  // quando nao ha OTA nenhum. Confiar nele as cegas ligava o portao de
  // readiness no meio dos testes, que rodam apontando pro `local`.
  const doCanal = canal ? CANAL_PARA_ENV[canal] : undefined;
  if (doCanal) return doCanal;

  const doEnv = envDoBundle as ApiEnv | undefined;
  // Fallback e `dev` (a maquina): valor desconhecido nao pode cair num
  // ambiente que tem dado de gente. Quem errar o nome bate no proprio Docker
  // e descobre na hora, em vez de escrever no Render sem perceber.
  return doEnv && ["dev", "staging", "prod"].includes(doEnv) ? doEnv : "dev";
}
