/**
 * valor-em-reais-padronizado (André, 22/10): um só formato em todo o app —
 * "R$ 53,90": símbolo, espaço, vírgula nos centavos, ponto no milhar
 * ("R$ 1.234,56") e sempre duas casas. Nada de "R$53.90". À mão, sem Intl:
 * o Hermes do aparelho nem sempre traz o locale pt-BR.
 */
export function formatarReais(valor: number): string {
  const v = Number.isFinite(valor) ? valor : 0;
  const [inteiro, centavos] = Math.abs(v).toFixed(2).split('.');
  const comMilhar = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${v < 0 ? '-' : ''}R$ ${comMilhar},${centavos}`;
}
