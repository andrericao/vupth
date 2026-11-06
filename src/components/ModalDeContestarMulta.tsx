import { useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";

import { mensagemDoErro } from "@domain/erros/mensagemDoErro";
import { MOTIVO_MAX, penaltyService } from "@services/penaltyService";
import { useAuthStore } from "@stores/authStore";
import { fs } from "@stores/fonteStore";
import { useTema } from "@hooks/useTema";

interface Props {
  penaltyId: string;
  onFechar: () => void;
  /** A contestação foi aceita: a multa sai da lista (o pai recarrega). */
  onContestada: () => void;
}

/**
 * contestar-multa (André, 05/11; Backend ec0c2f3): a pessoa diz o motivo (até 300 caracteres, em até 7 dias da multa) e a
 * multa sai das pendentes e do teto de duas até o Painel decidir. Monta a cada abertura: o texto e o erro já começam limpos.
 */
export function ModalDeContestarMulta({ penaltyId, onFechar, onContestada }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { cores, veu } = useTema();
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviada, setEnviada] = useState(false);

  const vazio = motivo.trim().length === 0;

  async function enviar() {
    if (!accessToken || vazio || enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      await penaltyService.contest(penaltyId, motivo.trim(), accessToken);
      setEnviada(true);
      onContestada();
    } catch (e) {
      setErro(mensagemDoErro(e, "Não foi possível enviar a contestação agora. Tente de novo."));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onFechar}>
      <View style={{ flex: 1, backgroundColor: veu, justifyContent: "center", paddingHorizontal: 24 }}>
        <View
          accessibilityViewIsModal
          testID="contestar-multa"
          style={{ backgroundColor: cores.painel, borderRadius: 20, padding: 22, gap: 14, width: "100%", maxWidth: 420, alignSelf: "center" }}
        >
          <Text style={{ fontFamily: "Archivo_800ExtraBold", fontSize: fs(20), color: cores.textPrimary }}>Contestar multa</Text>
          {enviada ? (
            <Text testID="contestar-multa-enviada" style={{ color: cores.textPrimary, fontSize: fs(15) }}>
              Contestação enviada. A multa fica fora da sua conta até a análise.
            </Text>
          ) : (
            <>
              <Text style={{ color: cores.textSecondary, fontSize: fs(14) }}>Conte o que aconteceu. Você tem até 7 dias para contestar.</Text>
              <TextInput
                testID="contestar-multa-motivo"
                value={motivo}
                onChangeText={setMotivo}
                maxLength={MOTIVO_MAX}
                multiline
                placeholder="Motivo da contestação"
                placeholderTextColor={cores.textSecondary}
                style={{ minHeight: 96, borderWidth: 1, borderColor: cores.textSecondary, borderRadius: 12, padding: 12, color: cores.textPrimary, fontSize: fs(15), textAlignVertical: "top" }}
              />
              <Text testID="contestar-multa-contagem" style={{ color: cores.textSecondary, fontSize: fs(12), alignSelf: "flex-end" }}>
                {motivo.length}/{MOTIVO_MAX}
              </Text>
              {erro ? <Text testID="contestar-multa-erro" style={{ color: cores.textSecondary, fontSize: fs(14) }}>{erro}</Text> : null}
              <Pressable
                onPress={enviar}
                disabled={vazio || enviando}
                testID="contestar-multa-enviar"
                accessibilityRole="button"
                style={{ backgroundColor: cores.green, opacity: vazio || enviando ? 0.5 : 1, borderRadius: 999, paddingVertical: 12, alignItems: "center" }}
              >
                <Text style={{ color: cores.onGreen, fontFamily: "Inter_600SemiBold", fontSize: fs(15) }}>
                  {enviando ? "Enviando..." : "Enviar contestação"}
                </Text>
              </Pressable>
            </>
          )}
          <Pressable
            onPress={onFechar}
            testID="contestar-multa-fechar"
            accessibilityRole="button"
            style={{ backgroundColor: cores.painel, borderWidth: 1, borderColor: cores.textPrimary, borderRadius: 999, paddingVertical: 12, alignItems: "center" }}
          >
            <Text style={{ color: cores.textPrimary, fontFamily: "Inter_600SemiBold", fontSize: fs(15) }}>{enviada ? "Fechar" : "Cancelar"}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
