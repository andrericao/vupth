import { useEffect, useRef, useState } from "react";
import { Alert, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { VStack, Box, Text, Heading, Center, HStack } from "@gluestack-ui/themed";
import { Info } from "phosphor-react-native";
import * as SecureStore from "expo-secure-store";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { Header } from "@components/Header";
import { Button } from "@components/Button";
import {
  QueueDisclaimerModal,
  QUEUE_DISCLAIMER_TITLE,
  QUEUE_DISCLAIMER_TEXT,
} from "@components/QueueDisclaimerModal";
import { RatingModal } from "@components/RatingModal";
import { RescheduleModal } from "@components/RescheduleModal";
import { ChangeTurnModal } from "@components/ChangeTurnModal";
import {
  canCancelAttendance,
  formatWaitTime,
  formatElapsed,
  shouldCreateAttendance,
  estimatedStartTime,
  canReshuffleQueue,
  incursLatePenalty,
  rescheduleErrorMessage,
  moveToEndErrorMessage,
  CANCELLATION_PENALTY_VALUE,
} from "@domain/queue/types";
import { useAuthStore } from "@stores/authStore";
import { useQueueStore } from "@stores/queueStore";
import { attendanceService } from "@services/attendanceService";
import { queueService } from "@services/queueService";
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
  const user = useAuthStore((s) => s.user);
  const leaveQueue = useQueueStore((s) => s.leaveQueue);
  const updateQueue = useQueueStore((s) => s.updateQueue);
  const { remaining, elapsedSeconds, color, isInQueue, isBeingAttended, isFinished, activeQueue, refresh } = useQueueCountdown();

  const [isCreating, setIsCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState("Entrando na fila...");
  const [createError, setCreateError] = useState<string | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isRemanejando, setIsRemanejando] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [tailEtaMs, setTailEtaMs] = useState<number | null>(null);
  const [rescheduleBaseMs, setRescheduleBaseMs] = useState(0);
  const [showChangeTurn, setShowChangeTurn] = useState(false);
  const didCreate = useRef(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }
  const mountedRef = useRef(true);

  const DISCLAIMER_KEY = "vupth_hide_queue_disclaimer";

  // Mostra o aviso de "tempo é estimativa" ao entrar na fila, salvo se o cliente
  // marcou "não mostrar novamente".
  useEffect(() => {
    let active = true;
    (async () => {
      const hidden = await SecureStore.getItemAsync(DISCLAIMER_KEY);
      if (active && hidden !== "1") setShowDisclaimer(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleCloseDisclaimer(dontShowAgain: boolean) {
    setShowDisclaimer(false);
    if (dontShowAgain) await SecureStore.setItemAsync(DISCLAIMER_KEY, "1");
  }

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
  // Item 16 — remanejar a vez (trocar horário / ir pro fim) é sempre livre e sem
  // multa enquanto aguardando. Só SAIR da fila com espera curta gera multa.
  const canReshuffle = canReshuffleQueue(status);

  const borderColor = isInQueue ? color : "#00B37E";
  const timeColor = isInQueue ? color : "#00B37E";
  // Finalizado: "Finalizado". Em atendimento: tempo decorrido rolando (m:ss).
  // Na fila: countdown ("Aguardando" quando zera).
  const timeLabel = isFinished
    ? "Finalizado"
    : isBeingAttended
      ? formatElapsed(elapsedSeconds)
      : remaining <= 0 && isInQueue
        ? "Aguardando"
        : formatWaitTime(remaining).replace('~', '');
  // Previsão fixa = entrada na fila + estimativa (atualiza quando o poll re-sincroniza).
  // Evita Date.now() no render (react-hooks/purity).
  const startTimeLabel = activeQueue
    ? estimatedStartTime(activeQueue.enteredAt, activeQueue.estimatedMinutes)
    : "";
  // Término estimado do atendimento em curso = início + duração estimada.
  const endTimeLabel =
    isBeingAttended && activeQueue?.startedAt && activeQueue?.serviceMinutes != null
      ? estimatedStartTime(activeQueue.startedAt, activeQueue.serviceMinutes)
      : null;

  // Multa é pelo TEMPO estimado (não pelo status): vagar um lugar com < 1h para
  // ser atendido prejudica quem se segue. Vale para sair, reagendar e ir pro fim.
  // A TROCA por consentimento mútuo (#42) é que nunca terá multa.
  const penalty = incursLatePenalty(remaining);

  function handleCancel() {
    const message = penalty
      ? `Você está perto de ser atendido. Sair agora gera uma multa de R$ ${CANCELLATION_PENALTY_VALUE},00 no seu próximo atendimento.`
      : "Tem certeza que deseja sair da fila?";
    Alert.alert(
      "Sair da fila",
      message,
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

  // "Mudar minha vez": busca o ETA do fim da fila (piso de agendamento) e abre o
  // menu de direção (adiantar/atrasar). Sem bloquear se a fila não responder.
  async function handleOpenChangeTurn() {
    let tail: number | null = null;
    if (activeQueue && accessToken) {
      try {
        const { data } = await queueService.getQueue(
          activeQueue.professionalId,
          activeQueue.establishmentId,
          accessToken,
        );
        tail = Date.now() + data.totalRemainingMinutes * 60000;
      } catch {
        tail = null;
      }
    }
    setTailEtaMs(tail);
    // Base estável dos slots do reagendamento (evita Date.now() no render do modal).
    setRescheduleBaseMs(tail ?? Date.now());
    setShowChangeTurn(true);
  }

  // Item 16 — reagenda para o horário escolhido (vira intenção de fila).
  async function submitReschedule(targetIso: string) {
    if (!attendanceId || !accessToken) return;
    setIsRemanejando(true);
    try {
      const { data } = await attendanceService.reschedule(attendanceId, targetIso, accessToken);
      // Re-ancora pela previsão real devolvida (scheduledTime), lembrando que oscila.
      const targetMs = Date.parse(data.scheduledTime ?? targetIso);
      await updateQueue({
        enteredAt: Date.now(),
        estimatedMinutes: Math.max(0, Math.round((targetMs - Date.now()) / 60000)),
      });
      setShowReschedule(false);
      Alert.alert(
        "Horário reservado",
        "Você cedeu a vez e será chamado por volta do horário escolhido. Pode variar um pouco.",
      );
      refresh();
    } catch (error: any) {
      Alert.alert(
        "Não foi possível reagendar",
        rescheduleErrorMessage(error.response?.status, error.response?.data?.code),
      );
    } finally {
      if (mountedRef.current) setIsRemanejando(false);
    }
  }

  // Item 16 — descer a vez para o fim da fila (sem sair, sem perder o atendimento).
  async function submitMoveToEnd() {
    if (!attendanceId || !accessToken) return;
    setIsRemanejando(true);
    try {
      await attendanceService.moveToEnd(attendanceId, accessToken);
      // Ação explícita que AUMENTA a espera: re-ancora direto pelo servidor, pois
      // o guard monotônico do poll ignoraria um estimado maior.
      if (user?.id) {
        try {
          const { data } = await queueService.getWaitTime(attendanceId, user.id, accessToken);
          await useQueueStore.getState().reanchorQueue(data.estimatedWaitingTime);
        } catch {}
      }
      Alert.alert("Pronto", "Você foi para o fim da fila.");
      refresh();
    } catch (error: any) {
      Alert.alert(
        "Não foi possível",
        moveToEndErrorMessage(error.response?.status),
      );
    } finally {
      if (mountedRef.current) setIsRemanejando(false);
    }
  }

  function handleMoveToEnd() {
    // Ir pro fim com < 1h também vaga um lugar perto do início → avisa multa.
    const base = "Sua vez passa para depois de quem está esperando. Você continua na fila, sem perder o atendimento.";
    const message = penalty
      ? `${base}\n\nComo falta menos de 1h, isso gera multa de R$ ${CANCELLATION_PENALTY_VALUE},00 no seu próximo atendimento.`
      : base;
    Alert.alert(
      "Ir para o fim da fila",
      message,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Ir para o fim", onPress: submitMoveToEnd },
      ],
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

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#00B37E" colors={["#00B37E"]} />
        }
      >
      <Center flex={1}>
        <Heading fontFamily="$heading" fontSize="$2xl" textAlign="center">
          {isFinished
            ? "Atendimento concluído ✅"
            : isBeingAttended
              ? "Em atendimento!"
              : "Você está na fila!"}
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
          {!isFinished && (
            <HStack alignItems="center" gap="$1">
              <Text size="sm" color="$gray300">
                {isBeingAttended ? "Tempo de atendimento" : "Duração estimada"}
              </Text>
              {!isBeingAttended && (
                <TouchableOpacity
                  onPress={() => Alert.alert(QUEUE_DISCLAIMER_TITLE, QUEUE_DISCLAIMER_TEXT)}
                >
                  <Info size={16} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </HStack>
          )}
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
                {remaining <= 0 ? "A qualquer momento" : startTimeLabel}
              </Text>
            </HStack>
          )}

          {isBeingAttended && activeQueue?.serviceMinutes != null && (
            <HStack w="$full" justifyContent="space-between" mb="$3">
              <Text size="sm" color="$gray300">Duração estimada</Text>
              <Text size="sm" fontFamily="$heading">
                {formatWaitTime(activeQueue.serviceMinutes)}
              </Text>
            </HStack>
          )}

          {endTimeLabel && (
            <HStack w="$full" justifyContent="space-between" mb="$3">
              <Text size="sm" color="$gray300">Horário de término</Text>
              <Text size="sm" fontFamily="$heading">{endTimeLabel}</Text>
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
          A fila atualiza sozinha — arraste para baixo para atualizar agora
        </Text>
      </Center>
      </ScrollView>

      <VStack gap="$3" mt="$4">
        {canReshuffle && (
          <>
            <Text size="xs" color="$gray300" textAlign="center">
              Não pode esperar agora? Você pode adiantar ou atrasar a sua vez.
            </Text>
            <Button
              title="Mudar minha vez"
              isLoading={isRemanejando}
              onPress={handleOpenChangeTurn}
            />
          </>
        )}
        {canCancel && (
          <Button
            title="Sair da fila"
            variant="outline"
            isDisabled={isRemanejando}
            onPress={handleCancel}
          />
        )}
        {isFinished && attendanceId && (
          <Button title="Avaliar atendimento" onPress={() => setShowRating(true)} />
        )}
        {isFinished ? (
          <Button
            title="Concluir"
            variant="outline"
            onPress={() => {
              leaveQueue();
              navigation.navigate("home");
            }}
          />
        ) : (
          <Button title="Voltar ao início" onPress={() => navigation.navigate("home")} />
        )}
      </VStack>

      <RescheduleModal
        visible={showReschedule}
        baseMs={rescheduleBaseMs}
        tailEtaMs={tailEtaMs}
        penalty={penalty}
        loading={isRemanejando}
        onConfirm={submitReschedule}
        onClose={() => setShowReschedule(false)}
      />
      <ChangeTurnModal
        visible={showChangeTurn}
        tailEtaMs={tailEtaMs}
        onMoveToEnd={() => {
          setShowChangeTurn(false);
          handleMoveToEnd();
        }}
        onReschedule={() => {
          setShowChangeTurn(false);
          setShowReschedule(true);
        }}
        onClose={() => setShowChangeTurn(false)}
      />
      <QueueDisclaimerModal visible={showDisclaimer} onClose={handleCloseDisclaimer} />
      <RatingModal
        visible={showRating}
        attendanceId={attendanceId}
        professionalName={activeQueue?.professionalName ?? paramProfName}
        onClose={() => setShowRating(false)}
      />
    </VStack>
  );
}
