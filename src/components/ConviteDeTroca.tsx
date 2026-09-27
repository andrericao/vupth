import { useEffect, useRef, useState } from "react";
import { Alert, Animated, Easing, Modal, Pressable, Text, View } from "react-native";
import { X } from "lucide-react-native";

import { DURACAO_DO_CONVITE_MS, textoDoConvite } from "@domain/queue/conviteDeTroca";
import { swapOfferService } from "@services/swapOfferService";
import { useAuthStore } from "@stores/authStore";
import { useConviteDeTrocaStore } from "@stores/conviteDeTrocaStore";

const FOREST = "#163300";
const GREEN = "#9FE870";
const TEXT_SECONDARY = "#454745";

/**
 * Os 5 segundos à vista (Andre, 26/09: "algo visual que demonstre os 5 segundos
 * sendo contados, pode ser uma barra esvaziando"). Linear, do cheio ao vazio, no
 * mesmo tempo em que o convite fecha sozinho.
 */
export function BarraDoTempo({ duracaoMs, chave }: { duracaoMs: number; chave: string }) {
  const [resto] = useState(() => new Animated.Value(1));
  useEffect(() => {
    resto.setValue(1);
    const anim = Animated.timing(resto, {
      toValue: 0,
      duration: duracaoMs,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [chave, duracaoMs, resto]);
  const largura = resto.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
  return (
    <View
      testID="convite-tempo"
      accessibilityLabel="Tempo para aceitar"
      style={{ height: 6, borderRadius: 3, backgroundColor: "#16330014", overflow: "hidden" }}
    >
      <Animated.View style={{ height: 6, width: largura, backgroundColor: FOREST, borderRadius: 3 }} />
    </View>
  );
}

/**
 * O convite de troca na tela (D16, Andre 24/09): aparece por 5 segundos, com
 * "Aceitar"; fecha pelo X, pelo voltar do Android e por um toque fora. Mesmo
 * desenho do DialogoVupth, para nao parecer outro app. Depois dos 5 s a
 * oferta continua disponivel na tela da fila.
 */
export function ConviteDeTroca() {
  const atual = useConviteDeTrocaStore((s) => s.atual);
  const fechar = useConviteDeTrocaStore((s) => s.fechar);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [aceitando, setAceitando] = useState(false);
  const aceitandoRef = useRef(false);

  // Some sozinho em 5 s — a nao ser que a pessoa ja tenha tocado em Aceitar.
  useEffect(() => {
    if (!atual) return;
    const t = setTimeout(() => {
      if (!aceitandoRef.current) fechar();
    }, DURACAO_DO_CONVITE_MS);
    return () => clearTimeout(t);
  }, [atual, fechar]);

  if (!atual) return null;
  const texto = textoDoConvite(atual.direction);

  async function aceitar() {
    if (!accessToken || aceitandoRef.current || !atual) return;
    aceitandoRef.current = true;
    setAceitando(true);
    try {
      await swapOfferService.accept(atual.id, accessToken);
      fechar();
      Alert.alert("Troca feita", "Sua posição na fila foi atualizada.");
    } catch (error: any) {
      fechar();
      Alert.alert(
        "Não foi possível aceitar",
        error?.response?.data?.code === "QUEUE_SWAP_OFFER_NOT_FOUND"
          ? "Essa oferta não está mais disponível."
          : "A oferta pode ter sido aceita por outra pessoa ou expirado.",
      );
    } finally {
      aceitandoRef.current = false;
      setAceitando(false);
    }
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={fechar}>
      {/* Toque fora fecha: o convite e oferta, nao pergunta obrigatoria. */}
      <Pressable
        testID="convite-fundo"
        onPress={fechar}
        style={{
          flex: 1,
          backgroundColor: "#16330073",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
      >
        <Pressable
          // Toque DENTRO do cartao nao fecha.
          onPress={() => {}}
          accessibilityViewIsModal
          accessibilityLabel={texto.titulo}
          testID="convite-de-troca"
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 20,
            padding: 22,
            gap: 16,
            width: "100%",
            maxWidth: 420,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
            <Text
              style={{
                flex: 1,
                fontFamily: "Archivo_800ExtraBold",
                fontSize: 22,
                letterSpacing: -0.4,
                color: FOREST,
              }}
            >
              {texto.titulo}
            </Text>
            <Pressable
              onPress={fechar}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              testID="convite-fechar"
            >
              <X size={20} color={FOREST} />
            </Pressable>
          </View>
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 18, lineHeight: 24, color: TEXT_SECONDARY }}>
            {texto.mensagem}
          </Text>
          <BarraDoTempo duracaoMs={DURACAO_DO_CONVITE_MS} chave={atual.id} />
          <Pressable
            onPress={aceitar}
            disabled={aceitando}
            accessibilityRole="button"
            testID="convite-aceitar"
            style={{
              minHeight: 50,
              borderRadius: 999,
              backgroundColor: GREEN,
              alignItems: "center",
              justifyContent: "center",
              opacity: aceitando ? 0.6 : 1,
            }}
          >
            <Text style={{ fontFamily: "Archivo_700Bold", fontSize: 20, color: FOREST }}>
              {aceitando ? "Aceitando..." : "Aceitar"}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
