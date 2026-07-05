import type { ReactNode } from "react";
import { View } from "react-native";

// [verde-imersivo] Pilula da aba ativa: fundo verde-claro arredondado atras do
// icone quando focado. Usado no tabBarIcon (espelha o front-partner).
export function TabPill({ focused, children }: { focused: boolean; children: ReactNode }) {
  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: focused ? "rgba(0,179,126,0.12)" : "transparent",
      }}
    >
      {children}
    </View>
  );
}

export const TAB_ACTIVE = "#2F432F";
export const TAB_INACTIVE = "#9CA3AF";

// [verde-imersivo] Sombra superior sutil da tab bar (mesclar no tabBarStyle).
export const tabBarShadow = {
  shadowColor: "#1A281A",
  shadowOffset: { width: 0, height: -4 },
  shadowOpacity: 0.06,
  shadowRadius: 14,
  elevation: 8,
};
