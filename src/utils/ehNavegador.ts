import { Platform } from "react-native";

// Em funcao, e nao lido direto na tela, para o teste poder simular o navegador
// sem trocar o Platform.OS inteiro — isso derruba o Gluestack na renderizacao.
export function ehNavegador(): boolean {
  return Platform.OS === "web";
}
