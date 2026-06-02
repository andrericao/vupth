import { useState } from "react";
import { Alert } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { VStack, Box, Text, Heading, Center, HStack } from "@gluestack-ui/themed";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { Header } from "@components/Header";
import { Button } from "@components/Button";
import { canCancelAttendance, formatWaitTime } from "@domain/queue/types";
import { useEstablishment, useProfessionalsWithQueue } from "@hooks/useEstablishments";
import { useAuthStore } from "@stores/authStore";
import { useQueueStore } from "@stores/queueStore";
import { attendanceService } from "@services/attendanceService";
import { useQueueCountdown } from "@hooks/useQueueCountdown";

type RouteParams = {
  professionalId: string;
  establishmentId: string;
};

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Aguardando",
  IN_PROGRESS: "Em atendimento",
  PAUSED: "Pausado",
  FINISHED: "Concluído",
  CANCELLED: "Cancelado",
};

export function QueueStatus() {
  const route = useRoute();
  const navigation = useNavigation<AppNavigatorRoutesProps>();
  const { professionalId, establishmentId } = route.params as RouteParams;

  const { data: establishment } = useEstablishment(establishmentId);
  const { data: professionals = [] } = useProfessionalsWithQueue(establishmentId);
  const accessToken = useAuthStore((s) => s.accessToken);
  const leaveQueue = useQueueStore((s) => s.leaveQueue);
  const { remaining, color, isInQueue, isBeingAttended, activeQueue } = useQueueCountdown();

  const professional = professionals.find((p) => p.id === professionalId);
  const [attendanceId] = useState<string | null>(activeQueue?.attendanceId ?? null);

  const status = activeQueue?.status ?? "SCHEDULED";
  const canCancel = canCancelAttendance(status);

  const borderColor = isInQueue ? color : "#22C55E";
  const timeColor = isInQueue ? color : "#22C55E";
  const timeLabel = remaining <= 0 && isInQueue
    ? "Aguardando chamada"
    : formatWaitTime(remaining);

  function handleCancel() {
    Alert.alert(
      "Cancelar atendimento",
      "Tem certeza que deseja sair da fila?",
      [
        { text: "Não", style: "cancel" },
        {
          text: "Sim, sair",
          style: "destructive",
          onPress: async () => {
            try {
              if (attendanceId && accessToken) {
                await attendanceService.cancel(attendanceId, accessToken);
              }
            } catch {}
            await leaveQueue();
            navigation.navigate("home");
          },
        },
      ]
    );
  }

  return (
    <VStack flex={1} px={15} pt={60} pb={30} bg="$gray700">
      <Header />

      <Center flex={1}>
        <Heading fontFamily="$heading" fontSize="$2xl" textAlign="center">
          {isBeingAttended ? "Em atendimento!" : "Você está na fila!"}
        </Heading>

        <Box
          bg="$white"
          p="$6"
          mt="$6"
          borderRadius="$xl"
          borderWidth="$2"
          borderColor={borderColor}
          w="$full"
          alignItems="center"
        >
          <Text size="sm" color="$gray300">Sua posição</Text>
          <Heading
            fontFamily="$heading"
            fontSize="$6xl"
            color={borderColor}
            testID="queue-position"
          >
            {isBeingAttended ? "—" : "0º"}
          </Heading>

          <Box w="$full" h="$px" bg="$gray500" my="$4" />

          <HStack w="$full" justifyContent="space-between" mb="$3">
            <Text size="sm" color="$gray300">Estabelecimento</Text>
            <Text size="sm" fontFamily="$heading">
              {establishment?.name ?? activeQueue?.establishmentName ?? "..."}
            </Text>
          </HStack>

          <HStack w="$full" justifyContent="space-between" mb="$3">
            <Text size="sm" color="$gray300">Profissional</Text>
            <Text size="sm" fontFamily="$heading">
              {professional?.name ?? activeQueue?.professionalName ?? "..."}
            </Text>
          </HStack>

          <HStack w="$full" justifyContent="space-between" mb="$3">
            <Text size="sm" color="$gray300">Tempo estimado</Text>
            <Text size="sm" fontFamily="$heading" color={timeColor}>
              {timeLabel}
            </Text>
          </HStack>

          <HStack w="$full" justifyContent="space-between">
            <Text size="sm" color="$gray300">Status</Text>
            <Text size="sm" fontFamily="$heading">
              {STATUS_LABELS[status] ?? status}
            </Text>
          </HStack>
        </Box>

        <Text size="xs" color="$gray300" mt="$4" textAlign="center">
          A fila é atualizada automaticamente
        </Text>
      </Center>

      <VStack gap="$3" mt="$4">
        {canCancel && (
          <Button
            title="Sair da fila"
            variant="outline"
            onPress={handleCancel}
          />
        )}
        <Button title="Voltar ao início" onPress={() => navigation.navigate("home")} />
      </VStack>
    </VStack>
  );
}
