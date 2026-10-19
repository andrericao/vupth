import type { ReactNode } from "react";
import { View, Text } from "react-native";
import { fs } from "@stores/fonteStore";
import { useTema } from "@hooks/useTema";
import type { Cores } from "@domain/tema";

// [marca-vupth] Pilula da aba ativa: fundo greenTint atras do icone quando
// focado. Era um forest translucido (rgba) — o Pencil (Tab Bar Client v3)
// especifica o token solido $green-tint, mesmo par usado nas pilulas de
// selecao em outras telas (ex.: chip "Hoje" do relatorio no partner).
export function TabPill({ focused, children }: { focused: boolean; children: ReactNode }) {
  const { cores } = useTema();
  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: focused ? cores.greenTint : "transparent",
      }}
    >
      {children}
    </View>
  );
}

// [marca-vupth] Rotulo da aba: peso 700 ativo / 500 inativo (Pencil, mesma
// ref). tabBarLabelStyle do React Navigation e ESTATICO (nao recebe
// `focused`) — por isso o rotulo vira render function como o icone, em vez
// de tabBarLabel:"string" + estilo compartilhado.
export function TabLabel({ focused, children }: { focused: boolean; children: string }) {
  const { cores } = useTema();
  const barra = coresDaBarraDeAbas(cores);
  return (
    <Text
      style={{
        fontSize: fs(11),
        marginTop: 2,
        fontWeight: focused ? "700" : "500",
        color: focused ? barra.rotuloAtivo : barra.inativo,
      }}
    >
      {children}
    </Text>
  );
}

/**
 * As cores da barra de abas no tema. O React Navigation e o icone recebem `color`
 * cru (nao aceitam token do Gluestack), entao elas saem de `useTema().cores`.
 *
 * - `fundo`: o fundo da tela (branco no claro).
 * - `iconeAtivo`: o icone da aba ativa fica SOBRE a pilula greenTint, entao e o
 *   par dela, `onGreenTint` (forest no claro, green no escuro). `forest` fixo no
 *   escuro seria forest sobre a pilula escura.
 * - `rotuloAtivo`: o rotulo fica embaixo da pilula, sobre a barra: `textPrimary`.
 * - `inativo`: [contraste] era #9CA3AF, 2,54:1 sobre a tab bar branca: o rotulo da
 *   aba INATIVA e texto de navegacao (nao e controle desabilitado), entao vale o
 *   minimo de 4,5:1. `textSecondary` da 9,37:1 no claro e 9,68:1 no escuro, e segue
 *   mais leve que o ativo, que e quem tem de saltar.
 */
export function coresDaBarraDeAbas(cores: Cores) {
  return {
    fundo: cores.background,
    iconeAtivo: cores.onGreenTint,
    rotuloAtivo: cores.textPrimary,
    inativo: cores.textSecondary,
  };
}

/**
 * A linha que separa a barra do conteudo. No CLARO nao ha linha: a sombra da
 * barra (abaixo) ja a descola da tela. No ESCURO a sombra some contra o fundo e a
 * barra, da mesma cor da tela, ficava sem limite; entra uma linha de 1px em
 * `surfaceAlt` (1,5:1 com a tela: marca o limite sem pesar, como a sombra faz no
 * claro). `border` serviria (4,4:1), mas no escuro e um verde vivo que gritaria
 * mais que a sombra do claro. Escolha da Design, 19/10.
 */
export function divisorDaBarraDeAbas(escuro: boolean, cores: Cores) {
  return escuro
    ? { borderTopWidth: 1, borderTopColor: cores.surfaceAlt }
    : { borderTopWidth: 0, borderTopColor: "transparent" };
}

// [verde-imersivo] Sombra superior sutil da tab bar (mesclar no tabBarStyle).
export const tabBarShadow = {
  // tema-fixo: sombra forest a 6%; no escuro ela some contra o fundo, e nao carrega texto
  shadowColor: "#163300",
  shadowOffset: { width: 0, height: -4 },
  shadowOpacity: 0.06,
  shadowRadius: 14,
  elevation: 8,
};
