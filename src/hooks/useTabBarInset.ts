import { useContext } from "react";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";

/**
 * Altura da faixa que a tab bar ocupa na base da tela (ja soma o inset inferior
 * do device, ver tabBarStyle em @routes/auth.routes). As telas de auth vivem
 * dentro do HomeStack, que roda dentro do Tab.Navigator: sem reservar esse
 * espaco no padding de baixo, o CTA nasce POR BAIXO da barra e o toque nem
 * chega nele.
 *
 * Preferimos o CONTEXTO ao inves de useBottomTabBarHeight(): o hook do
 * react-navigation lanca erro quando a tela e renderizada fora do navegador de
 * abas (teste isolado, preview), enquanto aqui a ausencia vira 0.
 */
export function useTabBarInset() {
  return useContext(BottomTabBarHeightContext) ?? 0;
}
