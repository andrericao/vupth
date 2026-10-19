import { Linking, Modal, Pressable, Text, View } from "react-native";

import { FEEDBACK_URL } from "@domain/feedback/feedback";
import { useFeedbackStore } from "@stores/feedbackStore";
import { useTema } from "@hooks/useTema";
import { fs } from "@stores/fonteStore";

/**
 * pedido-de-feedback (CLI-34): depois de avaliar, uma caixa pede feedback sobre
 * o app. "Enviar feedback" abre o formulario do Suporte (perfil e categoria ja
 * escolhidos). Um so na arvore (App), como o ModalDePagamento.
 */
export function ModalDeFeedback() {
  const aberto = useFeedbackStore((s) => s.aberto);
  const fechar = useFeedbackStore((s) => s.fechar);
  const enviar = useFeedbackStore((s) => s.enviar);
  const { cores, veu } = useTema();

  if (!aberto) return null;

  function abrirSuporte() {
    enviar();
    Linking.openURL(FEEDBACK_URL).catch(() => {});
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={fechar}>
      <View style={{ flex: 1, backgroundColor: veu, justifyContent: "center", paddingHorizontal: 24 }}>
        <View
          accessibilityViewIsModal
          testID="pedido-de-feedback"
          style={{ backgroundColor: cores.painel, borderRadius: 20, padding: 22, gap: 14, width: "100%", maxWidth: 420, alignSelf: "center" }}
        >
          <Text style={{ fontFamily: "Archivo_800ExtraBold", fontSize: fs(18), color: cores.textPrimary }}>Ajude a melhorar o app</Text>
          <Text style={{ color: cores.textSecondary, fontSize: fs(14), lineHeight: fs(20) }}>
            Conta pra gente como foi usar o Vupth. Leva um minuto e ajuda muito.
          </Text>
          <Pressable
            onPress={abrirSuporte}
            testID="feedback-enviar"
            accessibilityRole="button"
            style={{ backgroundColor: cores.green, borderRadius: 999, paddingVertical: 12, alignItems: "center" }}
          >
            <Text style={{ color: cores.onGreen, fontFamily: "Inter_600SemiBold", fontSize: fs(15) }}>Enviar feedback</Text>
          </Pressable>
          <Pressable
            onPress={fechar}
            testID="feedback-agora-nao"
            accessibilityRole="button"
            style={{ backgroundColor: cores.painel, borderWidth: 1, borderColor: cores.textPrimary, borderRadius: 999, paddingVertical: 12, alignItems: "center" }}
          >
            <Text style={{ color: cores.textPrimary, fontFamily: "Inter_600SemiBold", fontSize: fs(15) }}>Agora não</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
