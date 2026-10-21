import { useEffect, useState } from "react";
import { Animated, Pressable, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { Star, X } from "lucide-react-native";

import { atendimentoSemAvaliar } from "@domain/queue/reconciliar";
import { useClientAttendances } from "@hooks/useAttendances";
import { abrirAvaliacao } from "@routes/navigationRef";
import { useAuthStore } from "@stores/authStore";
import { useQueueStore } from "@stores/queueStore";
import { useRatedStore } from "@stores/ratedStore";
import { fs } from "@stores/fonteStore";
import { useEntrada } from "@utils/motion";
import { useTema } from "@hooks/useTema";

/** O ultimo atendimento cuja faixa ja apareceu (uma vez so por atendimento). */
export const FAIXA_AVALIAR_KEY = "vupth_faixa_avaliar";

/**
 * notificacao-avaliar (CLI-33, Andre 15/10): o atendimento terminou e o cliente
 * nao avaliou na hora — a faixa aparece UMA vez no topo, fechavel. Fechou (ou
 * tocou em Avaliar), nao volta: a pendencia fica so em Atendimentos, com o
 * ponto no card. Com fila no aparelho, a tela da fila ja oferece o Avaliar.
 */
export function FaixaAvaliar() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const temFila = useQueueStore((s) => !!s.activeQueue);
  const ratedIds = useRatedStore((s) => s.ids);
  const { data: history = [] } = useClientAttendances();
  const insets = useSafeAreaInsets();
  const { cores } = useTema();
  const [vista, setVista] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    SecureStore.getItemAsync(FAIXA_AVALIAR_KEY)
      .catch(() => null)
      .then((v) => setVista(v ?? null));
  }, []);

  const pendente = atendimentoSemAvaliar(history, ratedIds);
  // Antes do retorno antecipado, com a chave no atendimento: a faixa só passa a
  // existir depois de o histórico chegar, e a entrada tem de rodar então.
  const entrada = useEntrada({ dy: -12, chave: pendente?.id });
  if (!isAuthenticated || temFila || vista === undefined || !pendente || pendente.id === vista) return null;

  const marcarVista = () => {
    setVista(pendente.id);
    SecureStore.setItemAsync(FAIXA_AVALIAR_KEY, pendente.id).catch(() => {});
  };

  return (
    <Animated.View
      testID="faixa-avaliar"
      style={[
        {
        position: "absolute",
        top: insets.top + 8,
        left: 16,
        right: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: cores.greenTint,
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 14,
        elevation: 6,
        // tema-fixo: sombra preta nos dois temas; ela nao carrega texto nem sentido
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        },
        entrada,
      ]}
    >
      <Star size={18} color={cores.onGreenTint} />
      <Pressable
        style={{ flex: 1 }}
        onPress={() => {
          marcarVista();
          abrirAvaliacao(pendente.id);
        }}
        testID="faixa-avaliar-abrir"
        accessibilityRole="button"
      >
        <Text style={{ color: cores.onGreenTint, fontSize: fs(14), fontWeight: "600" }}>
          Como foi com {pendente.professionalName}?
        </Text>
        <Text style={{ color: cores.onGreenTint, fontSize: fs(13) }}>Toque para avaliar</Text>
      </Pressable>
      <Pressable onPress={marcarVista} testID="faixa-avaliar-fechar" accessibilityLabel="Fechar" hitSlop={12}>
        <X size={18} color={cores.onGreenTint} />
      </Pressable>
    </Animated.View>
  );
}
