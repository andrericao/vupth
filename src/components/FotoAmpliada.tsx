import { Modal, Pressable } from "react-native";
import { Image } from "expo-image";
import { X } from "lucide-react-native";

/**
 * A foto em tela cheia (Andre, 26/09: "quando com foto deve haver a opcao de
 * clicar para ver com zoom, tanto o profissional quanto o estabelecimento").
 * Toque em qualquer lugar, no X ou no voltar do Android fecha.
 */
export function FotoAmpliada({ uri, onClose }: { uri: string | null; onClose: () => void }) {
  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        testID="foto-ampliada"
        accessibilityLabel="Fechar a foto"
        style={{ flex: 1, backgroundColor: "#000000E6", alignItems: "center", justifyContent: "center" }}
      >
        {uri && (
          <Image source={{ uri }} contentFit="contain" cachePolicy="memory-disk" style={{ width: "100%", height: "80%" }} testID="foto-ampliada-imagem" />
        )}
        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          style={{ position: "absolute", top: 48, right: 20 }}
        >
          <X size={26} color="#FFFFFF" />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
