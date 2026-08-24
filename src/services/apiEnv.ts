/**
 * Qual backend este bundle fala.
 *
 * Render = ambiente de TESTE; Railway = PRODUCAO, e e no Railway que o time
 * testa em device (Andre 2026-08-22).
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
export type ApiEnv = "local" | "dev" | "staging" | "prod";

/**
 * Canal do EAS -> ambiente. Mesma tabela do `eas.json` dos dois apps.
 *
 * `preview` aponta pro RAILWAY (producao), nao pro Render, e isso e
 * deliberado: `preview` e o UNICO canal que existe nos dois projetos, os
 * builds do time sao perfil `preview` com distribuicao interna, e e no Railway
 * que o time testa em device (Andre 2026-08-22). Mandar `preview` pro Render
 * significaria que o teste de device nunca bate no backend que eles conferem.
 *
 * ⚠️ A consequencia esta assumida: teste em device grava no banco de
 * PRODUCAO. Se um dia existir um canal so de teste, e aqui que ele entra,
 * apontando pro `dev`.
 */
export const CANAL_PARA_ENV: Record<string, ApiEnv> = {
  development: "dev",
  preview: "prod",
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
  return doEnv && ["local", "dev", "staging", "prod"].includes(doEnv) ? doEnv : "local";
}
