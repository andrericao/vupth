import { TouchableOpacity } from "react-native";
import { HStack, Text } from "@gluestack-ui/themed";
import { RefreshCw } from "lucide-react-native";

import { ehNavegador } from "@utils/ehNavegador";
import { useTema } from "@hooks/useTema";
import { fs } from "@stores/fonteStore";

// Puxar para atualizar (RefreshControl) nao existe no navegador: com mouse nao
// ha gesto, e onde o navegador tem gesto proprio ele recarrega a pagina inteira
// em vez de chamar o app (teste de 08/09). E a terceira API nativa inerte no
// web, depois do SecureStore e do Alert. No navegador, o gatilho vira um botao
// visivel; no app, nada muda.
export function AtualizarNoNavegador({
  atualizando,
  onPress,
}: {
  atualizando: boolean;
  onPress: () => void;
}) {
  const { cores } = useTema();
  if (!ehNavegador()) return null;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={atualizando}
      accessibilityRole="button"
      testID="web-refresh"
    >
      <HStack
        bg="$brandSurface"
        borderRadius="$full"
        px={16}
        py={10}
        gap="$2"
        alignItems="center"
        opacity={atualizando ? 0.6 : 1}
      >
        <RefreshCw size={15} color={cores.textPrimary} />
        <Text fontFamily="$heading" fontSize={fs(13)} color="$brandTextPrimary">
          {atualizando ? "Atualizando..." : "Atualizar"}
        </Text>
      </HStack>
    </TouchableOpacity>
  );
}
