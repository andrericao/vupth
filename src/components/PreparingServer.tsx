import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, useWindowDimensions } from "react-native";
import { EASE, MS, movimentoReduzido } from "@utils/motion";

// Abertura do app enquanto o portão de readiness (PRD_BACKEND 18c) espera o
// backend. Tela da marca, sem citar servidor, API ou demora
// (abertura-profissional, Andre 15/10: "temos que ser profissional").
//
// abertura-v-pulsando (CLI-2, Andre 17/10): sem spinner nem pontos — o V sem
// fundo pulsa de leve e devagar, igual ao do Partner, só com as cores
// invertidas: fundo verde da marca (o do splash, `assets/splash.png`) e V
// branco (`assets/logo-v-branco.png`).
//
// ⚠️ O fundo é o MESMO do splash nativo de propósito, e o V também tem o
// MESMO tamanho: a passagem do splash para esta tela não pode piscar. Em
// 18/10 ela piscava de dois jeitos: o V encolhia de 140 pt (o do splash) para
// 96 pt de uma vez, e o pulso escurecia o V até 55% de opacidade a cada ciclo.
// O pulso agora vai só de 1 a 0,92, e a saída tira o V inteiro de cena.

const VERDE_DA_MARCA = "#2E432F";
const LOGO_V = require("../../assets/logo-v-branco.png");
const PROPORCAO_DO_LOGO = 256 / 306;

// O splash nativo é o `splash.png` de 1284x2778 com `resizeMode: contain`, e o V
// nele mede 460 px de largura (medido no PNG). A escala do `contain` é a menor
// das duas razões; para qualquer celular em pé é a da largura.
const SPLASH = { largura: 1284, altura: 2778, larguraDoV: 460 };

export function tamanhoDoV(larguraDaTela: number, alturaDaTela: number) {
  const escala = Math.min(larguraDaTela / SPLASH.largura, alturaDaTela / SPLASH.altura);
  const width = Math.round(SPLASH.larguraDoV * escala);
  return { width, height: Math.round(width * PROPORCAO_DO_LOGO) };
}

type Props = {
  /** Fonte carregada e backend de pé: o V sai e `onSaiu` avisa que a tela já pode ser tirada. */
  pronto?: boolean;
  onSaiu?: () => void;
};

export function PreparingServer({ pronto = false, onSaiu }: Props) {
  const { width, height } = useWindowDimensions();
  const v = tamanhoDoV(width, height);
  const [pulso] = useState(() => new Animated.Value(0));
  const [saida] = useState(() => new Animated.Value(0));
  const [saindo, setSaindo] = useState(false);
  const laco = useRef<Animated.CompositeAnimation | null>(null);
  const vivo = useRef(true);
  const aoSair = useRef(onSaiu);

  // O callback é lido na hora de sair, não na de montar: quem passa uma função
  // nova a cada render não pode fazer a saída avisar a antiga.
  useEffect(() => {
    aoSair.current = onSaiu;
  }, [onSaiu]);

  useEffect(() => {
    vivo.current = true;
    // O V já está na tela no primeiro quadro (é o do splash); o pulso só começa
    // depois de saber se a pessoa pediu para reduzir o movimento.
    movimentoReduzido().then((reduzido) => {
      if (!vivo.current || reduzido) return;
      const meia = { duration: MS.pulso, easing: Easing.inOut(Easing.ease), useNativeDriver: true };
      laco.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulso, { ...meia, toValue: 1 }),
          Animated.timing(pulso, { ...meia, toValue: 0 }),
        ])
      );
      laco.current.start();
    });
    return () => {
      vivo.current = false;
      laco.current?.stop();
    };
  }, [pulso]);

  useEffect(() => {
    if (!pronto) return;
    // O servidor pode responder antes de o pulso ter começado: a saída cancela
    // o laço, em vez de esperar um ciclo que ninguém vai ver.
    movimentoReduzido().then((reduzido) => {
      if (!vivo.current) return;
      laco.current?.stop();
      if (reduzido) {
        aoSair.current?.();
        return;
      }
      setSaindo(true);
      Animated.timing(saida, { toValue: 1, duration: MS.saida, easing: EASE.saida, useNativeDriver: true }).start(
        ({ finished }) => {
          if (finished && vivo.current) aoSair.current?.();
        }
      );
    });
  }, [pronto, saida]);

  return (
    <Animated.View
      testID="abertura"
      accessibilityLabel="Carregando"
      style={[
        StyleSheet.absoluteFill,
        {
          // Enquanto sai, o toque atravessa: a Home já está montada embaixo.
          pointerEvents: saindo ? "none" : "auto",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: VERDE_DA_MARCA,
          opacity: saida.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
        },
      ]}
    >
      <Animated.View
        style={{
          transform: [{ translateX: saida.interpolate({ inputRange: [0, 1], outputRange: [0, -(width / 2 + v.width)] }) }],
          opacity: saida.interpolate({ inputRange: [0, 0.8], outputRange: [1, 0], extrapolate: "clamp" }),
        }}
      >
        <Animated.View
          testID="abertura-v-pulsando"
          style={[
            v,
            {
              opacity: pulso.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] }),
              transform: [{ scale: pulso.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }) }],
            },
          ]}
        >
          <Animated.Image source={LOGO_V} resizeMode="contain" style={v} />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}
