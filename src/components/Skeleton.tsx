import { useEffect, useState } from "react";
import { Animated } from "react-native";
import { VStack, HStack } from "@gluestack-ui/themed";
import { useTema } from "@hooks/useTema";


// [verde-imersivo] Skeleton loading: placeholders com a forma do conteudo, no
// lugar dos Spinner. Pulso de opacidade (Animated nativo, sem dep extra).

// E DECORACAO (nao carrega informacao), entao nao tem minimo de contraste —
// precisa so aparecer sobre o $brandSurface do card. No claro e o `border`; no
// escuro o `border` e um verde vivo e berraria, entao vem do papel `esqueleto`.

function usePulse() {
  const [v] = useState(() => new Animated.Value(0.45));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return v;
}

function Block({
  opacity,
  w,
  h = 12,
  r = 8,
}: {
  opacity: Animated.Value;
  w: number | string;
  h?: number;
  r?: number;
}) {
  const { cores } = useTema();
  return (
    <Animated.View
      style={{ width: w as never, height: h, borderRadius: r, backgroundColor: cores.esqueleto, opacity }}
    />
  );
}

/** Um card "fantasma" com a mesma forma dos cards reais (surface, raio 20, plano). */
export function SkeletonCard() {
  const opacity = usePulse();
  return (
    <VStack bg="$brandSurface" p="$4" borderRadius="$card" mb="$3">
      <HStack justifyContent="space-between" alignItems="center">
        <Block opacity={opacity} w="45%" h={14} />
        <Block opacity={opacity} w={64} h={22} r={999} />
      </HStack>
      <VStack mt="$3" space="sm">
        <Block opacity={opacity} w="70%" />
        <Block opacity={opacity} w="40%" />
      </VStack>
    </VStack>
  );
}

/** Lista de SkeletonCard para telas de lista/dados enquanto carrega. */
export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <VStack>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </VStack>
  );
}

/** O lugar da pilula de status (aberta/fila/espera) enquanto o dado salvo ainda nao foi confirmado (DEC-148). */
export function SkeletonPilula({ testID = "skeleton-pilula" }: { testID?: string }) {
  const opacity = usePulse();
  return (
    <VStack testID={testID} accessibilityLabel="Carregando">
      <Block opacity={opacity} w={72} h={28} r={999} />
    </VStack>
  );
}
