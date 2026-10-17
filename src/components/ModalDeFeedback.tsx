import { Linking, Modal, Pressable, Text, View } from "react-native";

import { FEEDBACK_URL } from "@domain/feedback/feedback";
import { useFeedbackStore } from "@stores/feedbackStore";
import { fs } from "@stores/fonteStore";

const FOREST = "#163300";
const GREEN = "#9FE870";
const TEXT_SECONDARY = "#454745";

/**
 * pedido-de-feedback (CLI-34): depois de avaliar, uma caixa pede feedback sobre
 * o app. "Enviar feedback" abre o formulario do Suporte (perfil e categoria ja
 * escolhidos). Um so na arvore (App), como o ModalDePagamento.
 */
export function ModalDeFeedback() {
  const aberto = useFeedbackStore((s) => s.aberto);
  const fechar = useFeedbackStore((s) => s.fechar);
  const enviar = useFeedbackStore((s) => s.enviar);

  if (!aberto) return null;

  function abrirSuporte() {
    enviar();
    Linking.openURL(FEEDBACK_URL).catch(() => {});
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={fechar}>
      <View style={{ flex: 1, backgroundColor: "#16330073", justifyContent: "center", paddingHorizontal: 24 }}>
        <View
          accessibilityViewIsModal
          testID="pedido-de-feedback"
          style={{ backgroundColor: "#FFFFFF", borderRadius: 20, padding: 22, gap: 14, width: "100%", maxWidth: 420, alignSelf: "center" }}
        >
          <Text style={{ fontFamily: "Archivo_800ExtraBold", fontSize: fs(18), color: FOREST }}>Ajude a melhorar o app</Text>
          <Text style={{ color: TEXT_SECONDARY, fontSize: fs(14), lineHeight: fs(20) }}>
            Conta pra gente como foi usar o Vupth. Leva um minuto e ajuda muito.
          </Text>
          <Pressable
            onPress={abrirSuporte}
            testID="feedback-enviar"
            accessibilityRole="button"
            style={{ backgroundColor: GREEN, borderRadius: 999, paddingVertical: 12, alignItems: "center" }}
          >
            <Text style={{ color: FOREST, fontFamily: "Inter_600SemiBold", fontSize: fs(15) }}>Enviar feedback</Text>
          </Pressable>
          <Pressable
            onPress={fechar}
            testID="feedback-agora-nao"
            accessibilityRole="button"
            style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: FOREST, borderRadius: 999, paddingVertical: 12, alignItems: "center" }}
          >
            <Text style={{ color: FOREST, fontFamily: "Inter_600SemiBold", fontSize: fs(15) }}>Agora não</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
