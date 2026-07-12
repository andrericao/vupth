import { useState } from "react";
import { Modal, Alert } from "react-native";
import { VStack, HStack, Box, Text, Heading } from "@gluestack-ui/themed";
import { Clock } from "phosphor-react-native";

import { Button } from "@components/Button";
import { cardShadow } from "@utils/styles";
import { formatClockTime } from "@domain/queue/types";
import { notifyComingSoon } from "@domain/comingSoon";
import { useComingSoonStore } from "@stores/comingSoonStore";

type Props = {
  visible: boolean;
  // ETA (ms) do fim da fila hoje (o último cliente), quando conhecido.
  tailEtaMs: number | null;
  // Cliente já é o último da fila? (não faz sentido "ir para o fim").
  isLast: boolean;
  onMoveToEnd: () => void; // ser o último da fila
  onReschedule: () => void; // agendar para depois
  onClose: () => void;
};

// "Mudar minha vez" (consolida remanejar + troca). O cliente escolhe a DIREÇÃO:
// adiantar (só via troca — depende de outro aceitar, em breve) ou atrasar
// (trocar / ser o último / agendar). A oferta de troca aberta aguarda o backend.
export function ChangeTurnModal({ visible, tailEtaMs, isLast, onMoveToEnd, onReschedule, onClose }: Props) {
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
              <Button
                title="Adiantar minha vez"
                mt="$5"
                onPress={() => {
                  void useComingSoonStore.getState().tap("trocar_posicao");
                  setStep("adiantar");
                }}
              />
              <Button title="Atrasar minha vez" variant="outline" mt="$3" onPress={() => setStep("atrasar")} />
              <Button title="Cancelar" variant="outline" mt="$3" onPress={close} />
            </>
          )}

          {step === "adiantar" && (
            <>
              <Heading fontFamily="$heading" fontSize="$lg">
                Adiantar minha vez
              </Heading>
              <Text size="sm" color="$gray300" mt="$2">
                Para adiantar, outro cliente à sua frente precisa aceitar trocar com você. Esse
                recurso chega em breve.
              </Text>
              <Button title="Voltar" variant="outline" mt="$5" onPress={() => setStep("root")} />
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
                title="Trocar com alguém (em breve)"
                variant="outline"
                mt="$3"
                onPress={() => notifyComingSoon("trocar_posicao")}
              />
              <Button title="Voltar" variant="outline" mt="$3" onPress={() => setStep("root")} />
            </>
          )}
        </VStack>
      </Box>
    </Modal>
  );
}
