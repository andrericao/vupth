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

function horaDoFim(iso?: string | null): string {
  if (!iso || Number.isNaN(new Date(iso).getTime())) return '';
  const d = new Date(iso);
  return `${dia(iso)} às ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** campanha-encerrada-esgotada-e-validade (DEC-124): o aviso ao ativar; vazio sem data. */
export function avisoDeValidade(c: Campanha): string {
  const fim = horaDoFim(c.ends_at);
  return fim ? `Cupom válido até ${fim}. Se não usar até lá, perde.` : '';
}

const DIAS: Record<string, string> = {
  MONDAY: 'segunda',
  TUESDAY: 'terça',
  WEDNESDAY: 'quarta',
  THURSDAY: 'quinta',
  FRIDAY: 'sexta',
  SATURDAY: 'sábado',
  SUNDAY: 'domingo',
};

/** Os dias da semana em que vale, ou "todos os dias" (campo vazio). */
export function diasDoCupom(c: Campanha): string {
  const dias = (c.weekdays ?? '')
    .split(',')
    .map((d) => DIAS[d.trim().toUpperCase()])
    .filter(Boolean);
  return dias.length > 0 ? dias.join(', ') : 'todos os dias';
}

/** O "Saiba mais" do cupom: a regra, os dias e o prazo. */
export function saibaMaisDoCupom(c: Campanha): string {
  const linhas = [regraDoCupom(c), `Vale: ${diasDoCupom(c)}.`];
  const fim = horaDoFim(c.ends_at);
  if (fim) linhas.push(`Prazo: até ${fim}.`);
  return linhas.filter(Boolean).join('\n');
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
