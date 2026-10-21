import { Linking, TouchableOpacity } from "react-native";
import { Text } from "@gluestack-ui/themed";

import { SUPORTE_PRECO_URL } from "@utils/suporte";

// politica-de-preco-saiba-mais + saiba-mais-leva-ao-suporte (Andre, 18/10, DEC-91
// e DEC-96): o preço que o cliente vê já inclui a taxa de pagamento, que varia
// por faixa. O "Saiba mais" abre o artigo do Suporte no navegador do sistema (o
// Voltar traz de volta, DEC-63), nunca o Asaas direto.
// `color` deixa o link cair bem sobre qualquer fundo (no resumo é brandGreen
// sobre forest).
export function SaibaMaisDoPreco({ color = "$brandTextPrimary" }: { color?: string }) {
  async function abrir() {
    try {
      await Linking.openURL(SUPORTE_PRECO_URL);
    } catch {
      // sem navegador: nada a fazer na tela
    }
  }

  return (
    <TouchableOpacity onPress={abrir} hitSlop={8} accessibilityRole="link" testID="preco-saiba-mais">
      <Text size="xs" fontWeight="$semibold" color={color} underline>
        Saiba mais
      </Text>
    </TouchableOpacity>
  );
}
