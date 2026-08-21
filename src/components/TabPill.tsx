import type { ReactNode } from "react";
import { View, Text } from "react-native";

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
        fontSize: 11,
        marginTop: 2,
        fontWeight: focused ? "700" : "500",
        color: focused ? TAB_ACTIVE : TAB_INACTIVE,
      }}
    >
      {children}
    </Text>
  );
}

// [marca-vupth] $forest — nao aceita token (icone `color` cru).
export const TAB_ACTIVE = "#163300";
export const TAB_INACTIVE = "#9CA3AF";

// [verde-imersivo] Sombra superior sutil da tab bar (mesclar no tabBarStyle).
export const tabBarShadow = {
  shadowColor: "#1A281A",
  shadowOffset: { width: 0, height: -4 },
  shadowOpacity: 0.06,
  shadowRadius: 14,
  elevation: 8,
};
