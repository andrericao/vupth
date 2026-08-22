import { Modal } from "react-native";
import { VStack, HStack, Box, Text, Heading, Badge, BadgeText, ScrollView } from "@gluestack-ui/themed";

import { Button } from "@components/Button";
import { floatingShadow } from "@utils/styles";
import { ClientAttendance } from "@services/attendanceService";
import { formatClockTime } from "@domain/queue/types";

const STATUS: Record<string, { label: string; color: string }> = {
  FINISHED: { label: "Concluído", color: "#3B7A3F" },
  CANCELLED: { label: "Cancelado", color: "#E63946" },
  LATE: { label: "Atrasado", color: "#F59E0B" },
  IN_PROGRESS: { label: "Em atendimento", color: "#3B7A3F" },
  SCHEDULED: { label: "Aguardando", color: "#F59E0B" },
};

function dateOnly(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
}

function timeOnly(iso: string | null): string {
  if (!iso) return "—";
  try {
    return formatClockTime(new Date(iso));
  } catch {
    return "—";
  }
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <HStack w="$full" justifyContent="space-between" mb="$2" alignItems="flex-start">
      <Text size="sm" color="$brandTextSecondary">{label}</Text>
      <Text size="sm" fontFamily="$heading" flex={1} textAlign="right" ml="$3">
        {value}
      </Text>
    </HStack>
  );
}

type Props = {
  attendance: ClientAttendance | null;
  onClose: () => void;
  onRate: () => void;
  // false quando o atendimento já foi avaliado (esconde o "Avaliar").
  canRate?: boolean;
};

// Detalhes de um atendimento (quem atendeu, quando, serviços, duração, valor) +
// opção de avaliar (quando FINISHED e ainda não avaliado).
export function AttendanceDetailModal({ attendance, onClose, onRate, canRate = true }: Props) {
  const a = attendance;
  const st = a ? STATUS[a.status] ?? { label: a.status, color: "#9CA3AF" } : null;

  return (
    <Modal visible={!!a} transparent animationType="fade" onRequestClose={onClose}>
      <Box flex={1} bg="rgba(0,0,0,0.45)" justifyContent="center" px={24}>
        {a && st && (
          <VStack bg="$white" borderRadius="$card" p="$6" style={floatingShadow} maxHeight="80%">
            <HStack justifyContent="space-between" alignItems="center" mb="$4">
              <Heading fontFamily="$heading" fontSize="$lg" flex={1}>
                Detalhes do atendimento
              </Heading>
              <Badge bg={st.color} borderRadius="$full" px="$3" py="$1">
                <BadgeText color="$white" size="xs">{st.label}</BadgeText>
              </Badge>
            </HStack>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Row label="Profissional" value={a.professionalName} />
              <Row
                label="Serviços"
                value={a.services.map((s) => s.customName).join(", ") || "—"}
              />
              <Row label="Dia" value={dateOnly(a.startTime ?? a.scheduledTime)} />
              <Row label="Início" value={timeOnly(a.startTime ?? a.scheduledTime)} />
              {a.endTime ? <Row label="Término" value={timeOnly(a.endTime)} /> : null}
              {a.durationInMinutes != null ? (
                <Row label="Duração" value={`${a.durationInMinutes} min`} />
              ) : null}
              <Row label="Valor" value={`R$ ${a.totalValue.toFixed(2)}`} />
            </ScrollView>

            {a.status === "FINISHED" && canRate && (
              <Button title="Avaliar atendimento" mt="$5" onPress={onRate} />
            )}
            <Button title="Fechar" variant="outline" mt="$3" onPress={onClose} />
          </VStack>
        )}
      </Box>
    </Modal>
  );
}
