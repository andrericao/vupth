import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { useTemaStore } from '@stores/temaStore';
import { ESCURO_LIBERADO } from '@theme/liberacao';
import {
  coresDoTema,
  resolverTema,
  veuDoTema,
  type Cores,
  type Preferencia,
  type Tema,
} from '@domain/tema';

export type TemaAtual = {
  /** O tema que vale agora (ja resolvido: `automatico` virou claro ou escuro). */
  tema: Tema;
  escuro: boolean;
  /** O que a pessoa escolheu em Aparencia. */
  preferencia: Preferencia;
  /** Os hex do tema, para o que o codigo escreve em prop: icone, borda de style. */
  cores: Cores;
  /** Veu atras de modal. */
  veu: string;
};

/**
 * O tema do app. Cor que passa pelo Gluestack (`bg="$brandSurface"`) acompanha o
 * tema sozinha; cor escrita em prop (`color="#163300"` num icone) NAO: ela vem
 * daqui — `const { cores } = useTema(); <Icon color={cores.textPrimary} />`.
 * Hex solto num icone e como o escuro ficaria com um icone forest sobre forest.
 */
export function useTema(): TemaAtual {
  const guardada = useTemaStore((s) => s.preferencia);
  // Escuro nao liberado: o que estiver guardado nao vale. Quem escolheu o
  // escuro numa versao que o liberava nao fica preso nele se a liberacao cair.
  const preferencia = ESCURO_LIBERADO ? guardada : 'claro';
  const sistema = useColorScheme();
  const tema = resolverTema(preferencia, sistema);
  return useMemo(
    () => ({
      tema,
      escuro: tema === 'escuro',
      preferencia,
      cores: coresDoTema(tema),
      veu: veuDoTema(tema),
    }),
    [tema, preferencia],
  );
}
