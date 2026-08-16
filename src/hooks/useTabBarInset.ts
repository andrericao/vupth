import { useContext } from "react";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";

/**
 * Altura da faixa que a tab bar ocupa na base da tela (ja soma o inset inferior
 * do device, ver tabBarStyle em @routes/auth.routes). Telas que vivem dentro do
 * bottom-tabs precisam reservar esse espaco no padding de baixo, senao o CTA
 * nasce por baixo da barra e o toque nao chega nele.
 *
 * Preferimos o contexto ao inves de useBottomTabBarHeight(): o hook do
 * react-navigation lanca erro quando a tela e renderizada fora do navegador de
 * abas (testes isolados, previews), enquanto aqui a ausencia vira 0.
 */
export function useTabBarInset() {
  return useContext(BottomTabBarHeightContext) ?? 0;
}
