// A pilula "↑ Voltar ao topo" — desenho decidido no Partner (24/09) e deixado
// mais leve pelo Andre em 25/09: a paleta do atalho "Area do dono" do Partner
// (verde-claro com forest), menor. Os numeros sao os propostos ao Partner em
// 24/09 para os dois apps se comportarem igual.
export const LIMITE_EM_TELAS = 2;
/** Perto do topo a pilula some — ali ela nao tem o que fazer. */
export const PERTO_DO_TOPO_PX = 80;

/** Visivel depois de rolar duas alturas de tela; some perto do topo. */
export function pilulaVisivel(rolagemY: number, alturaDaTela: number): boolean {
  if (alturaDaTela <= 0 || rolagemY < PERTO_DO_TOPO_PX) return false;
  return rolagemY > alturaDaTela * LIMITE_EM_TELAS;
}
