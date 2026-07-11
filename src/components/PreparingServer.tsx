import { useEffect, useState } from "react";
import { Animated, AccessibilityInfo, Easing } from "react-native";
import { Center, Text, VStack } from "@gluestack-ui/themed";
import {
  DeviceMobile,
  Storefront,
  Scissors,
  PersonSimpleWalk,
} from "phosphor-react-native";

// Tela do portão de readiness / cold start. Enquanto o backend acorda (Render
// Free, ~50s), seguramos o app aqui. No lugar do spinner, a animação de ABERTURA
// (marca): sequência que remete a RAPIDEZ — abrir app -> chegar na loja -> na
// cadeira -> sair sem fila. Espelha o front-partner (ServerWarmup/WarmupAnimation).
// Respeita reduce-motion. Futuro: trocar por Lottie quando o design entregar o JSON.

const GREEN = "#3B7A3F";

const STEPS = [
  { Icon: DeviceMobile, label: "Abrindo o app" },
  { Icon: Storefront, label: "Chegando na loja" },
  { Icon: Scissors, label: "Na cadeira" },
  { Icon: PersonSimpleWalk, label: "Pronto, sem fila" },
];

const ICON_MS = 800;

function WarmupAnimation() {
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  // Animated.Value via useState (init lazy) — evita ler ref.current no render.
  const [opacity] = useState(() => new Animated.Value(0));
  const [scale] = useState(() => new Animated.Value(0.6));
  const [shiftX] = useState(() => new Animated.Value(-6));

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => sub?.remove?.();
  }, []);

  // Avança os ícones; com motion roda a saída (encolhe+some) antes de trocar.
  useEffect(() => {
    let cancelled = false;
    const id = setInterval(() => {
      if (cancelled) return;
      if (reduceMotion) {
        setIndex((i) => (i + 1) % STEPS.length);
        return;
      }
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.6, duration: 220, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished && !cancelled) setIndex((i) => (i + 1) % STEPS.length);
      });
    }, ICON_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [reduceMotion, opacity, scale]);

  // Entrada do ícone atual (fade + scale + micro-deslocamento "avançar").
  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      scale.setValue(1);
      shiftX.setValue(0);
      return;
    }
    opacity.setValue(0);
    scale.setValue(0.6);
    shiftX.setValue(-6);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true }),
      Animated.timing(shiftX, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, reduceMotion, opacity, scale, shiftX]);

  const Step = STEPS[index].Icon;

  return (
    <VStack alignItems="center" space="md">
      <Animated.View style={{ opacity, transform: [{ scale }, { translateX: shiftX }] }}>
        <Step size={56} color={GREEN} weight="fill" />
      </Animated.View>
      <Text size="sm" color="$gray300">
        {STEPS[index].label}
      </Text>
    </VStack>
  );
}

export function PreparingServer() {
  return (
    <Center flex={1} bg="$gray700" px={24}>
      <VStack space="xl" alignItems="center">
        <WarmupAnimation />
        <Text size="xs" color="$gray400" textAlign="center">
          Preparando servidor — na primeira vez pode levar até ~50s.
        </Text>
      </VStack>
    </Center>
  );
}
