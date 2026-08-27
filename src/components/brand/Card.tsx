import { VStack } from "@gluestack-ui/themed";
import { ComponentProps } from "react";

/**
 * Card da marca: `$brandSurface` + raio `$card` (20) + PLANO.
 *
 * Existe porque nao existia: ate agora cada tela montava o proprio card na mao,
 * e por isso cada tela errava de um jeito — `bg="$white"` + `$2xl` + sombra era
 * o trio mais comum, e foi assim que ate um `$blue50` (cor que nao existe na
 * marca) entrou no app.
 *
 * As tres decisoes ja vem tomadas:
 * - **fundo `$brandSurface`**, nao branco. E o proprio cinza que separa o card
 *   do fundo — por isso ele nao precisa de borda nem de sombra.
 * - **raio `$card` (20)**, o do Pencil. `$2xl` (16) e `$lg` (8) sao do tema
 *   generico do gluestack, nao da marca.
 * - **sem sombra.** Ver `floatingShadow` em `@utils/styles`.
 *
 * Aceita as props do VStack (padding, gap, flex...) — o que NAO se sobrescreve
 * casualmente e `bg`/`borderRadius`; se uma tela precisa disso, provavelmente
 * quer o `hero` do `StatCard` ou um elemento que nao e card.
 */
type Props = ComponentProps<typeof VStack>;

export function BrandCard({ children, ...rest }: Props) {
  return (
    <VStack bg="$brandSurface" borderRadius="$card" p="$4" {...rest}>
      {children}
    </VStack>
  );
}
