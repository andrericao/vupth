import { useEffect, useState, useCallback } from "react";
import { Modal, Alert } from "react-native";
import { VStack, HStack, Box, Text, Heading, Divider, Spinner } from "@gluestack-ui/themed";

import { Button } from "@components/Button";
import { cardShadow } from "@utils/styles";
import { acceptOfferText, myOfferText } from "@domain/queue/swap";
import { swapOfferService, SwapOfferResponse } from "@services/swapOfferService";
import { useAuthStore } from "@stores/authStore";

type Props = {
  visible: boolean;
  professionalId: string | null;
  onClose: () => void;
  onChanged: () => void; // troca aceita/cancelada → o pai recarrega a fila
};

// Modal da troca (C13): lista as ofertas que EU posso aceitar + as MINHAS (para
// cancelar). Abre pelo botão "Trocar" da fila. Busca fresco ao abrir.
export function SwapOffersModal({ visible, professionalId, onClose, onChanged }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [acceptable, setAcceptable] = useState<SwapOfferResponse[]>([]);
  const [mine, setMine] = useState<SwapOfferResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken || !professionalId) return;
    setLoading(true);
    try {
      const [a, m] = await Promise.all([
        swapOfferService.listAcceptable(professionalId, accessToken),
        swapOfferService.listMine(accessToken),
      ]);
      setAcceptable(a.data);
      setMine(m.data);
    } catch {
      // silencioso — o modal só mostra vazio
    } finally {
      setLoading(false);
    }
  }, [accessToken, professionalId]);

  useEffect(() => {
    // Busca fresco ao abrir. O setState (loading) roda dentro de load() — disable
    // igual ao padrão do repo (Home) p/ fetch-on-mount intencional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (visible) load();
  }, [visible, load]);

  async function accept(id: string) {
    if (!accessToken || busyId) return;
    setBusyId(id);
    try {
      await swapOfferService.accept(id, accessToken);
      Alert.alert("Troca feita! 🔄", "Sua posição na fila foi atualizada.");
      onChanged();
      onClose();
    } catch (error: any) {
      const code = error.response?.data?.code;
      Alert.alert(
        "Não foi possível aceitar",
        code === "QUEUE_SWAP_OFFER_NOT_FOUND"
          ? "Essa oferta não está mais disponível."
          : "A oferta pode ter sido aceita por outra pessoa ou expirado.",
      );
      load();
    } finally {
      setBusyId(null);
    }
  }

  async function cancel(id: string) {
    if (!accessToken || busyId) return;
    setBusyId(id);
    try {
      await swapOfferService.cancel(id, accessToken);
      onChanged();
      load();
    } catch {
      Alert.alert("Erro", "Não foi possível cancelar o pedido.");
    } finally {
      setBusyId(null);
    }
  }

  const empty = !loading && acceptable.length === 0 && mine.length === 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Box flex={1} bg="rgba(0,0,0,0.45)" justifyContent="center" px={24}>
        <VStack bg="$white" borderRadius="$2xl" p="$6" style={cardShadow}>
          <Heading fontFamily="$heading" fontSize="$lg">
            Trocar de lugar
          </Heading>

          {loading && (
            <HStack alignItems="center" gap="$2" mt="$4">
              <Spinner color="$forest" />
              <Text size="sm" color="$gray300">Carregando ofertas...</Text>
            </HStack>
          )}

          {empty && (
            <Text size="sm" color="$gray300" mt="$3">
              Nenhuma oferta de troca no momento. Publique a sua tocando em Mudar
              minha vez.
            </Text>
          )}

          {acceptable.length > 0 && (
            <VStack gap="$3" mt="$4">
              <Text size="xs" color="$gray300" fontFamily="$heading">PODE ACEITAR</Text>
              {acceptable.map((o) => (
                <Box key={o.id} bg="$gray700" borderRadius="$xl" p="$3">
                  <Text size="sm" color="$gray100">{acceptOfferText(o.direction)}</Text>
                  <Button
                    title={busyId === o.id ? "Aceitando..." : "Aceitar troca"}
                    mt="$2"
                    isDisabled={!!busyId}
                    onPress={() => accept(o.id)}
                  />
                </Box>
              ))}
            </VStack>
          )}

          {mine.length > 0 && (
            <VStack gap="$3" mt="$4">
              <Divider bg="$gray500" />
              <Text size="xs" color="$gray300" fontFamily="$heading">MEUS PEDIDOS</Text>
              {mine.map((o) => (
                <HStack key={o.id} alignItems="center" justifyContent="space-between">
                  <Text size="sm" color="$gray100" flex={1}>{myOfferText(o.direction)}</Text>
                  <Button
                    title={busyId === o.id ? "..." : "Cancelar"}
                    variant="outline"
                    isDisabled={!!busyId}
                    onPress={() => cancel(o.id)}
                  />
                </HStack>
              ))}
            </VStack>
          )}

          <Button title="Fechar" variant="outline" mt="$5" onPress={onClose} />
        </VStack>
      </Box>
    </Modal>
  );
}
