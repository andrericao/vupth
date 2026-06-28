import { useEffect, useState } from "react";
import { Animated } from "react-native";
import { VStack, HStack } from "@gluestack-ui/themed";

import { cardShadow } from "@utils/styles";

// [verde-imersivo] Skeleton loading: placeholders com a forma do conteudo, no
// lugar dos Spinner. Pulso de opacidade (Animated nativo, sem dep extra).

const BASE = "#E2E9E5";

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
  return (
    <Animated.View
      style={{ width: w as never, height: h, borderRadius: r, backgroundColor: BASE, opacity }}
    />
  );
}

/** Um card "fantasma" com a mesma forma dos cards reais (cantos $2xl + cardShadow). */
export function SkeletonCard() {
  const opacity = usePulse();
  return (
    <VStack bg="$white" p="$4" borderRadius="$2xl" style={cardShadow} mb="$3">
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
