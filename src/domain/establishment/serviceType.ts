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
 * Especialidade do profissional, para exibicao.
 *
 * No backend `specialty` e **texto livre** ("Corte masculino", "Colorista") —
 * nao e enum. Mas parte dos cadastros foi preenchida com a categoria em ingles
 * (`BARBER`, `NAIL_SALON`), e era isso que aparecia embaixo do nome do
 * profissional. Traduzimos o que reconhecemos e devolvemos o resto **intacto**:
 * mapear a forco quebraria quem escreveu a especialidade de verdade.
 *
 * Aceita lista separada por virgula, que e como alguns cadastros vieram.
 */
export function formatSpecialty(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .split(',')
    .map((part) => serviceTypeLabel(part.trim()))
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
