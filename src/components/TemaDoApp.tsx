import { useEffect, type ReactNode } from 'react';
import { Theme } from '@gluestack-style/react';

import { useAplicarTema } from '@hooks/useAplicarTema';
import { useTema } from '@hooks/useTema';
import { useTemaStore } from '@stores/temaStore';

/**
 * Poe o app no tema de cores escolhido. O Gluestack v1 resolve cada token por
 * TEMA: dentro de `<Theme name="escuro">` um `bg="$brandSurface"` vale a surface
 * do escuro (config.themes.escuro), e fora dele a do claro. Trocar de tema e
 * trocar o `name`: nada remonta, e a tela em que a pessoa estava continua.
 *
 * O wrapper existe nos DOIS temas (o nome `claro` nao tem entrada em
 * `config.themes`, entao nao muda nada): se ele so aparecesse no escuro, ligar o
 * escuro trocaria a arvore e remontaria o app inteiro.
 *
 * Tambem le a escolha guardada no aparelho (uma vez) e leva o tema ao sistema.
 * O padrao e claro: ate a leitura terminar, e depois dela sem nada guardado, o
 * app e o de sempre. O primeiro quadro leva o tempo de uma leitura local; a
 * abertura do app espera o backend, entao a escolha ja chegou quando a primeira
 * tela aparece.
 */
export function TemaDoApp({ children }: { children: ReactNode }) {
  const { escuro } = useTema();
  const restaurar = useTemaStore((s) => s.restaurar);
  useEffect(() => {
    restaurar();
  }, [restaurar]);
  useAplicarTema();
  return (
    <Theme name={escuro ? 'escuro' : 'claro'} style={{ flex: 1 }}>
      {children}
    </Theme>
  );
}

/** A barra de status do tema: icones escuros no claro, claros no escuro. */
export function useBarraDeStatus(): { style: 'light' | 'dark'; fundo: string } {
  const { escuro, cores } = useTema();
  return { style: escuro ? 'light' : 'dark', fundo: cores.background };
}
