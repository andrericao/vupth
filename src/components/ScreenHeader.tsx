import { TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { VStack, HStack, Text, Center } from "@gluestack-ui/themed";
import { CaretLeft } from "phosphor-react-native";

type Props = {
  /** Titulo grande da tela. Sai em CAIXA ALTA, como no Pencil. */
  title: string;
  subtitle?: string;
  /** Acao no canto direito (ex.: "Agora nao"). */
  action?: React.ReactNode;
  /** Sobrescreve o voltar padrao (`goBack`). */
  onBack?: () => void;
};

/**
 * Cabecalho padrao das telas internas: voltar em circulo greenTint, titulo
 * grande em Archivo e subtitulo opcional.
 *
 * Existe porque o mesmo bloco estava sendo reescrito em cada tela do redesenho
 * — e ja tinha divergido (tamanhos de titulo e paddings ligeiramente
 * diferentes entre telas irmas). Aqui o padrao fica num lugar so.
 */
export function ScreenHeader({ title, subtitle, action, onBack }: Props) {
  const navigation = useNavigation();

  return (
    <VStack px={20} pt={56} gap="$2">
      <HStack justifyContent="space-between" alignItems="center">
        <TouchableOpacity
          onPress={onBack ?? (() => navigation.goBack())}
          testID="back-button"
        >
          <Center width={40} height={40} borderRadius="$full" bg="$greenTint">
            <CaretLeft size={20} color="#163300" weight="bold" />
          </Center>
        </TouchableOpacity>
        {action}
      </HStack>

      <VStack gap="$1.5" mt="$3">
        <Text
          fontFamily="$display"
          fontSize={28}
          lineHeight={30}
          letterSpacing={-1.2}
          color="$forest"
        >
          {title}
        </Text>
        {subtitle && (
          <Text size="md" color="$brandTextSecondary">
            {subtitle}
          </Text>
        )}
      </VStack>
    </VStack>
  );
}
