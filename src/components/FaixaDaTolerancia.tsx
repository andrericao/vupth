import { useEffect, useState } from "react";
import { Box, HStack, Text } from "@gluestack-ui/themed";
import { Info } from "lucide-react-native";

import { formatClockTime } from "@domain/queue/types";

/**
 * A faixa da tolerancia — D13/D15 (Andre, 24/09): enquanto ela vale, uma faixa
 * diz que existe e ate que horas vai, SEM PRECO, como o "cancelamento gratis
 * ate HH:MM" do Uber. Some sozinha quando o horario passa.
 *
 * So aparece com o horario vindo do SERVIDOR (`toleranceUntil`): e ele que
 * cobra, e uma janela calculada aqui poderia prometer o que ele nao honra.
 */
export function FaixaDaTolerancia({ ate }: { ate: number | null | undefined }) {
  const [dentro, setDentro] = useState(() => !!ate && ate > Date.now());

  useEffect(() => {
    if (!ate) return;
    const falta = ate - Date.now();
    if (falta <= 0) return;
    const t = setTimeout(() => setDentro(false), falta);
    return () => clearTimeout(t);
  }, [ate]);

  if (!ate || !dentro) return null;

  // Fundo branco (`$brandBackground`), nao o forest translucido: a faixa vive
  // na tela verde da fila (Aguardando), e o #1633001A sobre o brandGreen saia
  // da mesma cor da tela — nao se via a faixa (contraste-sair-sem-custo).
  return (
    <Box bg="$brandBackground" borderRadius="$card" px="$3.5" py="$2.5" mx={16} mb="$2" testID="faixa-da-tolerancia">
      <HStack alignItems="center" gap="$2">
        <Info size={16} color="#163300" />
        <Text size="xs" color="$forest" flex={1}>
          Você pode sair da fila sem custo até {formatClockTime(new Date(ate))}.
        </Text>
      </HStack>
    </Box>
  );
}
