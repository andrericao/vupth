import { TouchableOpacity, View } from "react-native";
import { Text } from "@gluestack-ui/themed";

import { useTema } from "@hooks/useTema";
import { fs } from "@stores/fonteStore";

type Props = {
  /** O pequeno de cima: o que é a campanha ("Desconto", "Ganho em dinheiro"). */
  rotulo?: string;
  /** O valor, grande e em negrito ("10%", "R$ 10,00"). */
  valor?: string;
  /** O nome da campanha. */
  nome: string;
  /** A linha de baixo: "Válido até dd/MM às HH:mm". */
  detalhe?: string;
  /** O botão da direita (Participar). Sem ele, o cartão só informa. */
  acao?: { titulo: string; onPress: () => void; testID: string };
  /** Cupom já usado ou vencido: esmaecido, com o estado no lugar do botão. */
  situacao?: string;
  onPress?: () => void;
  testID: string;
  largura?: number;
};

const RECORTE = 16;

/**
 * card-ticket-pontilhado (André, 24/10, mockup 2): o cartão de cupom e de campanha é um ticket:
 * surface, borda tracejada (border) e um picote redondo só no lado esquerdo, no meio (ticket-picote-so-na-esquerda, 24/10). Valor em negrito
 * (Archivo 800), nome, validade; o botão primário (green + onGreen) na direita. Só tokens (DEC-116),
 * claro e escuro; sem sombra.
 */
export function CartaoTicket({ rotulo, valor, nome, detalhe, acao, situacao, onPress, testID, largura }: Props) {
  const { cores } = useTema();
  const corpo = (
    <View
      style={{
        width: largura,
        backgroundColor: cores.surface,
        borderWidth: 2,
        borderStyle: "dashed",
        borderColor: cores.border,
        borderRadius: 20,
        paddingVertical: 14,
        paddingLeft: 20,
        paddingRight: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        opacity: situacao ? 0.6 : 1,
      }}
    >
      {/* o picote: o fundo da tela por cima da borda, SÓ no lado esquerdo (ticket-picote-so-na-esquerda) */}
      <View
        pointerEvents="none"
        testID={`${testID}-picote-esquerdo`}
        style={{
          position: "absolute",
          left: -RECORTE / 2 - 2,
          top: "50%",
          marginTop: -RECORTE / 2,
          width: RECORTE,
          height: RECORTE,
          borderRadius: RECORTE / 2,
          backgroundColor: cores.background,
          borderWidth: 2,
          borderStyle: "dashed",
          borderColor: cores.border,
        }}
      />
      <View style={{ flex: 1, gap: 2 }}>
        {rotulo ? (
          <Text fontFamily="$body" fontSize={fs(12)} fontWeight="$semibold" color="$brandTextSecondary">
            {rotulo}
          </Text>
        ) : null}
        {valor ? (
          <Text fontFamily="$display" fontSize={fs(28)} fontWeight="$bold" color="$brandTextPrimary" testID={`${testID}-valor`}>
            {valor}
          </Text>
        ) : null}
        <Text fontFamily="$heading" fontSize={fs(13)} fontWeight="$bold" color="$brandTextSecondary" numberOfLines={2}>
          {nome}
        </Text>
        {detalhe ? (
          <Text fontFamily="$body" fontSize={fs(12)} fontWeight="$semibold" color="$brandTextSecondary">
            {detalhe}
          </Text>
        ) : null}
      </View>
      {acao ? (
        <TouchableOpacity
          onPress={acao.onPress}
          accessibilityRole="button"
          testID={acao.testID}
          style={{ backgroundColor: cores.green, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 18 }}
        >
          <Text fontFamily="$heading" fontSize={fs(14)} fontWeight="$bold" color={cores.onGreen}>
            {acao.titulo}
          </Text>
        </TouchableOpacity>
      ) : situacao ? (
        <Text fontFamily="$heading" fontSize={fs(12)} fontWeight="$bold" color="$brandTextSecondary">
          {situacao}
        </Text>
      ) : null}
    </View>
  );
  if (!onPress) return <View testID={testID}>{corpo}</View>;
  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="button" testID={testID} activeOpacity={0.8}>
      {corpo}
    </TouchableOpacity>
  );
}
