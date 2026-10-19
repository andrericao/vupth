import { type ReactElement } from 'react';
import { StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { renderWithProviders } from './renderWithProviders';
import { TemaDoApp } from '@components/TemaDoApp';
import { useTemaStore } from '@stores/temaStore';
import { coresDoTema, veuDoTema, type NomeDeCor, type Tema } from '@domain/tema';
import { contraste } from '@domain/contrast';

// Ajudantes dos testes do modo escuro (DEC-75): renderizam dentro do `TemaDoApp`
// no tema pedido e leem a cor RESOLVIDA, a que chegou ao no, em vez de conferir o
// codigo-fonte. Quem usa precisa de `jest.mock('expo-secure-store')` e de
// `jest.mock('@theme/liberacao', () => ({ ESCURO_LIBERADO: true }))` no proprio
// arquivo (o jest so iça o mock do arquivo de teste).

export const TEMAS: Tema[] = ['claro', 'escuro'];
export type Tela = ReturnType<typeof renderWithProviders>;
export type No = ReturnType<Tela['getByTestId']>;
/** [texto na tela, cor do texto, cor do fundo em que ele esta, qual das ocorrencias (0 por padrao)] */
export type Caso = [string, NomeDeCor, NomeDeCor, number?];

export const estilo = (no: No) => (StyleSheet.flatten(no.props.style) ?? {}) as Record<string, string | undefined>;

/**
 * O fundo de um no e o do primeiro ancestral que pinta um (o `transparent` do botao
 * vazado deixa passar o painel por baixo).
 */
export function fundoDe(no: No): string {
  for (let n: No | null = no.parent; n; n = n.parent) {
    const bg = estilo(n).backgroundColor;
    if (bg && bg !== 'transparent') return bg;
  }
  throw new Error('nenhum ancestral com fundo');
}

/** Todos os `backgroundColor` da arvore renderizada. */
export function fundosDa(arvore: unknown): string[] {
  const achados: string[] = [];
  const andar = (no: unknown) => {
    if (!no) return;
    if (Array.isArray(no)) return no.forEach(andar);
    const n = no as { props?: { style?: unknown }; children?: unknown };
    const bg = (StyleSheet.flatten(n.props?.style as never) as { backgroundColor?: string } | undefined)?.backgroundColor;
    if (bg) achados.push(bg);
    andar(n.children);
  };
  andar(arvore);
  return achados;
}

/** Os `Icone` que o componente desenhou (o mock do lucide), com as props que ele deu a eles. */
export function icones(tela: Tela, nome: string): No[] {
  const raiz = tela.UNSAFE_root as unknown as { findAll: (filtro: (n: No) => boolean) => No[] };
  return raiz.findAll((n) => (n.type as unknown) === 'Icone' && n.props.nome === nome);
}

/** Renderiza no tema pedido. A leitura do cofre devolve o mesmo tema, para o `restaurar` do `TemaDoApp` nao desfazer a escolha. */
export function montar(tema: Tema, ui: ReactElement): Tela {
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(tema);
  useTemaStore.setState({ preferencia: tema });
  return renderWithProviders(<TemaDoApp>{ui}</TemaDoApp>);
}

/** Cada texto tem a cor do token, esta sobre o fundo do token, e o par passa de 4,5:1. */
export function conferir(tela: Tela, tema: Tema, casos: Caso[]) {
  const c = coresDoTema(tema);
  for (const [texto, nomeCor, nomeFundo, i = 0] of casos) {
    const no = tela.getAllByText(texto)[i];
    const cor = estilo(no).color as string;
    const fundo = fundoDe(no);
    expect([texto, cor]).toEqual([texto, c[nomeCor]]);
    expect([texto, fundo]).toEqual([texto, c[nomeFundo]]);
    expect([texto, contraste(cor, fundo) >= 4.5]).toEqual([texto, true]);
  }
}

/** O veu e o painel de uma caixa sao os do tema (o veu vem do tokens.json). */
export function conferirPainelEVeu(tela: Tela, tema: Tema) {
  const fundos = fundosDa(tela.toJSON());
  expect(fundos).toContain(veuDoTema(tema));
  expect(fundos).toContain(coresDoTema(tema).painel);
}
