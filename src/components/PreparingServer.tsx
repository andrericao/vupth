import { useEffect, useState } from "react";
import { Animated, AccessibilityInfo, Easing } from "react-native";
import { Center, Text, VStack, HStack } from "@gluestack-ui/themed";
import { Smartphone, Store, Scissors, Footprints } from "lucide-react-native";
import { fs } from "@stores/fonteStore";

// Tela do portão de readiness / cold start (Pencil CLIENT · 23 Preparando
// Servidor). Enquanto o backend acorda (Render Free, ~50s), seguramos o app
// aqui: icone num badge redondo $greenTint/$forest, titulo grande por passo,
// legenda fixa e pontos de progresso — sequencia de RAPIDEZ (abrir app ->
// chegar na loja -> na cadeira -> sair sem fila). Mantem a animacao de
// transicao (fade+scale+shift) e o respeito a reduce-motion do design
// anterior; so o TRATAMENTO visual mudou pro do Pencil.
//
// ⚠️ Ver historico: um selo de marca solto (ladrilho verde cheio) JA foi
// testado nesta tela e revertido (Andre, 2026-08-06: "o começo ficou
// horrível"). Por isso o fundo aqui continua claro/neutro — o verde entra só
// no badge pequeno do icone, nunca como fundo cheio da tela.

// [marca-vupth] So "Chegando na loja" (Store) e literal do Pencil (CLIENT ·
// 23 Preparando Servidor, unico icone do mockup estatico) — os outros 3
// passos sao uma sequencia propria do app (a tela anima entre eles; um
// mockup estatico so mostra um passo por vez) escolhidos pra manter a
// mesma linguagem "objeto concreto" do original em phosphor.
const STEPS = [
  { Icon: Smartphone, title: "Abrindo o app" },
  { Icon: Store, title: "Chegando na loja" },
  { Icon: Scissors, title: "Na cadeira" },
  { Icon: Footprints, title: "Pronto, sem fila" },
];

const ICON_MS = 800;

function Dots({ activeIndex }: { activeIndex: number }) {
  return (
    <HStack space="sm" alignItems="center">
      {STEPS.map((_, i) => {
        const active = i === activeIndex;
        return (
          <Center
            key={i}
            width={active ? 10 : 7}
            height={active ? 10 : 7}
            borderRadius="$full"
            bg={active ? "$brandGreen" : "$brandBorder"}
          />
        );
      })}
    </HStack>
  );
}

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
    <VStack alignItems="center" space="lg">
      <Animated.View style={{ opacity, transform: [{ scale }, { translateX: shiftX }] }}>
        <Center width={88} height={88} borderRadius="$full" bg="$greenTint">
          <Step size={38} color="#163300" />
        </Center>
      </Animated.View>
      <VStack space="xs" alignItems="center">
        <Text fontFamily="$display" fontSize={fs(20)} letterSpacing={-0.4} color="$forest">
          {STEPS[index].title}
        </Text>
        <Text
          fontFamily="$body"
          fontSize="$xs"
          color="$brandTextSecondary"
          textAlign="center"
          w={260}
        >
          Preparando servidor — na primeira vez pode levar até ~50s.
        </Text>
      </VStack>
      <Dots activeIndex={index} />
    </VStack>
  );
}

export function PreparingServer() {
  return (
    <Center flex={1} bg="$brandBackground" px={24}>
      <WarmupAnimation />
    </Center>
  );
}
