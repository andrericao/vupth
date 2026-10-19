import { HStack, Text } from "@gluestack-ui/themed";
import { Star } from "lucide-react-native";
import { ComponentProps } from "react";

import { RatingDisplay } from "@domain/establishment/rating";
import { useTema } from "@hooks/useTema";

type TextoProps = ComponentProps<typeof Text>;

/**
 * A nota da loja ou do profissional: a estrela e o numero, ou "Novo" quando ainda
 * nao ha avaliacao (nota-novo). Um desenho so para o card, a lista, a tela da loja
 * e o perfil do profissional — so mudam o tamanho e a cor do texto.
 */
export function NotaDaLoja({
  rating,
  starSize,
  gap = "$1",
  testID,
  ...texto
}: { rating: RatingDisplay; starSize: number; gap?: string | number; testID?: string } & TextoProps) {
  const { cores } = useTema();
  return (
    <HStack alignItems="center" gap={gap as never} testID={testID}>
      {rating.novo ? (
        <Text {...texto}>Novo</Text>
      ) : (
        <>
          <Star size={starSize} color={cores.textPrimary} fill={cores.textPrimary} />
          <Text {...texto}>{rating.value.toFixed(1)}</Text>
        </>
      )}
    </HStack>
  );
}
