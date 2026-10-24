import { Switch } from "react-native";
import { Text, VStack, HStack } from "@gluestack-ui/themed";

import { Campanha } from "@services/campaignService";
import { nomeDaCampanha, regraDoCupom } from "@domain/campanhas";
import { useTema } from "@hooks/useTema";

type Props = {
  cupons: Campanha[];
  escolhido: string | null;
  onEscolher: (id: string | null) => void;
};

// Na escolha do corte: "usar cupom", um toggle por cupom ativo (um so por compra, ligar
// um desliga o outro), logo abaixo do card verde do resumo (cupom-abate-no-resumo,
// André 24/10). So aparece com cupom ativo.
export function EscolhaDeCupom({ cupons, escolhido, onEscolher }: Props) {
  const { cores } = useTema();
  if (cupons.length === 0) return null;
  return (
    <VStack gap="$2" mt="$3" testID="escolha-de-cupom">
      {cupons.map((c) => {
        const ligado = c.id === escolhido;
        return (
          <HStack
            key={c.id}
            bg="$brandSurface"
            borderRadius="$card"
            px={16}
            py={12}
            alignItems="center"
            justifyContent="space-between"
            gap="$3"
          >
            <VStack flex={1}>
              <Text size="sm" fontFamily="$heading" color="$brandTextPrimary">
                Usar cupom
              </Text>
              <Text size="xs" color="$brandTextSecondary">
                {[nomeDaCampanha(c), regraDoCupom(c)].filter(Boolean).join(" · ")}
              </Text>
            </VStack>
            {/* trilho { false: border, true: green }; a bolinha branca e tema-fixo (Design DS7) */}
            <Switch
              value={ligado}
              onValueChange={(v) => onEscolher(v ? c.id : null)}
              trackColor={{ false: cores.border, true: cores.green }}
              thumbColor={THUMB}
              accessibilityRole="switch"
              accessibilityLabel={`Usar cupom ${nomeDaCampanha(c)}`}
              testID={`usar-cupom-${c.id}`}
            />
          </HStack>
        );
      })}
    </VStack>
  );
}

// tema-fixo: a bolinha do interruptor e branca nos dois temas
const THUMB = "#FFFFFF";
