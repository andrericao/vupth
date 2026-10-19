import { HStack, Text } from "@gluestack-ui/themed";

import { fs } from "@stores/fonteStore";

/**
 * O selo âmbar "AGENDAR" (agendar-ambar, Andre 18/10): a loja fechada nao
 * oferece "Entrar na fila", so marcar depois — e o selo diz isso no lugar do
 * convite. Aparece no card da lista e na tela da loja.
 *
 * COR: o token `brandWarning` (#FFC091, o âmbar de aviso do app — o mesmo do
 * banner "Fechada agora") com o texto em `forest` (#163300): 8,76:1, AA com
 * folga. O app ainda so tem o tema claro; no escuro (modo-escuro, DES) o par
 * muda junto com o token, sem tocar aqui. O Partner copia: mesmo token, mesmo
 * texto, mesma pílula.
 */
export function BadgeAgendar({ pequeno = false, testID = "badge-agendar" }: { pequeno?: boolean; testID?: string }) {
  return (
    <HStack
      bg="$brandWarning"
      borderRadius="$full"
      px={pequeno ? 8 : 12}
      py={pequeno ? 2 : 6}
      alignItems="center"
      testID={testID}
    >
      <Text fontFamily="$display" fontSize={fs(pequeno ? 10 : 12)} fontWeight="$bold" color="$forest">
        AGENDAR
      </Text>
    </HStack>
  );
}
