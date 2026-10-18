import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';

import type { Cores } from '@domain/tema';

/**
 * O tema do React Navigation: e ele que pinta o fundo atras das telas. No claro
 * e EXATAMENTE o de antes (o padrao dele com o fundo da marca); so o escuro troca
 * tambem cartao, texto e borda, que o navegador desenharia com o cinza dele.
 */
export function temaDeNavegacao(
  escuro: boolean,
  cores: Pick<Cores, 'background' | 'surface' | 'textPrimary' | 'border'>,
): Theme {
  const base = escuro ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      background: cores.background,
      ...(escuro ? { card: cores.surface, text: cores.textPrimary, border: cores.border } : {}),
    },
  };
}
