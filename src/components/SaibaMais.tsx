import { TouchableOpacity } from "react-native";
import { Text } from "@gluestack-ui/themed";

import { abrirArtigo, type Artigo } from "@utils/artigosDoSuporte";

// O "Saiba mais" dos cartoes do app (design-modais.html: link sublinhado,
// text-xs/700, so quando ha regra por tras; abre o artigo do suporte no
// navegador do sistema, e o Voltar traz de volta — DEC-63). Os avisos do
// sistema (Alert) nao tem onde por um link: para eles existe `alertaComArtigo`.
export function SaibaMais({
  artigo,
  testID = "saiba-mais",
  color = "$forest",
}: {
  artigo: Artigo;
  testID?: string;
  color?: string;
}) {
  return (
    <TouchableOpacity
      onPress={() => void abrirArtigo(artigo)}
      hitSlop={8}
      accessibilityRole="link"
      testID={testID}
      style={{ alignSelf: "flex-start" }}
    >
      <Text size="xs" fontWeight="$bold" color={color} underline>
        Saiba mais
      </Text>
    </TouchableOpacity>
  );
}
