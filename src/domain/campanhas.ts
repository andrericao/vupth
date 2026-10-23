import type { Campanha } from '@services/campaignService';

import { formatarReais } from '@utils/formatarReais';

// Cupom no app (cupom-no-app, Andre 15/10): Perfil > Promocoes, digitar o
// cupom e ver os aceitos. Texto curto (DEC-63).
//
// LIGADO com o Backend 5de02e0 (cupom-ativado-em-configuracoes, DEC-110): ativar,
// Meus cupons (ativos e encerrados) e, no passo seguinte, usar no corte.
export const CUPOM_LIGADO = true;

/** O que digitar: sem espacos nas pontas (o Backend nao diferencia maiuscula). */
export function cupomDigitado(texto: string): string {
  return texto.trim();
}

/** A recusa do Backend em uma frase curta. */
export function mensagemDoCupom(erro: unknown): string {
  const code = (erro as { response?: { data?: { code?: string } } } | null)?.response?.data?.code;
  switch (code) {
    case 'CAMPAIGN_NOT_FOUND':
      return 'Cupom não encontrado.';
    case 'CAMPAIGN_NOT_AVAILABLE':
      return 'Este cupom não está valendo agora.';
    case 'CAMPAIGN_ALREADY_REDEEMED':
      return 'Você já usou este cupom.';
    case 'COUPON_NOT_ACTIVE':
      return 'Este cupom não está valendo. Escolha outro ou siga sem cupom.';
    case 'CAMPAIGN_NOT_FOR_YOU':
      return 'Este cupom não vale para a sua conta.';
    default:
      return 'Não foi possível usar o cupom. Tente de novo.';
  }
}

/** O nome que a lista mostra. */
export function nomeDaCampanha(c: Campanha): string {
  return c.name || c.code || 'Cupom';
}

function dia(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** A regra em uma frase: "R$ 5,00 de desconto" ou "10% de desconto". */
export function regraDoCupom(c: Campanha): string {
  if (c.value_percent) return `${c.value_percent}% de desconto`;
  if (c.value_amount) return `${formatarReais(c.value_amount)} de desconto`;
  return c.benefit || '';
}

/** A validade (o fim da campanha), ou vazio sem data. */
export function validadeDoCupom(c: Campanha): string {
  if (!c.ends_at || Number.isNaN(new Date(c.ends_at).getTime())) return '';
  return `Vale até ${dia(c.ends_at)}`;
}

/** O rotulo de quem ja nao vale: usado ou vencido. */
export function situacaoDoCupom(c: Campanha): string {
  return c.status === 'USED' || c.used ? 'Usado' : 'Vencido';
}

/**
 * Ativos (para usar) e encerrados (usados ou vencidos). Sem `status` (Backend
 * anterior) todo cupom da lista vale como ativo.
 */
export function separarCupons(lista: Campanha[]): { ativos: Campanha[]; encerrados: Campanha[] } {
  const encerrado = (c: Campanha) => c.status === 'USED' || c.status === 'EXPIRED' || c.used === true;
  return { ativos: lista.filter((c) => !encerrado(c)), encerrados: lista.filter(encerrado) };
}
