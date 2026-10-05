// Link de divulgacao (Andre, 05/10): o Compartilhar manda um texto curto com o
// link da loja (ou do profissional). Quem abre cai no VUPTH web, que oferece
// baixar o app ou seguir na web. O mesmo texto vale no Partner
// (PAR · compartilhar-no-topo). O telefone nao vai.

export function textoDeDivulgacao(p: { loja: string; profissional?: string; link: string }): string {
  return p.profissional
    ? `Conheça o ${p.profissional} na ${p.loja} — veja a fila e os serviços no VUPTH: ${p.link}`
    : `Conheça a ${p.loja} no VUPTH: ${p.link}`;
}

/** iPhone/iPad: nao ha app para iOS, entao a faixa "Baixar o app" nao aparece. */
export function ehIOS(userAgent: string | undefined | null): boolean {
  return /iPhone|iPad|iPod/i.test(userAgent ?? "");
}

/**
 * O `/baixar` ja aponta para o APK? Liga quando o bucket R2 e o redirecionamento
 * do `public/_redirects` estiverem no ar (Solicitadas, 05/10). Desligado, a
 * faixa nao aparece — melhor nada que um "Baixar" que cai no Inicio.
 */
export const APK_NO_AR = false;

/**
 * O endereco fixo do APK: o site redireciona `/baixar` para o APK mais novo
 * (bucket R2). Quando houver Play Store, so o destino do `/baixar` muda.
 */
export function linkDeBaixar(raiz: string): string {
  return `${raiz.replace(/\/+$/, "")}/baixar`;
}
