import { useEffect, useRef, useState } from "react";
import { Alert, TouchableOpacity, ActivityIndicator } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { VStack, Box, Text, Heading, Center, HStack } from "@gluestack-ui/themed";
import { Info } from "phosphor-react-native";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { Header } from "@components/Header";
import { Button } from "@components/Button";
import { canCancelAttendance, formatWaitTime, shouldCreateAttendance, estimatedStartTime } from "@domain/queue/types";
import { useAuthStore } from "@stores/authStore";
import { useQueueStore } from "@stores/queueStore";
import { attendanceService } from "@services/attendanceService";
import { waitForBackend } from "@services/healthService";
import { cardShadow } from "@utils/styles";
import { useQueueCountdown } from "@hooks/useQueueCountdown";

type RouteParams = {
  professionalId: string;
  establishmentId: string;
  professionalName?: string;
  establishmentName?: string;
  estimatedWaitMinutes?: number;
  serviceItemIds?: string[];
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
  const [createMsg, setCreateMsg] = useState("Entrando na fila...");
  const [createError, setCreateError] = useState<string | null>(null);
  const didCreate = useRef(false);
  const mountedRef = useRef(true);

  // mountedRef só vira false no UNMOUNT real — não em re-execuções benignas do
  // effect de criação. Sem isso, um re-render durante o create deixava o spinner
  // preso (a flag de cancelamento era flipada e o finally não limpava isCreating).
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (
      !shouldCreateAttendance({
        alreadyCreated: didCreate.current,
        hasAttendanceId: !!activeQueue?.attendanceId,
        hasToken: !!accessToken,
        serviceItemIds,
      })
    ) {
      return;
    }
    didCreate.current = true;

    useQueueStore.getState().joinQueue({
      professionalId,
      professionalName: paramProfName ?? "",
      establishmentId,
      establishmentName: paramEstName ?? "",
      enteredAt: Date.now(),
      estimatedMinutes: estimatedWaitMinutes ?? 0,
      status: "SCHEDULED",
    });

    async function createAttendance() {
      setIsCreating(true);
      try {
        // Cold start do Render: acorda a instancia antes de criar, evitando spinner
        // "infinito" enquanto o backend (hibernado) demora ~50s a responder.
        setCreateMsg("Preparando servidor...");
        const ready = await waitForBackend({ isCancelled: () => !mountedRef.current });
        if (!mountedRef.current) return;
        if (!ready) {
          await leaveQueue();
          if (mountedRef.current) {
            setCreateError("O servidor está demorando para responder. Tente novamente em instantes.");
          }
          return;
        }

        setCreateMsg("Entrando na fila...");
        const { data } = await attendanceService.create(
          { professionalId, establishmentId, serviceItemIds: serviceItemIds ?? [], scheduledTime: new Date().toISOString() },
          accessToken!,
        );
        if (mountedRef.current) {
          await updateQueue({ attendanceId: data.id });
        }
      } catch (error: any) {
        // Limpa a fila otimista para não deixar tarja/banner residual sem atendimento real.
        await leaveQueue();
        if (mountedRef.current) {
          const msg = error.response?.data?.message || error.message || "Erro ao entrar na fila";
          setCreateError(msg);
        }
      } finally {
        if (mountedRef.current) setIsCreating(false);
      }
    }

    createAttendance();
  }, [activeQueue?.attendanceId, accessToken, professionalId, establishmentId, updateQueue, leaveQueue, paramProfName, paramEstName, serviceItemIds, estimatedWaitMinutes]);

  const attendanceId = activeQueue?.attendanceId ?? null;
  const status = activeQueue?.status ?? "SCHEDULED";
  const canCancel = canCancelAttendance(status);

  const borderColor = isInQueue ? color : "#00B37E";
  const timeColor = isInQueue ? color : "#00B37E";
  const timeLabel = remaining <= 0 && isInQueue
    ? "Aguardando chamada"
    : formatWaitTime(remaining).replace('~', '');
  // Previsão fixa = entrada na fila + estimativa (atualiza quando o poll re-sincroniza).
  // Evita Date.now() no render (react-hooks/purity).
  const startTimeLabel = activeQueue
    ? estimatedStartTime(activeQueue.enteredAt, activeQueue.estimatedMinutes)
    : "";

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
      <Center flex={1} bg="$gray700" px={15}>
        <ActivityIndicator size="large" color="#00B37E" />
        <Text mt="$2" color="$gray300">{createMsg}</Text>
        <Text mt="$1" size="xs" color="$gray400" textAlign="center">
          Na primeira vez pode levar até ~50s para o servidor acordar.
        </Text>
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
          borderRadius="$2xl"
          borderWidth="$2"
          borderColor={borderColor}
          style={cardShadow}
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

          {isInQueue && (
            <HStack w="$full" justifyContent="space-between" mb="$3">
              <Text size="sm" color="$gray300">Previsão de início</Text>
              <Text size="sm" fontFamily="$heading">
                {remaining <= 0 ? "A qualquer momento" : `~${startTimeLabel}`}
              </Text>
            </HStack>
          )}

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
