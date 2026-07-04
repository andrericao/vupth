import { Modal, TouchableOpacity, ScrollView } from "react-native";
import { VStack, HStack, Box, Text, Heading } from "@gluestack-ui/themed";
import { Clock, Warning } from "phosphor-react-native";

import { Button } from "@components/Button";
import { cardShadow } from "@utils/styles";
import { generateTimeSlots, formatClockTime, CANCELLATION_PENALTY_VALUE } from "@domain/queue/types";

type Props = {
  visible: boolean;
  // Piso (ms) a partir do qual gerar os horários — estável, calculado fora do render.
  baseMs: number;
  // ETA (ms) do último da fila hoje, quando conhecido, só para exibir a dica.
  tailEtaMs: number | null;
  // Se o cliente vaga o lugar com < 1h, avisa a multa antes de confirmar.
  penalty: boolean;
  loading: boolean;
  onConfirm: (targetIso: string) => void;
  onClose: () => void;
};

const SLOT_COUNT = 12; // 6h de opções em passos de 30 min

// Item 16 — "Escolher um horário": mostra até quando a fila vai hoje e oferece
// horários reais a partir daí. O alvo oscila (vira intenção de fila), por isso o
// aviso "pode variar". Seletor em JS puro (sem picker nativo) para ir via OTA.
export function RescheduleModal({ visible, baseMs, tailEtaMs, penalty, loading, onConfirm, onClose }: Props) {
  const slots = generateTimeSlots(baseMs, SLOT_COUNT);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Box flex={1} bg="rgba(0,0,0,0.45)" justifyContent="center" px={24}>
        <VStack bg="$white" borderRadius="$2xl" p="$6" style={cardShadow}>
          <Heading fontFamily="$heading" fontSize="$lg">
            Escolher um horário
          </Heading>

          {tailEtaMs != null && (
            <HStack alignItems="center" gap="$1" mt="$1">
              <Clock size={16} color="#6B7280" />
              <Text size="sm" color="$gray300">
                A fila hoje deve ir até ~{formatClockTime(new Date(tailEtaMs))}
              </Text>
            </HStack>
          )}
          <Text size="xs" color="$gray300" mt="$2">
            Escolha por volta de que horas quer ser atendido. O horário é uma estimativa e pode variar.
          </Text>

          {penalty && (
            <HStack
              alignItems="center"
              gap="$2"
              mt="$4"
              bg="$red100"
              borderRadius="$xl"
              px="$3"
              py="$2"
            >
              <Warning size={18} color="#E63946" />
              <Text size="xs" color="$red600" flex={1}>
                Você está perto de ser atendido. Reagendar agora gera multa de R$ {CANCELLATION_PENALTY_VALUE},00 no
                seu próximo atendimento.
              </Text>
            </HStack>
          )}

          <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
            <VStack gap="$2" mt="$4">
              {slots.map((slot) => (
                <TouchableOpacity
                  key={slot.ms}
                  disabled={loading}
                  onPress={() => onConfirm(new Date(slot.ms).toISOString())}
                >
                  <Box
                    borderWidth="$1"
                    borderColor="$green500"
                    borderRadius="$xl"
                    px="$4"
                    py="$3"
                    alignItems="center"
                  >
                    <Text fontFamily="$heading" fontSize="$md" color="$green600">
                      {slot.label}
                    </Text>
                  </Box>
                </TouchableOpacity>
              ))}
            </VStack>
          </ScrollView>

          <Button title="Cancelar" variant="outline" mt="$5" isDisabled={loading} onPress={onClose} />
        </VStack>
      </Box>
    </Modal>
  );
}
