import { useEffect, useState } from "react";
import { Animated, Easing, View } from "react-native";

// Abertura do app enquanto o portão de readiness (PRD_BACKEND 18c) espera o
// backend. Tela da marca, sem citar servidor, API ou demora
// (abertura-profissional, Andre 15/10: "temos que ser profissional").
//
// abertura-v-pulsando (CLI-2, Andre 17/10): sem spinner nem pontos — o V sem
// fundo pulsa de leve e devagar, igual ao do Partner (ServerWarmup: mesma
// duração, ritmo e curva), só com as cores invertidas: fundo verde da marca
// (o do splash, `assets/splash.png`) e V branco (`assets/logo-v-branco.png`,
// o V do Partner com o desenho todo em branco).
//
// ⚠️ O fundo é o MESMO do splash nativo de propósito: a passagem do splash
// para esta tela não pisca.

const PULSO_MS = 1100; // meia volta: some de leve e volta, devagar
const VERDE_DA_MARCA = "#2E432F";
const LOGO_V = require("../../assets/logo-v-branco.png");

function usePulso() {
  const [valor] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const ida = { duration: PULSO_MS, easing: Easing.inOut(Easing.ease), useNativeDriver: true };
    const laco = Animated.loop(
      Animated.sequence([
        Animated.timing(valor, { ...ida, toValue: 1 }),
        Animated.timing(valor, { ...ida, toValue: 0 }),
      ])
    );
    laco.start();
    return () => laco.stop();
  }, [valor]);
  return {
    opacity: valor.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] }),
    transform: [{ scale: valor.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] }) }],
  };
}

export function PreparingServer() {
  const pulso = usePulso();
  return (
    <View
      testID="abertura"
      accessibilityLabel="Carregando"
      style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: VERDE_DA_MARCA }}
    >
      <Animated.Image
        source={LOGO_V}
        resizeMode="contain"
        testID="abertura-v-pulsando"
        style={[{ width: 96, height: 80 }, pulso]}
      />
    </View>
  );
}
