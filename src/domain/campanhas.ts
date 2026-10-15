import type { Campanha } from '@services/campaignService';

// Cupom no app (cupom-no-app, Andre 15/10): Perfil > Promocoes, digitar o
// cupom e ver os aceitos. Texto curto (DEC-63).
//
// DESLIGADO ate o Backend (4a94610) subir: com false, o menu nao aparece.
export const CUPOM_LIGADO = false;

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
