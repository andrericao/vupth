import { Linking, TouchableOpacity } from "react-native";
import { Text } from "@gluestack-ui/themed";

import { SUPORTE_PRECO_URL } from "@utils/suporte";
import { alertaTipado } from "@utils/alertaTipado";

// politica-de-preco-saiba-mais + saiba-mais-leva-ao-suporte (Andre, 18/10, DEC-91
// e DEC-96): o preço que o cliente vê já inclui a taxa de pagamento, que varia
// por faixa. O "Saiba mais" abre o artigo do Suporte no navegador do sistema (o
// Voltar traz de volta, DEC-63), nunca o Asaas direto.
// `color` deixa o link cair bem sobre qualquer fundo (no resumo é brandGreen
// sobre forest).
// `detalhado` (detalhes-do-pagamento, André 24/10): na escolha do corte o toque abre antes
// um aviso com o que o preço inclui e que abatimento em multa não conta em campanha, e dele
// vai ao artigo.
export const DETALHES_DO_PAGAMENTO =
  "O preço inclui a taxa de pagamento, que varia por faixa.\nAbatimentos em multas não são considerados em campanhas.";

export function SaibaMaisDoPreco({ color = "$brandTextPrimary", detalhado = false }: { color?: string; detalhado?: boolean }) {
  async function abrir() {
    try {
      await Linking.openURL(SUPORTE_PRECO_URL);
    } catch {
      // sem navegador: nada a fazer na tela
    }
  }

  function aoTocar() {
    if (!detalhado) {
      abrir();
      return;
    }
    alertaTipado("Detalhes do pagamento", DETALHES_DO_PAGAMENTO, [{ text: "Ver artigo", onPress: abrir }, { text: "Ok" }], {
      tipo: "informacao",
    });
  }

  return (
    <TouchableOpacity onPress={aoTocar} hitSlop={8} accessibilityRole="link" testID="preco-saiba-mais">
      <Text size="xs" fontWeight="$semibold" color={color} underline>
        Saiba mais
      </Text>
    </TouchableOpacity>
  );
}
