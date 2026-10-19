import type { ReactElement } from 'react';
import { StyleSheet } from 'react-native';
import { act } from '@testing-library/react-native';

import { renderWithProviders } from './renderWithProviders';
import { TemaDoApp } from '@components/TemaDoApp';
import { useTemaStore } from '@stores/temaStore';
import type { Tema } from '@domain/tema';

// Leitura da cor RESOLVIDA de uma tela nos dois temas (DEC-75). O Gluestack
// guarda `color="$brandTextPrimary"` como token e so o resolve na hora de pintar,
// entao a unica prova de que uma tela trocou de tema e ler o estilo que chegou
// ao no. Quem usa precisa de, no proprio arquivo:
//   jest.mock('@theme/liberacao', () => ({ ESCURO_LIBERADO: true }));
// (sem a liberacao o `useTema` ignora o escuro) e de um `afterAll(voltarAoClaro)`.

export const TEMAS: Tema[] = ['claro', 'escuro'];

/** O no que o RNTL devolve (o `react-test-renderer` nao traz tipos neste projeto). */
export type No = {
  type: unknown;
  props: Record<string, unknown>;
  parent: No | null;
  findAll: (predicado: (n: No) => boolean) => No[];
};

/**
 * Monta a tela dentro do `TemaDoApp`, no tema pedido. A leitura do cofre fica
 * desligada: o `TemaDoApp` a faz ao montar, e um cofre vazio (o mock) devolveria
 * o claro DEPOIS de qualquer `await` do teste, trocando o tema no meio da leitura.
 * Ler o cofre tem teste proprio (temaStore).
 */
export function renderNoTema(tema: Tema, ui: ReactElement) {
  useTemaStore.setState({ preferencia: tema, restaurar: async () => undefined });
  return renderWithProviders(<TemaDoApp>{ui}</TemaDoApp>);
}

export function voltarAoClaro() {
  act(() => useTemaStore.setState({ preferencia: 'claro' }));
}

export function estilo(no: No): Record<string, unknown> {
  return (StyleSheet.flatten(no.props.style as never) ?? {}) as Record<string, unknown>;
}

export const corDe = (no: No) => estilo(no).color as string | undefined;

// O Gluestack repete o estilo resolvido nas camadas de um mesmo componente (o
// styled e a View por baixo), entao "o pai" de um no que ja tem fundo pode ser o
// proprio fundo dele: os dois helpers abaixo pulam o valor que o no ja tem.
function primeiro(no: No, propriedade: 'backgroundColor' | 'borderColor'): string | undefined {
  const proprio = estilo(no)[propriedade];
  for (let pai = no.parent; pai; pai = pai.parent) {
    const valor = estilo(pai)[propriedade];
    if (typeof valor === 'string' && valor !== proprio) return valor;
  }
  return undefined;
}

/**
 * O primeiro fundo por baixo do no: o que o texto realmente tem atras. Um texto
 * so e legivel contra ESSE fundo, nao contra o da tela.
 */
export const fundoSobre = (no: No) => primeiro(no, 'backgroundColor');

/** A primeira borda por cima do no (o cartao que o contorna). */
export const bordaSobre = (no: No) => primeiro(no, 'borderColor');

function luminancia(hex: string): number {
  const canal = (i: number) => {
    const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * canal(0) + 0.7152 * canal(1) + 0.0722 * canal(2);
}

/** Razao de contraste WCAG entre duas cores #RRGGBB. */
export function razao(a: string, b: string): number {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (escuro + 0.05);
}
