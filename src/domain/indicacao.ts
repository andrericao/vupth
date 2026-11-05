// entrada-por-link (CLI-34, Backend 3fdcec1): quem chega pelo link de
// indicacao de um profissional ou dono (`https://vupth.pages.dev/i/<codigo>`)
// fica ligado a ele. O app guarda o codigo ao abrir pelo link e, com o cliente
// logado, manda POST /referrals/claim. Vale o primeiro; repetir e inofensivo.

/** Onde o codigo fica guardado ate o cliente entrar na conta. */
export const INDICACAO_KEY = 'vupth_indicacao';

/** Onde a campanha do link (`?c=<campanha>`) fica guardada junto do codigo. */
export const INDICACAO_CAMPANHA_KEY = 'vupth_indicacao_campanha';
/** desconto-no-link-cliente: o code da campanha que a previa publica devolveu (so com o ref do link valido), para o redeem depois do cadastro. */
export const INDICACAO_CUPOM_KEY = 'vupth_indicacao_cupom';

/** A campanha de `?c=<campanha>` no endereco aberto, ou null. */
export function campanhaDoCaminho(endereco: string): string | null {
  const query = endereco.split('#')[0].split('?')[1] ?? '';
  const achado = /(?:^|&)c=([A-Za-z0-9_-]{1,64})(?:&|$)/.exec(query);
  return achado ? achado[1] : null;
}

/**
 * teste-link-de-participacao (CLI-3, 05/11): no APARELHO o link chega inteiro, pelo Android, e nao como o
 * caminho do navegador. `https://app.vupth.com/i/<codigo>?c=..` (producao, intent filter do app.config.js) ou
 * `vupth://i/<codigo>?c=..` (o esquema do app, que vale em todo build) viram `/i/<codigo>?c=..`, o mesmo caminho
 * que a web le. Qualquer outro endereco vira "" (nada a guardar).
 */
export function caminhoDoLink(url: string | null | undefined): string {
  if (!url) return '';
  const esquema = /^vupth:\/\/(.*)$/i.exec(url);
  if (esquema) return `/${esquema[1].replace(/^\/+/, '')}`;
  const dominio = /^https:\/\/app\.vupth\.com(\/.*)?$/i.exec(url);
  if (dominio) return dominio[1] ?? '/';
  return '';
}

/** O codigo de `/i/<codigo>` (sem query nem barra no fim), ou null. */
export function codigoDoCaminho(caminho: string): string | null {
  const semQuery = caminho.split(/[?#]/)[0];
  const achado = /^\/*i\/([A-Za-z0-9_-]{3,64})\/?$/.exec(semQuery);
  return achado ? achado[1] : null;
}

/**
 * O que fazer com o codigo guardado depois de uma recusa. 404 (codigo que nao
 * existe), 409 (ja tem quem indicou) e 422 (o proprio link) nao mudam tentando
 * de novo: o codigo sai. Sem rede ou servidor fora: fica para a proxima.
 */
export function descartarDepoisDaRecusa(erro: unknown): boolean {
  const status = (erro as { response?: { status?: number } } | null)?.response?.status;
  return status === 404 || status === 409 || status === 422;
}
