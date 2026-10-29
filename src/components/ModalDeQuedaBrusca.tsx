import { useEffect, useState } from "react";
import { Alert, Modal, Pressable, Text, View } from "react-native";
import { ChevronsDown, LogOut, Repeat2, UserRoundX } from "lucide-react-native";

import { MoreOptionsModal } from "@components/MoreOptionsModal";
import { cronometroDaJanela, tituloDaQueda, msDoTexto } from "@domain/queda/quedaBrusca";
import { mensagemDoErro } from "@domain/erros/mensagemDoErro";
import { suddenDropService } from "@services/suddenDropService";
import { useAuthStore } from "@stores/authStore";
import { useQueueStore } from "@stores/queueStore";
import { useQuedaBruscaStore } from "@stores/quedaBruscaStore";
import { fs } from "@stores/fonteStore";
import { useTema } from "@hooks/useTema";
import { abrirMudarMinhaVez, navigateFromNotification } from "@routes/navigationRef";

/**
 * queda-brusca-aviso-popup-e-opcoes (CLI-33, DEC-128, mockup aprovado em 29/10). O aviso "Sua vez adiantou" abre este
 * popup enxuto: "Sua vez adiantou para HH:MM!", com "Ok" (aceita o horário; volta às regras normais) e "Preciso de mais
 * tempo", que leva às 4 opções (trocar de lugar, passar a vez, ir para o final da fila, sair da fila). Com janela sem multa
 * (espera nova abaixo de 1 h) o subtítulo mostra o cronômetro; sem janela, só pede a escolha. Um só na árvore (App).
 */
export function ModalDeQuedaBrusca() {
  const queda = useQuedaBruscaStore((s) => s.queda);
  const opcoes = useQuedaBruscaStore((s) => s.opcoes);
  const verOpcoes = useQuedaBruscaStore((s) => s.verOpcoes);
  const fechar = useQuedaBruscaStore((s) => s.fechar);
  const accessToken = useAuthStore((s) => s.accessToken);
  const { cores, veu } = useTema();
  const [ocupado, setOcupado] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());

  const janelaAte = queda?.janelaAte ?? null;
  useEffect(() => {
    if (!opcoes || janelaAte == null) return;
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [opcoes, janelaAte]);

  if (!queda) return null;
  const { attendanceId } = queda;

  async function ok() {
    if (!accessToken || ocupado) return;
    setOcupado(true);
    try {
      await suddenDropService.ack(attendanceId, accessToken);
      fechar();
    } catch (e) {
      Alert.alert("Sua vez adiantou", mensagemDoErro(e, "Não foi possível confirmar agora. Tente de novo."));
    } finally {
      setOcupado(false);
    }
  }

  async function precisoDeMaisTempo() {
    if (!accessToken || ocupado) return;
    setOcupado(true);
    try {
      const { data } = await suddenDropService.needTime(attendanceId, accessToken);
      setAgora(Date.now());
      verOpcoes(msDoTexto(data.window_until));
    } catch (e) {
      Alert.alert("Sua vez adiantou", mensagemDoErro(e, "Não foi possível abrir as opções agora. Tente de novo."));
    } finally {
      setOcupado(false);
    }
  }

  async function passarAVez() {
    if (!accessToken || ocupado) return;
    setOcupado(true);
    try {
      await suddenDropService.passTurn(attendanceId, accessToken);
      fechar();
      Alert.alert("Pedido enviado", "O próximo da fila precisa aceitar. Se ele não aceitar, nada muda na sua vez.");
    } catch (e) {
      Alert.alert("Passar a vez", mensagemDoErro(e, "Não foi possível passar a vez agora. Tente de novo."));
    } finally {
      setOcupado(false);
    }
  }

  function aFila(abrirTroca: boolean) {
    const fila = useQueueStore.getState().activeQueue;
    fechar();
    if (abrirTroca && fila) {
      abrirMudarMinhaVez({
        professionalId: fila.professionalId,
        establishmentId: fila.establishmentId,
        professionalName: fila.professionalName,
        establishmentName: fila.establishmentName,
      });
      return;
    }
    navigateFromNotification("fila");
  }

  if (opcoes) {
    const subtitulo = janelaAte != null ? `Decida em até ${cronometroDaJanela(janelaAte, agora)} · sem multa nesse tempo` : "Escolha o que prefere";
    return (
      <MoreOptionsModal
        visible
        title="Preciso de mais tempo"
        subtitle={subtitulo}
        onClose={fechar}
        options={[
          { key: "trocar", title: "Trocar de lugar", description: "Escolha outro horário na fila", icon: Repeat2, onPress: () => aFila(true) },
          { key: "passar", title: "Passar a vez", description: "O próximo da fila precisa aceitar", icon: UserRoundX, disabled: ocupado, onPress: passarAVez },
          { key: "final", title: "Ir para o final da fila", description: "Você entra de novo, no último lugar", icon: ChevronsDown, onPress: () => aFila(true) },
          { key: "sair", title: "Sair da fila", description: janelaAte != null ? "Sem multa dentro da janela" : "Você perde a sua vez", icon: LogOut, onPress: () => aFila(false) },
        ]}
      />
    );
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={fechar}>
      <View style={{ flex: 1, backgroundColor: veu, justifyContent: "center", paddingHorizontal: 24 }}>
        <View
          accessibilityViewIsModal
          testID="queda-brusca-popup"
          style={{ backgroundColor: cores.painel, borderRadius: 20, padding: 22, gap: 14, width: "100%", maxWidth: 420, alignSelf: "center" }}
        >
          <Text style={{ fontFamily: "Archivo_800ExtraBold", fontSize: fs(20), color: cores.textPrimary }} testID="queda-brusca-titulo">
            {tituloDaQueda(queda.horario)}
          </Text>
          <Pressable
            onPress={ok}
            disabled={ocupado}
            testID="queda-brusca-ok"
            accessibilityRole="button"
            style={{ backgroundColor: cores.green, borderRadius: 999, paddingVertical: 12, alignItems: "center", opacity: ocupado ? 0.6 : 1 }}
          >
            <Text style={{ color: cores.onGreen, fontFamily: "Inter_600SemiBold", fontSize: fs(15) }}>Ok</Text>
          </Pressable>
          <Pressable
            onPress={precisoDeMaisTempo}
            disabled={ocupado}
            testID="queda-brusca-mais-tempo"
            accessibilityRole="button"
            style={{ backgroundColor: cores.painel, borderWidth: 1, borderColor: cores.textPrimary, borderRadius: 999, paddingVertical: 12, alignItems: "center", opacity: ocupado ? 0.6 : 1 }}
          >
            <Text style={{ color: cores.textPrimary, fontFamily: "Inter_600SemiBold", fontSize: fs(15) }}>Preciso de mais tempo</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
