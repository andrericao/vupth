import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Keyboard, ScrollView } from "react-native";
import { VStack, Box } from "@gluestack-ui/themed";

import { floatingShadow } from "@utils/styles";
import { useTema } from "@hooks/useTema";

type Props = {
  /** O miolo (título, texto, campos): rola quando não cabe. */
  children: ReactNode;
  /** Os botões: ficam fixos no pé da caixa e aparecem sempre, mesmo com a fonte ampliada. */
  rodape?: ReactNode;
  raio?: "card" | "hero";
  /** O vão entre os itens do miolo, em px. */
  gap?: number;
  testID?: string;
  rolagemTestID?: string;
  rodapeTestID?: string;
};

const PADDING = 24;

/**
 * modais-padding-e-rodape (André, 24/10): a caixa base de todos os modais do app. Antes cada modal
 * montava a sua e a frase sumia e o "Cancelar" ficava cortado com tela pequena ou fonte ampliada.
 * Padrão: o véu cobre a tela com 24 px de margem; a caixa tem no máximo a altura que o Modal
 * realmente tem (100% do contêiner, não 90% da janela: no Android com barras do sistema o Modal é
 * menor que a janela); só o miolo rola, com 24 px de padding; os botões ficam no rodapé, fora da
 * rolagem, com 24 px embaixo. Altura cravada nunca: o app honra o ajuste de fonte (DS4).
 *
 * reportar-problema-cancelar-cortado (André, 24/10, regressao): com o TECLADO aberto a caixa cai pela
 * metade da tela e o rodape (Enviar e Cancelar) tomava o lugar do campo. Com o teclado aberto o layout
 * fica compacto: a caixa sobe para o topo, o padding encolhe (24 para 16 no miolo, 12 no rodape) e o
 * toque no campo nao fecha o teclado nem os botoes. O campo de texto tem a propria altura minima.
 */
function useTecladoAberto(): boolean {
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    const mostrar = Keyboard.addListener("keyboardDidShow", () => setAberto(true));
    const esconder = Keyboard.addListener("keyboardDidHide", () => setAberto(false));
    return () => {
      mostrar.remove();
      esconder.remove();
    };
  }, []);
  return aberto;
}

export function CaixaDeModal({ children, rodape, raio = "card", gap = 0, testID = "caixa-de-modal", rolagemTestID, rodapeTestID }: Props) {
  const { veu } = useTema();
  const teclado = useTecladoAberto();
  const miolo = teclado ? 16 : PADDING;
  return (
    <Box flex={1} bg={veu} justifyContent={teclado ? "flex-start" : "center"} px={PADDING} py={teclado ? 12 : PADDING} testID={`${testID}-veu`}>
      <VStack bg="$painel" borderRadius={raio === "hero" ? "$hero" : "$card"} style={[floatingShadow, { maxHeight: "100%" }]} testID={testID}>
        <ScrollView
          style={{ flexShrink: 1 }}
          contentContainerStyle={{ padding: miolo, paddingBottom: rodape ? 8 : miolo, gap }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          testID={rolagemTestID ?? `${testID}-rolagem`}
        >
          {children}
        </ScrollView>
        {rodape ? (
          <Box px={PADDING} pt={teclado ? "$2" : "$3"} pb={teclado ? 12 : PADDING} testID={rodapeTestID ?? `${testID}-rodape`}>
            {rodape}
          </Box>
        ) : null}
      </VStack>
    </Box>
  );
}
