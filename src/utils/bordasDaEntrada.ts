import { Platform, StatusBar } from "react-native";

// Bateria de 09/10 23:42 (01.01, no aparelho): na primeira abertura as insets
// chegam ZERADAS na tela de entrada, com o app de ponta a ponta — o painel de cima
// nasce colado na barra de status e o "Entrar" cai atras da barra de
// navegacao. Nas abas, depois, elas vem certas. Rodape fixo e initialMetrics
// nao bastaram; no Android, um piso: a barra de status do proprio sistema
// (StatusBar.currentHeight) e a barra de 3 botoes (48dp, a mais alta).
export const PISO_BARRA_DE_NAVEGACAO = 48;

export function bordasDaEntrada(insets: { top: number; bottom: number }) {
  if (Platform.OS !== "android") return { top: insets.top, bottom: insets.bottom };
  return {
    top: Math.max(insets.top, StatusBar.currentHeight ?? 0),
    bottom: Math.max(insets.bottom, PISO_BARRA_DE_NAVEGACAO),
  };
}
