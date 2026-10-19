import { useEffect } from 'react';
import { Appearance, Platform } from 'react-native';

import { useTema } from '@hooks/useTema';
import { ESCURO_LIBERADO } from '@theme/liberacao';
import type { Preferencia } from '@domain/tema';

/**
 * O que pedir ao sistema: `light`/`dark` fixam, `null` devolve ao aparelho. Sem
 * isso quem escolheu "Claro" e tem o celular no escuro veria o teclado e as
 * caixas nativas escuras sobre um app claro (e o inverso para "Escuro").
 */
export function esquemaDoSistema(preferencia: Preferencia): 'light' | 'dark' | null {
  if (preferencia === 'claro') return 'light';
  if (preferencia === 'escuro') return 'dark';
  return null;
}

/** `Appearance.setColorScheme` nao existe no react-native-web: la nao ha o que avisar. */
export function pedirEsquemaAoSistema(preferencia: Preferencia): void {
  if (typeof Appearance.setColorScheme !== 'function') return;
  try {
    Appearance.setColorScheme(esquemaDoSistema(preferencia));
  } catch {
    // Um aparelho que recusa o pedido continua com o esquema dele: o app ja
    // pinta o proprio tema por conta.
  }
}

type RaizDaWeb = Pick<HTMLElement, 'style' | 'setAttribute' | 'removeAttribute'>;

/**
 * Na web o Gluestack escreve os tokens como variaveis CSS e o tema escuro vive em
 * `[data-theme-id=escuro]`, que o <Theme> poe so na View dele. O `Modal` do
 * react-native-web vai para um portal em `document.body`, FORA dela: sem o
 * atributo tambem no <html> o dialogo abriria com as cores do claro. O fundo e o
 * `color-scheme` acompanham (barra de rolagem, campo nativo, sobra de rolagem).
 */
export function espelharNaWeb(
  tema: 'claro' | 'escuro',
  fundo: string,
  raiz: RaizDaWeb | undefined = typeof document === 'undefined' ? undefined : document.documentElement,
): void {
  if (!raiz) return;
  if (tema === 'escuro') raiz.setAttribute('data-theme-id', 'escuro');
  else raiz.removeAttribute('data-theme-id');
  raiz.style.setProperty('color-scheme', tema === 'escuro' ? 'dark' : 'light');
  raiz.style.setProperty('background-color', fundo);
}

/**
 * Chamado UMA vez, no App: leva o tema escolhido ao sistema e, na web, ao <html>.
 * Sem a liberacao do escuro nao faz nada — o app fica exatamente como era (claro,
 * e o sistema segue o aparelho).
 */
export function useAplicarTema(): void {
  const { tema, preferencia, cores } = useTema();

  useEffect(() => {
    if (ESCURO_LIBERADO) pedirEsquemaAoSistema(preferencia);
  }, [preferencia]);

  useEffect(() => {
    if (ESCURO_LIBERADO && Platform.OS === 'web') espelharNaWeb(tema, cores.background);
  }, [tema, cores.background]);
}
