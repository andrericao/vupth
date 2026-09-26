import { ServiceType } from './types';

/**
 * Nomes das categorias em portugues — FONTE UNICA.
 *
 * Estava duplicado dentro da `Home.tsx`, o que fazia a mesma categoria aparecer
 * traduzida na lista e crua em qualquer outra tela (Andre 2026-08-06: "na tela
 * inicial aparece barbearia, salao etc, mas quando clicamos no estabelecimento
 * o tipo fica em ingles").
 */
export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  BARBER: 'Barbearia',
  BEAUTY_SALON: 'Salão',
  EYEBROW: 'Sobrancelha',
  NAIL_SALON: 'Manicure',
  SPA: 'Spa',
  CLINIC: 'Clínica',
};

/** Traduz uma categoria; valor desconhecido volta intacto (nunca some da tela). */
export function serviceTypeLabel(value: string): string {
  return SERVICE_TYPE_LABELS[value.trim().toUpperCase() as ServiceType] ?? value;
}

/**
 * Codigos de especialidade que o cadastro do Partner grava (onboarding do
 * profissional) — os mesmos rotulos de la (`vupth-partner/src/lib/especialidade.ts`).
 * Andre, 26/09: na tela da loja, a faixa dos profissionais mostrava "NAIL_TECH".
 * `BARBER` aqui e o PROFISSIONAL ("Barbeiro"), nao a loja ("Barbearia").
 */
export const SPECIALTY_LABELS: Record<string, string> = {
  BARBER: 'Barbeiro',
  HAIRDRESSER: 'Cabeleireiro(a)',
  NAIL_TECH: 'Manicure',
  EYEBROW_TECH: 'Designer de sobrancelha',
  MASSEUSE: 'Massagista',
  ESTHETICIAN: 'Esteticista',
};

/** Parece codigo de sistema ("NAIL_TECH"), e nao texto escrito por alguem. */
const PARECE_CODIGO = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$/;

function especialidade(parte: string): string {
  const codigo = parte.toUpperCase();
  const nome = SPECIALTY_LABELS[codigo] ?? SERVICE_TYPE_LABELS[codigo as ServiceType];
  if (nome) return nome;
  // Codigo que ainda nao conhecemos nunca vai cru para a tela.
  return PARECE_CODIGO.test(parte) ? '' : parte;
}

/**
 * Especialidade do profissional, para exibicao.
 *
 * O cadastro do Partner grava um CODIGO (`NAIL_TECH`, `HAIRDRESSER`…), e
 * cadastros antigos trazem a categoria da loja (`NAIL_SALON`) ou texto livre
 * ("Colorista"). Traduz os codigos conhecidos, esconde os desconhecidos e deixa
 * o texto livre intacto — mapear a forca quebraria quem escreveu de verdade.
 *
 * Aceita lista separada por virgula, que e como alguns cadastros vieram.
 */
export function formatSpecialty(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .split(',')
    .map((part) => especialidade(part.trim()))
    .filter((part) => part.length > 0)
    .join(', ');
}

/**
 * Categorias no PLURAL, para titulo de lista ("BARBEARIAS").
 *
 * Mapa proprio em vez de somar "s": "Salão" vira "Salões", nao "Salãos". Fica
 * aqui pelo mesmo motivo do singular — categoria nova entra num lugar so.
 */
export const SERVICE_TYPE_LABELS_PLURAL: Record<ServiceType, string> = {
  BARBER: 'Barbearias',
  BEAUTY_SALON: 'Salões',
  EYEBROW: 'Sobrancelhas',
  NAIL_SALON: 'Manicures',
  SPA: 'Spas',
  CLINIC: 'Clínicas',
};

/** Titulo da lista para uma categoria; "ALL"/desconhecido cai em "Estabelecimentos". */
export function serviceTypeTitle(value: string | null | undefined): string {
  if (!value || value === 'ALL') return 'Estabelecimentos';
  return SERVICE_TYPE_LABELS_PLURAL[value as ServiceType] ?? 'Estabelecimentos';
}
