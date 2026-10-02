import type { ReactNode } from "react";
import { View, Text } from "react-native";
import { fs } from "@stores/fonteStore";

// [marca-vupth] Pilula da aba ativa: fundo greenTint atras do icone quando
// focado. Era um forest translucido (rgba) — o Pencil (Tab Bar Client v3)
// especifica o token solido $green-tint, mesmo par usado nas pilulas de
// selecao em outras telas (ex.: chip "Hoje" do relatorio no partner).
export function TabPill({ focused, children }: { focused: boolean; children: ReactNode }) {
  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: focused ? "#E2F6D5" : "transparent",
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
  return (
    <Text
      style={{
        fontSize: fs(11),
        marginTop: 2,
        fontWeight: focused ? "700" : "500",
        color: focused ? TAB_ACTIVE : TAB_INACTIVE,
      }}
    >
      {children}
    </Text>
  );
}

// [marca-vupth] $forest / $brandTextSecondary — nao aceitam token (o React
// Navigation e o icone recebem `color` cru).
export const TAB_ACTIVE = "#163300";
// [contraste] Era #9CA3AF, 2,54:1 sobre a tab bar branca: o rotulo da aba
// INATIVA e texto de navegacao (nao e controle desabilitado), entao vale o
// minimo de 4,5:1. brandTextSecondary da 9,37:1 e segue mais leve que o forest
// da aba ativa, que e quem tem de saltar.
export const TAB_INACTIVE = "#454745";

// [verde-imersivo] Sombra superior sutil da tab bar (mesclar no tabBarStyle).
export const tabBarShadow = {
  shadowColor: "#163300",
  shadowOffset: { width: 0, height: -4 },
  shadowOpacity: 0.06,
  shadowRadius: 14,
  elevation: 8,
};
