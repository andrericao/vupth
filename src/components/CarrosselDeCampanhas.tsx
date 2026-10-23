import { ScrollView, TouchableOpacity, useWindowDimensions } from "react-native";
import { Box, Text, VStack } from "@gluestack-ui/themed";

import { Campanha } from "@services/campaignService";
import { detalhesDaCampanha } from "@domain/campanha/detalhes";
import { alertaTipado } from "@utils/alertaTipado";
import { fs } from "@stores/fonteStore";

type Props = { campanhas: Campanha[] };

// Bloco da Home que so existe quando ha campanha criada no Painel; com mais de
// uma, rola de lado. O titulo e o nome que o Andre da a campanha. O toque abre
// os detalhes (cupom e compartilhar ganham destino proprio depois).
export function CarrosselDeCampanhas({ campanhas }: Props) {
  const { width } = useWindowDimensions();
  if (campanhas.length === 0) return null;
  const unica = campanhas.length === 1;
  const largura = unica ? width - 32 : Math.min(width - 64, 320);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={unica ? undefined : largura + 10}
      decelerationRate="fast"
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, gap: 10 }}
      testID="campanhas-da-home"
    >
      {campanhas.map((c) => (
        <TouchableOpacity
          key={c.id}
          onPress={() =>
            alertaTipado(c.name ?? "Campanha", detalhesDaCampanha(c) || undefined, [{ text: "Fechar" }], {
              tipo: "informacao",
            })
          }
          style={{ width: largura }}
          accessibilityRole="button"
          testID={`campanha-${c.id}`}
        >
          <VStack bg="$brandSurface" borderRadius={18} p={14} gap={4}>
            <Text fontFamily="$display" fontSize={fs(15)} fontWeight="$bold" color="$brandTextPrimary">
              {c.name}
            </Text>
            {c.benefit ? (
              <Text fontFamily="$body" fontSize={fs(13)} color="$brandTextSecondary" numberOfLines={2}>
                {c.benefit}
              </Text>
            ) : (
              <Box />
            )}
          </VStack>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
