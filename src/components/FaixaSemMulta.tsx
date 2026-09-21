import { Box, HStack, Text } from "@gluestack-ui/themed";
import { Info } from "lucide-react-native";

import { JanelaSemMulta, textoDaJanela } from "@domain/queue/janelaSemMulta";

/**
 * Faixa da janela sem multa na tela da fila (Andre, 20/09). Sutil de proposito:
 * e a mesma forma do aviso de "Fechada agora" na tela da loja — informa sem
 * interromper.
 *
 * Enquanto ha janela a faixa e discreta; quando ela acaba vira ambar, porque ai
 * o estado MUDOU e a cor e o que avisa sem pedir leitura.
 *
 * `ground="marca"` e a tela da fila, que e verde cheia: ali o `$greenTint`
 * sumiria no fundo, entao a faixa e um forest TRANSLUCIDO — a mesma solucao do
 * resto daquela tela.
 */
export function FaixaSemMulta({
  janela,
  ground = "claro",
}: {
  janela: JanelaSemMulta;
  ground?: "claro" | "marca";
}) {
  const texto = textoDaJanela(janela);

  // Sem previsao nao ha o que dizer: afirmar "sem multa" ou "com multa" seriam
  // as duas mentiras possiveis aqui.
  if (!texto) return null;

  const acabou = janela.tipo === "comMulta";

  return (
    <Box
      bg={acabou ? "$brandWarning" : ground === "marca" ? "#1633001A" : "$greenTint"}
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
