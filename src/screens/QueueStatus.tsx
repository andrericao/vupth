import { useEffect, useRef, useState } from "react";
import { Alert, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { VStack, Box, Text, Heading, Center, HStack } from "@gluestack-ui/themed";
import { Info, Repeat2, Check, ChevronRight } from "lucide-react-native";
import * as SecureStore from "expo-secure-store";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { ScreenHeader, HeaderIconButton } from "@components/ScreenHeader";
import { Button } from "@components/Button";
import { PlaceAvatar } from "@components/PlaceAvatar";
import {
  QueueDisclaimerModal,
} from "@components/QueueDisclaimerModal";
import { RatingModal } from "@components/RatingModal";
import { RescheduleModal } from "@components/RescheduleModal";
import { avisoDeSaida } from "@domain/queue/avisoDeSaida";
import { AtualizarNoNavegador } from "@components/AtualizarNoNavegador";
import { ehNavegador } from "@utils/ehNavegador";
import { ChangeTurnModal } from "@components/ChangeTurnModal";
import { SwapOffersModal } from "@components/SwapOffersModal";
import { useSwapOffers } from "@hooks/useSwapOffers";
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
import { jaSaiuDaFila, mensagemDeFalhaAoSair } from "@domain/queue/leave";
import { useAuthStore } from "@stores/authStore";
import { useQueueStore } from "@stores/queueStore";
import { useRatedStore } from "@stores/ratedStore";
import { attendanceService } from "@services/attendanceService";
import { cutRequestService } from "@services/cutRequestService";
import { swapOfferService, SwapOfferDirection } from "@services/swapOfferService";
import { queueService } from "@services/queueService";
import { waitForBackend } from "@services/healthService";
import { useQueueCountdown } from "@hooks/useQueueCountdown";

type RouteParams = {
  professionalId: string;
  establishmentId: string;
  professionalName?: string;
  establishmentName?: string;
  estimatedWaitMinutes?: number;
  serviceItemIds?: string[];
  targetTime?: string;
};

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Aguardando",
  IN_PROGRESS: "Em atendimento",
  PAUSED: "Pausado",
  FINISHED: "Concluído",
  CANCELLED: "Cancelado",
};

export function QueueStatus() {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation<AppNavigatorRoutesProps>();
  const {
    professionalId,
    professionalName: paramProfName,
    establishmentId,
    establishmentName: paramEstName,
    serviceItemIds,
    estimatedWaitMinutes,
    targetTime,
  } = route.params as RouteParams;

  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const ratedIds = useRatedStore((s) => s.ids);
  const leaveQueue = useQueueStore((s) => s.leaveQueue);
  const updateQueue = useQueueStore((s) => s.updateQueue);
  const { remaining, elapsedSeconds, color, isInQueue, isBeingAttended, isPaused, isFinished, activeQueue, refresh } = useQueueCountdown();

  const [isCreating, setIsCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState("Entrando na fila...");
  const [createError, setCreateError] = useState<string | null>(null);
  // Loja fechada p/ novos (409 ESTABLISHMENT_NOT_OPEN) → oferece "solicitar corte".
  const [canRequestCut, setCanRequestCut] = useState(false);
  const [isRequestingCut, setIsRequestingCut] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isRemanejando, setIsRemanejando] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [tailEtaMs, setTailEtaMs] = useState<number | null>(null);
  const [rescheduleBaseMs, setRescheduleBaseMs] = useState(0);
  const [showChangeTurn, setShowChangeTurn] = useState(false);
  const [isLastInQueue, setIsLastInQueue] = useState(false);
  const [isPublishingSwap, setIsPublishingSwap] = useState(false);
  const [showSwapOffers, setShowSwapOffers] = useState(false);
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

        setCreateMsg(targetTime ? "Agendando..." : "Entrando na fila...");
        const { data } = await attendanceService.create(
          targetTime
            ? { professionalId, establishmentId, serviceItemIds: serviceItemIds ?? [], targetTime }
            : { professionalId, establishmentId, serviceItemIds: serviceItemIds ?? [], scheduledTime: new Date().toISOString() },
          accessToken!,
        );
        if (mountedRef.current) {
          await updateQueue({ attendanceId: data.id });
        }
      } catch (error: any) {
        // Limpa a fila otimista para não deixar tarja/banner residual sem atendimento real.
        await leaveQueue();
        if (mountedRef.current) {
          const status = error.response?.status;
          const code = error.response?.data?.code;
          // Loja fechada p/ novos (gate C1): oferece "solicitar corte" (BUG5 C2).
          if (status === 409 && code === "ESTABLISHMENT_NOT_OPEN") {
            setCanRequestCut(true);
            setCreateError(
              "A loja não está aberta agora, então não dá para entrar na fila direto. Você pode pedir um corte — o profissional tem 5 minutos para aceitar.",
            );
            return;
          }
          // Agendamento (#40): 422 alvo inviável / 400 passado -> mensagem amigável
          // sugerindo outro horário; senão, mensagem genérica de entrada na fila.
          const msg = targetTime
            ? rescheduleErrorMessage(status, code)
            : error.response?.data?.message || error.message || "Erro ao entrar na fila";
          setCreateError(msg);
        }
      } finally {
        if (mountedRef.current) setIsCreating(false);
      }
    }

    createAttendance();
  }, [activeQueue?.attendanceId, accessToken, professionalId, establishmentId, updateQueue, leaveQueue, paramProfName, paramEstName, serviceItemIds, estimatedWaitMinutes, targetTime]);

  const attendanceId = activeQueue?.attendanceId ?? null;
  const status = activeQueue?.status ?? "SCHEDULED";
  const canCancel = canCancelAttendance(status);
  // Item 16 — remanejar a vez (trocar horário / ir pro fim) é sempre livre e sem
  // multa enquanto aguardando. Só SAIR da fila com espera curta gera multa.
  const canReshuffle = canReshuffleQueue(status);

  // Troca aberta (C13): ofertas que EU posso aceitar → dot + modal. Só enquanto
  // aguardando na fila.
  const { data: acceptableOffers = [] } = useSwapOffers(professionalId, canReshuffle);
  const acceptableCount = acceptableOffers.length;

  const borderColor = isInQueue ? color : "#163300";
  const timeColor = isInQueue ? color : "#163300";
  // Finalizado: "Finalizado". Em atendimento: tempo decorrido rolando (m:ss).
  // Na fila: countdown ("Aguardando" quando zera).
  const timeLabel = isFinished
    ? "Finalizado"
    : isPaused
      ? "Pausado"
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
    // D10 (17/09): com multa, o aviso explica o impacto no próximo cliente e
    // oferece a troca de lugar — sem multa — antes de "sair mesmo assim".
    const aviso = avisoDeSaida({ multa: penalty, podeTrocar: canReshuffle });
    const sair = async () => {
      // A ORDEM AQUI IMPORTA, e os dois motivos vieram do teste de device
      // de 2026-09-07 ("sai da fila e o app fecha sozinho").
      //
      // 1. O `catch {}` era VAZIO. Se o cancelamento falhasse, o cliente
      //    saia da tela sem ter saido da fila: a vez e a multa seguiam de
      //    pe e ninguem ficava sabendo — nem ele, nem quem fosse
      //    investigar depois. Engolir o erro nao e "nao atrapalhar o
      //    usuario"; e mentir pra ele sobre o que aconteceu.
      //
      // 2. Limpar o store ANTES de navegar re-renderiza esta tela com
      //    `activeQueue` nulo. Navegar primeiro tira a tela do caminho.
      try {
        if (attendanceId && accessToken) {
          await attendanceService.cancel(attendanceId, accessToken);
        }
      } catch (error) {
        // Ja nao esta na fila (o profissional removeu, ou um toque duplo
        // cancelou antes): o objetivo do usuario esta cumprido. Segue pra
        // limpeza, senao ele fica preso numa tela de fila que nao existe.
        if (!jaSaiuDaFila(error)) {
          Alert.alert("Nao foi possivel sair da fila", mensagemDeFalhaAoSair(error));
          return;
        }
      }
      navigation.navigate("home");
      await leaveQueue();
    };
    Alert.alert(
      aviso.titulo,
      aviso.mensagem,
      aviso.botoes.map((botao) => ({
        text: botao.texto,
        style: botao.estilo,
        onPress:
          botao.acao === "sair"
            ? sair
            : botao.acao === "trocar"
              ? () => setShowSwapOffers(true)
              : undefined,
      })),
    );
  }

  // "Mudar minha vez": busca o ETA do fim da fila (piso de agendamento) e abre o
  // menu de direção (adiantar/atrasar). Sem bloquear se a fila não responder.
  async function handleOpenChangeTurn() {
    let tail: number | null = null;
    let last = false;
    if (activeQueue && accessToken) {
      try {
        const { data } = await queueService.getQueue(
          activeQueue.professionalId,
          activeQueue.establishmentId,
          accessToken,
        );
        tail = Date.now() + data.totalRemainingMinutes * 60000;
        // Já é o último da espera? (para bloquear "ir para o fim").
        const waiting = (data.attendancesInQueue ?? []).filter((a) => a.status === "SCHEDULED");
        last = waiting.length > 0 && waiting[waiting.length - 1].id === attendanceId;
      } catch {
        tail = null;
      }
    }
    setTailEtaMs(tail);
    setIsLastInQueue(last);
    // Base estável do formulário de reagendamento (evita Date.now() no render do modal).
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

  // Troca aberta (C13): publica a oferta (Adiantar=EARLIER / Atrasar=LATER).
  // Se alguém à frente/atrás aceitar, o backend troca as posições e avisa por WS.
  async function handleCreateSwapOffer(direction: SwapOfferDirection) {
    if (!attendanceId || !accessToken || isPublishingSwap) return;
    setIsPublishingSwap(true);
    try {
      await swapOfferService.create({ attendanceId, direction }, accessToken);
      setShowChangeTurn(false);
      Alert.alert(
        "Pedido publicado",
        direction === "EARLIER"
          ? "Se alguém à sua frente aceitar, vocês trocam de lugar. Você será avisado aqui."
          : "Se alguém atrás de você aceitar, vocês trocam de lugar. Você será avisado aqui.",
      );
    } catch (error: any) {
      const code = error.response?.data?.code;
      Alert.alert(
        "Não foi possível publicar",
        code === "QUEUE_SWAP_OFFER_NOT_ALLOWED"
          ? "A troca só vale enquanto você está aguardando na fila."
          : error.response?.data?.message || "Tente novamente em instantes.",
      );
    } finally {
      if (mountedRef.current) setIsPublishingSwap(false);
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
      <Center flex={1} bg="$brandBackground" px={16}>
        <ActivityIndicator size="large" color="#163300" />
        <Text mt="$2" color="$brandTextSecondary">{createMsg}</Text>
        <Text mt="$1" size="xs" color="$brandTextSecondary" textAlign="center">
          Na primeira vez pode levar até ~50s para o servidor acordar.
        </Text>
      </Center>
    );
  }

  if (createError) {
    return (
      <VStack flex={1} px={16} pb={30} bg="$brandBackground">
        <ScreenHeader title="NÃO DEU CERTO" onBack={() => navigation.goBack()} />
        <Center flex={1}>
          <Text
            // [contraste] Era `$gray500` (#DDDEDF, 1,35:1 no branco) — a mensagem
            // sumia justo no caso NAO-erro. O neutro da marca e brandTextSecondary.
            color={canRequestCut ? "$brandTextSecondary" : "$brandDanger"}
            fontSize="$lg"
            fontFamily="$heading"
            textAlign="center"
          >
            {createError}
          </Text>
          {canRequestCut && (
            <Button
              title={isRequestingCut ? "Enviando pedido..." : "Solicitar corte"}
              mt="$4"
              isDisabled={isRequestingCut}
              onPress={async () => {
                if (!accessToken || isRequestingCut) return;
                setIsRequestingCut(true);
                try {
                  await cutRequestService.create(
                    { professionalId, establishmentId, serviceItemIds: serviceItemIds ?? [] },
                    accessToken,
                  );
                  Alert.alert(
                    "Pedido enviado! ⏳",
                    "O profissional tem 5 minutos para responder. Você será avisado aqui no app.",
                  );
                  navigation.goBack();
                } catch (error: any) {
                  const code = error.response?.data?.code;
                  const msg =
                    code === "CUT_REQUEST_NOT_ALLOWED"
                      ? "A loja está aberta agora — tente entrar na fila normalmente."
                      : error.response?.data?.message || "Erro ao enviar o pedido de corte";
                  Alert.alert("Erro", msg);
                } finally {
                  setIsRequestingCut(false);
                }
              }}
            />
          )}
          <Button
            title="Voltar"
            variant={canRequestCut ? "outline" : "solid"}
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

  // Estado ESPERANDO = tela cheia no verde da marca (Pencil CLIENT · 11). Os
  // outros estados (em atendimento, pausado, concluido) ficam no fundo claro:
  // o verde cheio e o sinal de "voce esta esperando a sua vez" e perde o
  // sentido se valer para tudo.
  const waitingInQueue = isInQueue && !isBeingAttended && !isPaused && !isFinished;
  const position = activeQueue?.position;
  const peopleAhead = position != null ? Math.max(0, position - 1) : null;
  const initial = activeQueue?.initialPosition;
  // Progresso feito. So existe depois de andar na fila — no primeiro poll
  // `initial` e igual a posicao atual e nao ha nada a comemorar ainda.
  const passed = initial != null && position != null ? Math.max(0, initial - position) : 0;

  // Estado CONCLUIDO em tela cheia (Pencil CLIENT · 13 Fim do atendimento).
  // Nao virou rota nova: o Pencil desenha uma "tela" separada, mas isso e o
  // desfecho DESTE fluxo — criar uma rota orfa significaria alguem ter de
  // navegar ate ela, e o app ja esta aqui quando o atendimento termina.
  if (isFinished) {
    const servicos = activeQueue?.serviceMinutes;
    const jaAvaliou = !!attendanceId && ratedIds.includes(attendanceId);

    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: "#FFFFFF" }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <VStack flex={1} bg="$brandBackground">
          {/* Sem cabecalho: e um heroi de sucesso, sem voltar. Mas o topo vem
              do safe-area, nao de um 56 chutado. */}
          <VStack style={{ paddingTop: insets.top + 12 }} px={16} gap="$4" alignItems="center">
            <Center width={96} height={96} borderRadius={48} bg="$brandGreen">
              <Check size={48} color="#163300" />
            </Center>
            <Text
              fontFamily="$display"
              fontSize={32}
              letterSpacing={-1.4}
              color="$forest"
              textAlign="center"
            >
              PRONTO!
            </Text>
            <Text size="sm" color="$brandTextSecondary" textAlign="center">
              {activeQueue?.professionalName ?? paramProfName ?? "Atendimento"}
              {servicos != null ? ` · ${formatWaitTime(servicos)}` : ""}
            </Text>
          </VStack>

          <VStack flex={1} px={16} pt="$8" gap="$4">
            {/* O convite pra avaliar so aparece se ainda nao avaliou — depois
                de enviar, insistir e so ruido. */}
            {attendanceId && !jaAvaliou && (
              <VStack bg="$brandSurface" borderRadius={20} p={20} gap="$4" alignItems="center">
                <Text
                  fontFamily="$display"
                  fontSize={17}
                  letterSpacing={-0.3}
                  color="$brandTextPrimary"
                  textAlign="center"
                >
                  Como foi o atendimento?
                </Text>
                <Button title="Avaliar atendimento" onPress={() => setShowRating(true)} />
                <Text size="xs" color="$brandTextSecondary" textAlign="center">
                  Sua nota aparece para outros clientes
                </Text>
              </VStack>
            )}

            {/* "Marcar de novo": o caminho de volta pro mesmo profissional, que
                e o desfecho util de um atendimento bom. */}
            {activeQueue?.establishmentId && (
              <TouchableOpacity
                onPress={() => {
                  const establishmentId = activeQueue.establishmentId;
                  leaveQueue();
                  navigation.navigate("establishmentDetail", { establishmentId });
                }}
                testID="book-again"
              >
                <HStack bg="$greenTint" borderRadius={18} p={16} gap="$3.5" alignItems="center">
                  <PlaceAvatar
                    name={activeQueue.professionalName ?? "?"}
                    size={52}
                    bg="$brandGreen"
                  />
                  <VStack flex={1} gap="$0.5">
                    <Text fontFamily="$heading" fontSize={15} color="$forest">
                      Marcar de novo com {activeQueue.professionalName ?? "o profissional"}
                    </Text>
                    <Text size="xs" color="$forest">
                      {activeQueue.establishmentName ?? ""}
                    </Text>
                  </VStack>
                  <ChevronRight size={20} color="#163300" />
                </HStack>
              </TouchableOpacity>
            )}
          </VStack>

          <VStack px={16} pt="$6" gap="$3" alignItems="center">
            <Button
              title="Voltar ao início"
              variant="outline"
              onPress={() => {
                leaveQueue();
                navigation.navigate("home");
              }}
              testID="finish-home"
            />
          </VStack>
        </VStack>

        <RatingModal
          visible={showRating}
          attendanceId={attendanceId}
          professionalName={activeQueue?.professionalName ?? paramProfName}
          onClose={() => setShowRating(false)}
        />
      </ScrollView>
    );
  }

  if (waitingInQueue) {
    return (
      <VStack flex={1} bg="$brandGreen">
        {/* `ground="marca"` porque o hero e brand-green: os botoes vao de
            forest translucido. O verde-claro padrao sumiria sobre o verde. */}
        <Box px={16}>
          <ScreenHeader
            ground="marca"
            onBack={() => navigation.navigate("home")}
            action={
              <HeaderIconButton
                onPress={() => setShowDisclaimer(true)}
                ground="marca"
                testID="queue-info"
                accessibilityLabel="Sobre o tempo estimado"
              >
                <Info size={20} color="#163300" />
              </HeaderIconButton>
            }
          />
        </Box>

        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#163300" colors={["#163300"]} />
          }
        >
          <Text
            fontFamily="$body"
            fontSize={13}
            fontWeight="$bold"
            letterSpacing={1}
            color="$forest"
          >
            PARA A SUA VEZ
          </Text>

          {/* O numero grande e a POSICAO, nao o relogio: "quantas pessoas na
              minha frente" e concreto e nao oscila como a estimativa. Sem a
              posicao (backend nao respondeu ainda), o tempo assume o lugar. */}
          {peopleAhead != null ? (
            <>
              <Text
                fontFamily="$display"
                fontSize={110}
                lineHeight={112}
                letterSpacing={-6}
                color="$forest"
                testID="queue-position"
              >
                {peopleAhead}
              </Text>
              <Text
                fontFamily="$display"
                fontSize={26}
                letterSpacing={-0.8}
                color="$forest"
                textAlign="center"
              >
                {peopleAhead === 0
                  ? "você é o próximo"
                  : peopleAhead === 1
                    ? "pessoa na frente"
                    : "pessoas na frente"}
              </Text>
            </>
          ) : (
            <Text
              fontFamily="$display"
              fontSize={72}
              lineHeight={78}
              letterSpacing={-3}
              color="$forest"
              testID="queue-time"
            >
              {timeLabel}
            </Text>
          )}

          {/* [contraste] Forest TRANSLUCIDO de proposito: sobre o $brandGreen
              da tela ele hierarquiza sem virar uma segunda cor. So o ALPHA
              subiu — 0x99 dava 3,40:1 sobre o verde e reprovava no AA; 0xBF da
              4,99:1 e continua mais leve que o forest chapado do numero. */}
          <Text fontFamily="$body" fontSize={15} color="#163300BF" mt="$1">
            {remaining <= 0 ? "a qualquer momento" : `~${formatWaitTime(remaining)} de espera`}
          </Text>

          {/* Progresso: pontos cheios pelo que ja andou, apagados pelo que
              falta. So aparece depois de andar de verdade — mostrar a barra
              zerada no primeiro segundo nao informa nada. */}
          {passed > 0 && initial != null && (
            <>
              <HStack gap="$2" alignItems="center" mt="$6">
                {Array.from({ length: Math.min(initial, 8) }).map((_, i) => {
                  const done = i < Math.min(passed, 8);
                  return (
                    <Center
                      key={i}
                      width={done ? 12 : 8}
                      height={done ? 12 : 8}
                      borderRadius="$full"
                      // O ponto apagado e TRILHA (decoracao), nao informacao:
                      // quem informa e o ponto cheio, em $forest e maior. Por
                      // isso o alpha baixo fica.
                      bg={done ? "$forest" : "#16330040"}
                    />
                  );
                })}
              </HStack>
              {/* [contraste] Mesma logica do subtitulo acima: alpha 0xB3 dava
                  4,38:1 sobre o verde, 0xCC da 5,69:1. Fica um degrau ACIMA do
                  subtitulo, como era antes. */}
              <Text fontFamily="$body" fontSize={13} fontWeight="$semibold" color="#163300CC" mt="$3">
                Você já passou {passed} {passed === 1 ? "pessoa" : "pessoas"}
              </Text>
            </>
          )}
          <Box mt="$5">
            <AtualizarNoNavegador atualizando={refreshing} onPress={handleRefresh} />
          </Box>
        </ScrollView>

        <VStack px={16} pb={28} gap="$3.5" alignItems="center">
          {canReshuffle && (
            <TouchableOpacity
              onPress={handleOpenChangeTurn}
              disabled={isRemanejando}
              style={{ width: "100%" }}
              testID="change-turn"
            >
              <HStack
                bg="$forest"
                borderRadius="$full"
                gap="$2"
                px={24}
                py={15}
                justifyContent="center"
                alignItems="center"
                opacity={isRemanejando ? 0.6 : 1}
              >
                <Repeat2 size={17} color="#9FE870" />
                <Text fontFamily="$heading" fontSize={15} color="$brandGreen">
                  {isRemanejando ? "Um instante..." : "Mudar minha vez"}
                </Text>
              </HStack>
            </TouchableOpacity>
          )}
          {/* "Sair da fila" NAO e botao vermelho aqui (era, antes): sair e uma
              saida legitima, nao um erro. Fica como link discreto — presente
              para quem procura, sem gritar para quem nao esta procurando. */}
          {canCancel && (
            <TouchableOpacity onPress={handleCancel} disabled={isRemanejando} testID="leave-queue">
              <Text fontFamily="$body" fontSize={13} fontWeight="$semibold" color="#163300CC">
                Sair da fila
              </Text>
            </TouchableOpacity>
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
          isLast={isLastInQueue}
          swapBusy={isPublishingSwap}
          onMoveToEnd={() => {
            setShowChangeTurn(false);
            handleMoveToEnd();
          }}
          onReschedule={() => {
            setShowChangeTurn(false);
            setShowReschedule(true);
          }}
          onCreateSwapOffer={handleCreateSwapOffer}
          onClose={() => setShowChangeTurn(false)}
        />
        <SwapOffersModal
          visible={showSwapOffers}
          professionalId={professionalId}
          onClose={() => setShowSwapOffers(false)}
          onChanged={refresh}
        />
        <QueueDisclaimerModal visible={showDisclaimer} onClose={handleCloseDisclaimer} />
      </VStack>
    );
  }

  return (
    <VStack flex={1} px={16} pb={30} bg="$brandBackground">
      <ScreenHeader title="SUA VEZ" onBack={() => navigation.navigate("home")} />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#163300" colors={["#163300"]} />
        }
      >
      <Center flex={1}>
        <Heading fontFamily="$heading" fontSize="$2xl" textAlign="center">
          {isFinished
            ? "Atendimento concluído ✅"
            : isPaused
              ? "Atendimento pausado"
              : isBeingAttended
                ? "Em atendimento!"
                : "Você está na fila!"}
        </Heading>

        <Box
          bg="$brandSurface"
          p="$6"
          mt="$6"
          borderRadius="$card"
          borderWidth="$2"
          borderColor={borderColor}
          w="$full"
          alignItems="center"
        >
          {!isFinished && (
            <HStack alignItems="center" gap="$1">
              <Text size="sm" color="$brandTextSecondary">
                {isBeingAttended ? "Tempo de atendimento" : "Duração estimada"}
              </Text>
              {!isBeingAttended && (
                <TouchableOpacity
                  onPress={() => setShowDisclaimer(true)}
                  testID="queue-info-inline"
                  accessibilityRole="button"
                  accessibilityLabel="Sobre o tempo estimado"
                  // 16px de icone e alvo pequeno demais pra dedo; o hitSlop
                  // leva a area de toque pros 32.
                  hitSlop={8}
                >
                  {/* #9CA3AF da 2,85:1 no claro e reprova no AA. */}
                  <Info size={16} color="#454745" />
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

          <Box w="$full" h="$px" bg="$brandBorder" my="$4" />

          {isInQueue && (
            <HStack w="$full" justifyContent="space-between" mb="$3">
              <Text size="sm" color="$brandTextSecondary">Previsão de início</Text>
              <Text size="sm" fontFamily="$heading">
                {remaining <= 0 ? "A qualquer momento" : startTimeLabel}
              </Text>
            </HStack>
          )}

          {isBeingAttended && activeQueue?.serviceMinutes != null && (
            <HStack w="$full" justifyContent="space-between" mb="$3">
              <Text size="sm" color="$brandTextSecondary">Duração estimada</Text>
              <Text size="sm" fontFamily="$heading">
                {formatWaitTime(activeQueue.serviceMinutes)}
              </Text>
            </HStack>
          )}

          {endTimeLabel && (
            <HStack w="$full" justifyContent="space-between" mb="$3">
              <Text size="sm" color="$brandTextSecondary">Horário de término</Text>
              <Text size="sm" fontFamily="$heading">{endTimeLabel}</Text>
            </HStack>
          )}

          <HStack w="$full" justifyContent="space-between" mb="$3">
            <Text size="sm" color="$brandTextSecondary">Estabelecimento</Text>
            <Text size="sm" fontFamily="$heading">
              {activeQueue?.establishmentName ?? paramEstName ?? "..."}
            </Text>
          </HStack>

          <HStack w="$full" justifyContent="space-between" mb="$3">
            <Text size="sm" color="$brandTextSecondary">Profissional</Text>
            <Text size="sm" fontFamily="$heading">
              {activeQueue?.professionalName ?? paramProfName ?? "..."}
            </Text>
          </HStack>

          <HStack w="$full" justifyContent="space-between">
            <Text size="sm" color="$brandTextSecondary">Status</Text>
            <Text size="sm" fontFamily="$heading">
              {STATUS_LABELS[status] ?? status}
            </Text>
          </HStack>
        </Box>

        {/* No navegador nao ha "arrastar para baixo": a dica vira o botao. */}
        {ehNavegador() ? (
          <Box mt="$4">
            <AtualizarNoNavegador atualizando={refreshing} onPress={handleRefresh} />
          </Box>
        ) : (
          <Text size="xs" color="$brandTextSecondary" mt="$4" textAlign="center">
            A fila atualiza sozinha — arraste para baixo para atualizar agora
          </Text>
        )}
      </Center>
      </ScrollView>

      <VStack gap="$3" mt="$4">
        {canReshuffle && (
          <>
            <Text size="xs" color="$brandTextSecondary" textAlign="center">
              Não pode esperar agora? Você pode adiantar ou atrasar a sua vez.
            </Text>
            <Button
              title="Mudar minha vez"
              isLoading={isRemanejando}
              onPress={handleOpenChangeTurn}
            />
            <Button
              title={acceptableCount > 0 ? `Trocar de lugar (${acceptableCount})` : "Trocar de lugar"}
              variant="outline"
              onPress={() => setShowSwapOffers(true)}
            />
          </>
        )}
        {isFinished && attendanceId && !ratedIds.includes(attendanceId) && (
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
        {/* Sair da fila: vermelho e SEMPRE a última opção (pedido do Andre). */}
        {canCancel && (
          <Button
            title="Sair da fila"
            variant="destructive"
            isDisabled={isRemanejando}
            onPress={handleCancel}
          />
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
        isLast={isLastInQueue}
        swapBusy={isPublishingSwap}
        onMoveToEnd={() => {
          setShowChangeTurn(false);
          handleMoveToEnd();
        }}
        onReschedule={() => {
          setShowChangeTurn(false);
          setShowReschedule(true);
        }}
        onCreateSwapOffer={handleCreateSwapOffer}
        onClose={() => setShowChangeTurn(false)}
      />

      <SwapOffersModal
        visible={showSwapOffers}
        professionalId={professionalId}
        onClose={() => setShowSwapOffers(false)}
        onChanged={refresh}
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
