import { createContext, useContext, useEffect, useState } from "react";
import { NavigationContext } from "@react-navigation/native";

// Um mock do navegador pode nao exportar o NavigationContext: o useContext precisa de um contexto de verdade.
const EMPTY_CONTEXT = createContext<undefined>(undefined);

/**
 * estudo-desempenho (DEC-145/146, proposta 4): `true` enquanto a tela dona do hook esta em foco.
 * Numa pilha de navegacao a tela que ficou para tras segue montada e, sem isto, seguia fazendo polling
 * (a fila, o historico, as intencoes) sem ninguem olhar. Fora de um navegador (testes, componentes soltos)
 * nao ha contexto: fica `true`, como sempre foi. Nao use em hook que serve ao app todo (o convite de troca e
 * o pedido de corte rodam no App e precisam seguir puxando com qualquer tela).
 */
export function useTelaEmFoco(): boolean {
  const navegacao = useContext(NavigationContext ?? EMPTY_CONTEXT);
  const [emFoco, setEmFoco] = useState(() => (navegacao ? navegacao.isFocused() : true));
  useEffect(() => {
    if (!navegacao) return undefined;
    const aoFocar = navegacao.addListener("focus", () => setEmFoco(true));
    const aoSair = navegacao.addListener("blur", () => setEmFoco(false));
    return () => {
      aoFocar();
      aoSair();
    };
  }, [navegacao]);
  return emFoco;
}
