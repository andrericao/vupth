import { TouchableOpacity } from "react-native";
import { Text, VStack, HStack } from "@gluestack-ui/themed";

import { Campanha } from "@services/campaignService";
import { nomeDaCampanha, regraDoCupom } from "@domain/campanhas";

type Props = {
  cupons: Campanha[];
  escolhido: string | null;
  onEscolher: (id: string | null) => void;
};

// Na escolha do corte: usar um dos cupons ativos (um so por compra) ou nenhum.
// O toque no cupom escolhido tira. So aparece com cupom ativo.
export function EscolhaDeCupom({ cupons, escolhido, onEscolher }: Props) {
  if (cupons.length === 0) return null;
  return (
    <VStack gap="$2" testID="escolha-de-cupom">
      {/* tema-fixo: branco sobre o resumo forest da escolha, nos dois temas */}
      <Text size="sm" color="#FFFFFFB3">Usar um cupom neste corte</Text>
      {cupons.map((c) => {
        const ligado = c.id === escolhido;
        return (
          <TouchableOpacity
            key={c.id}
            onPress={() => onEscolher(ligado ? null : c.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: ligado }}
            testID={`usar-cupom-${c.id}`}
          >
            <HStack justifyContent="space-between" alignItems="center">
              <Text size="sm" color="$brandGreen" fontFamily="$heading">
                {ligado ? "✓ " : ""}{nomeDaCampanha(c)}
              </Text>
              {/* tema-fixo: branco sobre o resumo forest da escolha, nos dois temas */}
              <Text size="xs" color="#FFFFFFB3">{regraDoCupom(c)}</Text>
            </HStack>
          </TouchableOpacity>
        );
      })}
    </VStack>
  );
}
