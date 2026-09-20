import { Box, HStack, Text } from "@gluestack-ui/themed";
import { Info } from "lucide-react-native";

import { JanelaSemMulta, textoDaJanela } from "@domain/queue/janelaSemMulta";

/**
 * Faixa da janela sem multa na tela da fila (Andre, 20/09). Sutil de proposito:
 * e a mesma forma do aviso de "Fechada agora" na tela da loja — informa sem
 * interromper.
 *
 * Verde claro enquanto ha janela; ambar quando ela acaba, porque ai o estado
 * MUDOU e a cor e o que avisa sem pedir leitura.
 */
export function FaixaSemMulta({ janela }: { janela: JanelaSemMulta }) {
  const texto = textoDaJanela(janela);

  // Sem previsao nao ha o que dizer: afirmar "sem multa" ou "com multa" seriam
  // as duas mentiras possiveis aqui.
  if (!texto) return null;

  const acabou = janela.tipo === "comMulta";

  return (
    <Box
      bg={acabou ? "$brandWarning" : "$greenTint"}
      borderRadius="$card"
      px="$3.5"
      py="$2.5"
      w="$full"
      mt="$4"
      testID="faixa-sem-multa"
    >
      <HStack alignItems="center" gap="$2">
        <Info size={16} color="#163300" />
        <Text size="xs" color="$forest" flex={1}>
          {texto}
        </Text>
      </HStack>
    </Box>
  );
}
