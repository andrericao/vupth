import { useState } from "react";
import { Modal, Alert } from "react-native";
import { VStack, HStack, Box, Text, Heading } from "@gluestack-ui/themed";
import { Clock } from "phosphor-react-native";

import { Button } from "@components/Button";
import { cardShadow } from "@utils/styles";
import { formatClockTime } from "@domain/queue/types";
import { SwapOfferDirection } from "@services/swapOfferService";

type Props = {
  visible: boolean;
  // ETA (ms) do fim da fila hoje (o último cliente), quando conhecido.
  tailEtaMs: number | null;
  // Cliente já é o último da fila? (não faz sentido "ir para o fim").
  isLast: boolean;
  swapBusy?: boolean; // publicando a oferta de troca
  onMoveToEnd: () => void; // ser o último da fila
  onReschedule: () => void; // agendar para depois
  onCreateSwapOffer: (direction: SwapOfferDirection) => void; // publica oferta de troca
  onClose: () => void;
};

// "Mudar minha vez" (consolida remanejar + troca). O cliente escolhe a DIREÇÃO:
// adiantar (publica oferta EARLIER p/ quem está à frente) ou atrasar (trocar =
// oferta LATER p/ quem está atrás / ser o último / agendar). Troca = /swap-offers
// (backend fatia 1), nunca gera multa.
export function ChangeTurnModal({ visible, tailEtaMs, isLast, swapBusy, onMoveToEnd, onReschedule, onCreateSwapOffer, onClose }: Props) {
  const [step, setStep] = useState<"root" | "adiantar" | "atrasar">("root");

  function close() {
    setStep("root");
    onClose();
  }
  function goMoveToEnd() {
    // Já é o último: não permite, só avisa.
    if (isLast) {
      Alert.alert("Você já é o último", "Você já está no fim da fila de espera.");
      return;
    }
    setStep("root");
    onMoveToEnd();
  }
  function goReschedule() {
    setStep("root");
    onReschedule();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Box flex={1} bg="rgba(0,0,0,0.45)" justifyContent="center" px={24}>
        <VStack bg="$white" borderRadius="$2xl" p="$6" style={cardShadow}>
          {step === "root" && (
            <>
              <Heading fontFamily="$heading" fontSize="$lg">
                Mudar minha vez
              </Heading>
              <Text size="sm" color="$gray300" mt="$1">
                Você quer ser atendido antes ou depois?
              </Text>
              <Button title="Adiantar" mt="$5" onPress={() => setStep("adiantar")} />
              <Button title="Atrasar" variant="outline" mt="$3" onPress={() => setStep("atrasar")} />
              <Button title="Cancelar" variant="outline" mt="$3" onPress={close} />
            </>
          )}

          {step === "adiantar" && (
            <>
              <Heading fontFamily="$heading" fontSize="$lg">
                Adiantar minha vez
              </Heading>
              <Text size="sm" color="$gray300" mt="$2">
                Publicamos seu pedido para quem está à sua frente. Se alguém aceitar,
                vocês trocam de lugar — sem custo. Você pode cancelar quando quiser.
              </Text>
              <Button
                title={swapBusy ? "Publicando..." : "Publicar pedido"}
                mt="$5"
                isDisabled={swapBusy}
                onPress={() => onCreateSwapOffer("EARLIER")}
              />
              <Button title="Voltar" variant="outline" mt="$3" onPress={() => setStep("root")} />
            </>
          )}

          {step === "atrasar" && (
            <>
              <Heading fontFamily="$heading" fontSize="$lg">
                Atrasar minha vez
              </Heading>
              {tailEtaMs != null && (
                <Box
                  bg="$amber100"
                  borderRadius="$xl"
                  borderWidth="$1"
                  borderColor="$amber500"
                  px="$4"
                  py="$3"
                  mt="$3"
                >
                  <HStack alignItems="center" gap="$2">
                    <Clock size={18} color="#B45309" />
                    <Text fontFamily="$heading" size="md" color="$amber800">
                      A fila hoje termina às {formatClockTime(new Date(tailEtaMs))}
                    </Text>
                  </HStack>
                  <Text size="xs" color="$gray300" mt="$1">
                    Use como referência: ir para o fim te deixa após esse horário; ou agende para depois dele.
                  </Text>
                </Box>
              )}
              <Button title="Ir para o fim da fila" mt="$5" onPress={goMoveToEnd} />
              <Button title="Agendar para depois" variant="outline" mt="$3" onPress={goReschedule} />
              <Button
                title={swapBusy ? "Publicando..." : "Trocar com alguém atrás"}
                variant="outline"
                mt="$3"
                isDisabled={swapBusy}
                onPress={() => onCreateSwapOffer("LATER")}
              />
              <Button title="Voltar" variant="outline" mt="$3" onPress={() => setStep("root")} />
            </>
          )}
        </VStack>
      </Box>
    </Modal>
  );
}
