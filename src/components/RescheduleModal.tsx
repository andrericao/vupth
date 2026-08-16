import { useState } from "react";
import { Modal, TextInput } from "react-native";
import { VStack, HStack, Box, Text, Heading } from "@gluestack-ui/themed";
import { Clock, Warning } from "phosphor-react-native";

import { Button } from "@components/Button";
import { cardShadow } from "@utils/styles";
import {
  buildTargetFromTime,
  validateRescheduleTime,
  formatClockTime,
  CANCELLATION_PENALTY_VALUE,
} from "@domain/queue/types";

type Props = {
  visible: boolean;
  // Piso/dia de referência (ms) — estável, calculado fora do render (fim da fila hoje).
  baseMs: number;
  // ETA (ms) do último da fila hoje, quando conhecido, só para exibir a dica.
  tailEtaMs: number | null;
  // Se o cliente vaga o lugar com < 1h, avisa a multa antes de confirmar.
  penalty: boolean;
  loading: boolean;
  onConfirm: (targetIso: string) => void;
  onClose: () => void;
};

const onlyDigits = (s: string) => s.replace(/\D/g, "").slice(0, 2);

// Item 16 — "Agendar": o cliente DIGITA o horário desejado (sem sugestões). A
// validação de fechamento/refeição é autoritativa no backend; aqui cobrimos o
// básico (formato + após o fim da fila). Seletor em JS puro (OTA-safe).
export function RescheduleModal({ visible, baseMs, tailEtaMs, penalty, loading, onConfirm, onClose }: Props) {
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setHour("");
    setMinute("");
    setError(null);
  }
  function close() {
    reset();
    onClose();
  }
  function handleConfirm() {
    const h = parseInt(hour, 10);
    const m = parseInt(minute, 10);
    const target = buildTargetFromTime(baseMs, h, m);
    const err = validateRescheduleTime(h, m, target, baseMs);
    if (err) {
      setError(err);
      return;
    }
    reset();
    onConfirm(new Date(target).toISOString());
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Box flex={1} bg="rgba(0,0,0,0.45)" justifyContent="center" px={24}>
        <VStack bg="$white" borderRadius="$2xl" p="$6" style={cardShadow}>
          <Heading fontFamily="$heading" fontSize="$lg">
            Agendar minha vez
          </Heading>

          {tailEtaMs != null && (
            <HStack alignItems="center" gap="$1" mt="$1">
              <Clock size={16} color="#6B7280" />
              <Text size="sm" color="$gray300">
                A fila hoje deve ir até {formatClockTime(new Date(tailEtaMs))}
              </Text>
            </HStack>
          )}
          <Text size="xs" color="$gray300" mt="$2">
            Digite a que horas você quer ser atendido. É uma estimativa e pode variar. Precisa estar
            dentro do horário de funcionamento; se cair em um intervalo, você será atendido após ele.
          </Text>

          {penalty && (
            <HStack alignItems="center" gap="$2" mt="$4" bg="$red100" borderRadius="$xl" px="$3" py="$2">
              <Warning size={18} color="#B3261E" />
              <Text size="xs" color="$brandDanger" flex={1}>
                Você está perto de ser atendido. Reagendar agora gera multa de R$ {CANCELLATION_PENALTY_VALUE},00 no
                seu próximo atendimento.
              </Text>
            </HStack>
          )}

          <HStack alignItems="center" justifyContent="center" gap="$2" mt="$5">
            <Box borderWidth="$1" borderColor="$coolGray300" borderRadius="$xl" px="$4" py="$2">
              <TextInput
                placeholder="HH"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                value={hour}
                onChangeText={(t) => setHour(onlyDigits(t))}
                style={{ fontSize: 24, minWidth: 44, textAlign: "center", color: "#111827" }}
              />
            </Box>
            <Text fontFamily="$heading" fontSize="$2xl">:</Text>
            <Box borderWidth="$1" borderColor="$coolGray300" borderRadius="$xl" px="$4" py="$2">
              <TextInput
                placeholder="MM"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                value={minute}
                onChangeText={(t) => setMinute(onlyDigits(t))}
                style={{ fontSize: 24, minWidth: 44, textAlign: "center", color: "#111827" }}
              />
            </Box>
          </HStack>

          {error && (
            <Text size="xs" color="$brandDanger" mt="$3" textAlign="center">
              {error}
            </Text>
          )}

          <Button title="Agendar" mt="$5" isLoading={loading} onPress={handleConfirm} />
          <Button title="Cancelar" variant="outline" mt="$3" isDisabled={loading} onPress={close} />
        </VStack>
      </Box>
    </Modal>
  );
}
