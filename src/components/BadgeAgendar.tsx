import { Box, Text } from "@gluestack-ui/themed";

import { fs } from "@stores/fonteStore";

/**
 * O badge "AGENDAR" da loja fechada (decisao da Design, 17/10, design.html
 * #loja-fechada).
 *
 * Havia duas decisoes contraditorias: o amber do Andre (23/07) e a linha apagada
 * da Design (26/08), e o codigo seguia a segunda. A linha apagada diz "nao da
 * para nada" — e da: fechada agora, a loja aceita agendar e pedir corte. O badge
 * diz o contrario (fechada, mas com caminho), e a linha apagada ainda reprovava o
 * contraste: `opacity` derruba o nome da loja para menos de 4,5:1.
 *
 * Amber #FFB703 com texto forest, 7,98:1. Nao inverte no escuro (sobre o fundo
 * escuro o amber da 10,3:1): badge e selo, nao bloco. O accentPeach nao serve —
 * ja e o fundo de bloqueio, e loja fechada nao e bloqueio.
 *
 * E a UNICA caixa alta do app (o guia de texto proibe nos rotulos): por ser selo,
 * nao frase. O leitor de tela le "Agendar", nao as letras.
 */
export function BadgeAgendar({ testID }: { testID?: string }) {
  return (
    <Box bg="$amber500" borderRadius="$full" px={8} py={2} alignSelf="flex-start" testID={testID}>
      <Text
        fontFamily="$heading"
        fontSize={fs(12)}
        fontWeight="$bold"
        color="$forest"
        accessibilityLabel="Agendar"
      >
        AGENDAR
      </Text>
    </Box>
  );
}
