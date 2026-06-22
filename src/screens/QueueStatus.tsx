import { useEffect, useRef, useState } from "react";
import { Alert, TouchableOpacity, ActivityIndicator } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { VStack, Box, Text, Heading, Center, HStack } from "@gluestack-ui/themed";
import { Info } from "phosphor-react-native";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { Header } from "@components/Header";
import { Button } from "@components/Button";
import { canCancelAttendance, formatWaitTime } from "@domain/queue/types";
import { useAuthStore } from "@stores/authStore";
import { useQueueStore } from "@stores/queueStore";
import { attendanceService } from "@services/attendanceService";
import { useQueueCountdown } from "@hooks/useQueueCountdown";

type RouteParams = {
  professionalId: string;
  professionalName: string;
  establishmentId: string;
  establishmentName: string;
  estimatedWaitMinutes: number;
  serviceItemIds: string[];
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
  const {
    professionalId,
    professionalName: paramProfName,
    establishmentId,
    establishmentName: paramEstName,
    serviceItemIds,
    estimatedWaitMinutes,
  } = route.params as RouteParams;

  const accessToken = useAuthStore((s) => s.accessToken);
  const leaveQueue = useQueueStore((s) => s.leaveQueue);
  const updateQueue = useQueueStore((s) => s.updateQueue);
  const { remaining, color, isInQueue, isBeingAttended, activeQueue } = useQueueCountdown();

  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const didCreate = useRef(false);

  useEffect(() => {
    if (didCreate.current || activeQueue?.attendanceId || !accessToken) return;
    didCreate.current = true;

    const joinQueue = useQueueStore.getState().joinQueue;
    joinQueue({
      professionalId,
      professionalName: paramProfName,
      establishmentId,
      establishmentName: paramEstName,
      enteredAt: Date.now(),
      estimatedMinutes: estimatedWaitMinutes ?? 0,
      status: "SCHEDULED",
    });

    let cancelled = false;

    async function createAttendance() {
      setIsCreating(true);
      try {
        const { data } = await attendanceService.create(
          { professionalId, establishmentId, serviceItemIds, scheduledTime: new Date().toISOString() },
          accessToken!,
        );
        if (!cancelled) {
          await updateQueue({ attendanceId: data.id });
        }
      } catch (error: any) {
        if (!cancelled) {
          const msg = error.response?.data?.message || error.message || "Erro ao entrar na fila";
          setCreateError(msg);
        }
      } finally {
        if (!cancelled) setIsCreating(false);
      }
    }

    createAttendance();
    return () => { cancelled = true; };
  }, [activeQueue?.attendanceId, accessToken, professionalId, establishmentId, updateQueue, paramProfName, paramEstName, serviceItemIds, estimatedWaitMinutes]);

  const attendanceId = activeQueue?.attendanceId ?? null;
  const status = activeQueue?.status ?? "SCHEDULED";
  const canCancel = canCancelAttendance(status);

  const borderColor = isInQueue ? color : "#22C55E";
  const timeColor = isInQueue ? color : "#22C55E";
  const timeLabel = remaining <= 0 && isInQueue
    ? "Aguardando chamada"
    : formatWaitTime(remaining).replace('~', '');

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

  if (isCreating) {
    return (
      <Center flex={1} bg="$gray700">
        <ActivityIndicator size="large" color="#22C55E" />
        <Text mt="$2" color="$gray300">Entrando na fila...</Text>
      </Center>
    );
  }

  if (createError) {
    return (
      <VStack flex={1} px={15} pt={60} pb={30} bg="$gray700">
        <Header />
        <Center flex={1}>
          <Text color="$red500" fontSize="$lg" fontFamily="$heading" textAlign="center">
            {createError}
          </Text>
          <Button
            title="Voltar"
            mt="$4"
            onPress={() => {
              leaveQueue();
              navigation.goBack();
            }}
          />
        </Center>
      </VStack>
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
          <HStack alignItems="center" gap="$1">
            <Text size="sm" color="$gray300">Tempo estimado</Text>
            <TouchableOpacity
              onPress={() => Alert.alert(
                "Tempo estimado",
                "Este tempo é uma estimativa baseada nos atendimentos anteriores. O tempo real pode variar dependendo do profissional e dos serviços escolhidos."
              )}
            >
              <Info size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </HStack>
          <Heading
            fontFamily="$heading"
            fontSize="$4xl"
            color={timeColor}
            testID="queue-time"
          >
            {timeLabel}
          </Heading>

          <Box w="$full" h="$px" bg="$gray500" my="$4" />

          <HStack w="$full" justifyContent="space-between" mb="$3">
            <Text size="sm" color="$gray300">Estabelecimento</Text>
            <Text size="sm" fontFamily="$heading">
              {activeQueue?.establishmentName ?? paramEstName ?? "..."}
            </Text>
          </HStack>

          <HStack w="$full" justifyContent="space-between" mb="$3">
            <Text size="sm" color="$gray300">Profissional</Text>
            <Text size="sm" fontFamily="$heading">
              {activeQueue?.professionalName ?? paramProfName ?? "..."}
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
