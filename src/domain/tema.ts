import tokens from '../theme/tokens.json';
import { papeis as PAPEIS } from '../theme/papeis.json';

// Tema claro/escuro (DEC-75, 16/10). A UNICA fonte dos valores e o
// `src/theme/tokens.json`, copia de vupth-docs/fontes/design/tokens.json (o CI
// nao enxerga o vupth-docs). Nada aqui escreve um hex: tudo sai do JSON, e o
// teste do tema mede de novo cada par de `verificacao` do proprio arquivo.
//
// Como chega as telas: o tema do Gluestack e refeito com as cores do tema
// escolhido (`configComTema`, em config/gluestack-ui.config.ts) e o App remonta
// a arvore, como ja faz com o tamanho da letra. Um `bg="$brandSurface"` passa a
// valer a surface do tema sem mexer na tela. Cor escrita em PROP (icone,
// `color="#163300"`, placeholder) nao passa pelo Gluestack: essa vem de
// `useTema().cores`.

export type Tema = 'claro' | 'escuro';
/** O que a pessoa escolhe. `automatico` segue o tema do aparelho. */
export type Preferencia = Tema | 'automatico';
/** Uma cor do tokens.json (a tabela da Design). */
export type NomeDeToken = keyof typeof tokens.cor;
/** Um lugar onde o desenho troca de token entre os temas (papeis.json). */
export type NomeDePapel = keyof typeof PAPEIS;
export type NomeDeCor = NomeDeToken | NomeDePapel;
export type Cores = Record<NomeDeCor, string>;

export const PREFERENCIAS: readonly Preferencia[] = ['claro', 'escuro', 'automatico'];

export const ROTULO_DA_PREFERENCIA: Record<Preferencia, string> = {
  claro: 'Claro',
  escuro: 'Escuro',
  automatico: 'Automático',
};

export const NOMES_DE_TOKEN = Object.keys(tokens.cor) as NomeDeToken[];
export const NOMES_DE_PAPEL = Object.keys(PAPEIS) as NomeDePapel[];
export const NOMES_DE_COR: NomeDeCor[] = [...NOMES_DE_TOKEN, ...NOMES_DE_PAPEL];

/** Qual token o papel usa no tema. */
export function tokenDoPapel(papel: NomeDePapel, tema: Tema): NomeDeToken {
  return PAPEIS[papel][tema] as NomeDeToken;
}

// O padrao e CLARO: um valor desconhecido (chave corrompida no aparelho, versao
// futura do app) nunca liga o escuro sozinho.
export function preferenciaValida(valor: unknown): Preferencia {
  return valor === 'escuro' || valor === 'automatico' ? valor : 'claro';
}

/**
 * Preferencia + tema do aparelho = o tema que vale. O aparelho so conta no
 * `automatico`; "claro" e "escuro" ignoram o sistema de proposito.
 */
export function resolverTema(preferencia: Preferencia, sistema: string | null | undefined): Tema {
  if (preferencia === 'automatico') return sistema === 'dark' ? 'escuro' : 'claro';
  return preferencia;
}

const POR_TEMA = {} as Record<Tema, Cores>;
for (const tema of ['claro', 'escuro'] as const) {
  POR_TEMA[tema] = Object.fromEntries([
    ...NOMES_DE_TOKEN.map((nome) => [nome, tokens.cor[nome][tema]]),
    ...NOMES_DE_PAPEL.map((papel) => [papel, tokens.cor[tokenDoPapel(papel, tema)][tema]]),
  ]) as Cores;
}

/** Os hex do tema, por nome. O mesmo objeto a cada chamada (serve de dependencia de memo). */
export function coresDoTema(tema: Tema): Cores {
  return POR_TEMA[tema];
}

/** Veu atras de modal: o escuro precisa de mais densidade para separar o dialogo. */
export function veuDoTema(tema: Tema): string {
  return tema === 'escuro' ? tokens.primitivas.modal.veuEscuro : tokens.primitivas.modal.veuClaro;
}

// O nome de cada cor do tokens.json no tema do Gluestack (config/gluestack-ui.config.ts).
// Os `brand*` e os acentos ja existiam la; os `on*` e o amber entram agora.
const NO_GLUESTACK = {
  green: 'brandGreen',
  onGreen: 'onGreen',
  forest: 'forest',
  forestSoft: 'forestSoft',
  greenTint: 'greenTint',
  onGreenTint: 'onGreenTint',
  background: 'brandBackground',
  surface: 'brandSurface',
  surfaceAlt: 'brandSurfaceAlt',
  textPrimary: 'brandTextPrimary',
  textSecondary: 'brandTextSecondary',
  textPlaceholder: 'brandTextPlaceholder',
  border: 'brandBorder',
  danger: 'brandDanger',
  onDanger: 'onDanger',
  dangerTint: 'brandDangerTint',
  accentPeach: 'accentPeach',
  onAccentPeach: 'onAccentPeach',
  accentBlue: 'accentBlue',
  onAccentBlue: 'onAccentBlue',
  accentPink: 'accentPink',
  onAccentPink: 'onAccentPink',
  accentPlum: 'accentPlum',
  onAccentPlum: 'onAccentPlum',
  amber: 'amber',
  warning: 'brandWarning',
  success: 'brandSuccess',
} as const satisfies Record<NomeDeToken, string>;

export type NomeNoGluestack = (typeof NO_GLUESTACK)[NomeDeToken];
export type CoresDoGluestack = Record<NomeNoGluestack | NomeDePapel, string>;

/** O nome do token do Gluestack que corresponde a uma cor do tokens.json. */
export function nomeNoGluestack(nome: NomeDeToken): NomeNoGluestack {
  return NO_GLUESTACK[nome];
}

/**
 * As cores do tema com os NOMES do Gluestack (`brandSurface`, `forest`…), para
 * entrar em `tokens.colors`. Os papeis entram com o proprio nome (`painel`…).
 */
export function coresNoGluestack(tema: Tema): CoresDoGluestack {
  const cores = coresDoTema(tema);
  return Object.fromEntries([
    ...NOMES_DE_TOKEN.map((nome) => [NO_GLUESTACK[nome], cores[nome]]),
    ...NOMES_DE_PAPEL.map((papel) => [papel, cores[papel]]),
  ]) as CoresDoGluestack;
}
