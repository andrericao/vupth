import { useState, useCallback, useEffect, useRef } from "react";
import { Alert, TouchableOpacity, RefreshControl } from "react-native";
import { useNavigation, useFocusEffect, useRoute, useScrollToTop } from "@react-navigation/native";
import {
  VStack,
  Text,
  Box,
  HStack,
  Center,
  ScrollView,
  Badge,
  BadgeText,
} from "@gluestack-ui/themed";
import { Users, Clock, ChevronRight, Calendar, Repeat2, Star } from "lucide-react-native";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { ScreenHeader } from "@components/ScreenHeader";
import { AtualizarNoNavegador } from "@components/AtualizarNoNavegador";
import { useQueueCountdown } from "@hooks/useQueueCountdown";
import { useClientAttendances } from "@hooks/useAttendances";
import { useClientIntentions } from "@hooks/useIntentions";
import { useAuthStore } from "@stores/authStore";
import { useRatedStore } from "@stores/ratedStore";
import { SkeletonList } from "@components/Skeleton";
import { LiveDot } from "@components/LiveDot";
import { RatingModal } from "@components/RatingModal";
import { AttendanceDetailModal } from "@components/AttendanceDetailModal";
import { ClientAttendance } from "@services/attendanceService";
import { intentionsService } from "@services/intentionsService";
import { swapOfferService } from "@services/swapOfferService";
import { usePendingSwapStore } from "@stores/pendingSwapStore";
import { useQueueStore } from "@stores/queueStore";
import { atendimentoAtivo, atendimentoSemAvaliar, filaDoAtendimento, podeAvaliar } from "@domain/queue/reconciliar";
import { useOutOfQueueSwap } from "@hooks/useOutOfQueueSwap";
import { groupIntentionsByDay } from "@domain/schedule/agenda";
import { formatWaitTime, formatClockTime, STATUS_DESCONHECIDO, filaEncerrada } from "@domain/queue/types";
import { PilulaVoltarAoTopo } from "@components/PilulaVoltarAoTopo";
import { usePilulaDeTopo } from "@hooks/usePilulaDeTopo";
import { fs } from "@stores/fonteStore";

// [marca-vupth] Cada status e um PAR (fundo, texto). Antes era so uma cor de
// FUNDO com texto branco fixo por cima, e "Atrasado" (#F59E0B + branco) dava
// 2,15:1 — abaixo do minimo WCAG de 4,5:1. Os pares abaixo usam tokens da
// marca: fundo claro com `forest` por cima, que e a regra de contraste da
// identidade (accentPeach + forest = 8,76:1).
const HISTORY_STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  FINISHED: { label: "Concluído", bg: "#E2F6D5", fg: "#163300" },   // greenTint
  CANCELLED: { label: "Cancelado", bg: "#F3F5F1", fg: "#B3261E" },  // surface + danger
  // A loja tirou da fila (contrato de 18/09). O CANCELLED fica "Cancelado", e nao
  // "Você saiu da fila": os atendimentos ANTIGOS seguem CANCELLED mesmo quando foi
  // a loja, e o rotulo pessoal poria na conta do cliente o que ele nao fez.
  REMOVED: { label: "Retirado pela loja", bg: "#F3F5F1", fg: "#B3261E" }, // surface + danger
  LATE: { label: "Atrasado", bg: "#FFC091", fg: "#163300" },        // accentPeach
};

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.toLocaleDateString("pt-BR")} às ${formatClockTime(d)}`;
  } catch {
    return "";
  }
}

export function Attendances() {
  const navigation = useNavigation<AppNavigatorRoutesProps>();
  // Tocar na aba JA ATIVA volta ao topo da lista (Andre, 18/09): e o gesto que
  // todo app de lista tem, e o caminho natural de quem desceu demais. O
  // `useScrollToTop` do React Navigation ja faz o combinado com o partner —
  // sobe com animacao e, se ja estiver no topo, nao faz nada.
  const rolagemRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  useScrollToTop(rolagemRef as never);
  const pilula = usePilulaDeTopo();
  const { activeQueue, remaining, isInQueue, isBeingAttended, isPaused, isLate } = useQueueCountdown();
  // Em atendimento OU pausado = card verde de "andamento" (não é fila de espera).
  const emAtendimento = isBeingAttended || isPaused;
  const { data: history = [], isLoading, refetch, isRefetching } = useClientAttendances();
  const { data: agenda, refetch: refetchIntentions } = useClientIntentions();
  const accessToken = useAuthStore((s) => s.accessToken);
  const ratedIds = useRatedStore((s) => s.ids);
  const [ratingFor, setRatingFor] = useState<{ id: string; name: string } | null>(null);
  const [detailFor, setDetailFor] = useState<ClientAttendance | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  // Pedidos de troca publicados de FORA da fila (F8 fatia 2): o hook vigia o
  // aceite (poll) e este card deixa acompanhar/cancelar enquanto está aberto.
  const { pending: pendingSwaps, refetchMyOffers } = useOutOfQueueSwap();
  const removePendingSwap = usePendingSwapStore((s) => s.removePending);

  // REDE DE SEGURANCA: o servidor sabe da fila e o aparelho pode nao saber.
  // Aconteceu com o Andre em 18/09 — ele mudou a vez, saiu, entrou de novo e o
  // atendimento nao aparecia. O `useReconciliarFila` roda UMA vez por sessao
  // autenticada; se falhar (rede ruim naquele instante) ninguem tenta de novo.
  //
  // Aqui o historico ja chega a cada 30s para montar a lista — entao custa zero
  // usa-lo: estado local vazio + atendimento ativo no servidor = reconstroi. O
  // servidor manda, e nunca o contrario: com fila local, nao se toca (ela
  // carrega coisas que o historico nao tem, como a ancora do progresso).
  useEffect(() => {
    if (activeQueue || history.length === 0) return;
    const ativo = atendimentoAtivo(history);
    if (ativo) useQueueStore.getState().joinQueue(filaDoAtendimento(ativo));
  }, [activeQueue, history]);
  const [cancellingSwapId, setCancellingSwapId] = useState<string | null>(null);

  // CONVITE para avaliar, no lugar de pedágio: quem fugiu do popup uma vez não
  // pode ser jogado nele de novo (Andre, 19/09). Aqui ele fica à mão, e leva ao
  // atendimento que aconteceu — quem não quiser, só ignora.
  const semAvaliar = atendimentoSemAvaliar(history, ratedIds);

  // Push de concluido (notificacao-avaliar, CLI-33): chega com o atendimento a
  // avaliar; com o historico na mao, abre a avaliacao dele uma vez.
  const route = useRoute();
  const avaliarPeloPush = (route.params as { avaliar?: string } | undefined)?.avaliar;
  useEffect(() => {
    if (!avaliarPeloPush || history.length === 0) return;
    const alvo = history.find((a) => a.id === avaliarPeloPush);
    // Abrir uma vez ao chegar o parametro do push — o efeito e o gatilho.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (alvo && podeAvaliar(alvo, ratedIds)) setRatingFor({ id: alvo.id, name: alvo.professionalName });
    navigation.setParams({ avaliar: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avaliarPeloPush, history]);

  const intentionGroups = groupIntentionsByDay(agenda?.intentions ?? []);

  // Atualiza ao focar a aba (sem precisar fechar/reabrir o app).
  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchIntentions();
    }, [refetch, refetchIntentions]),
  );

  // Cancela uma intenção (meus agendamentos) com confirmação.
  function handleCancelIntention(id: string, professionalName: string) {
    Alert.alert(
      "Cancelar agendamento",
      `Cancelar o agendamento com ${professionalName}?`,
      [
        { text: "Voltar", style: "cancel" },
        {
          text: "Cancelar agendamento",
          style: "destructive",
          onPress: async () => {
            if (!accessToken) return;
            setCancellingId(id);
            try {
              await intentionsService.cancel(id, accessToken);
              await refetchIntentions();
            } catch (error: any) {
              const msg =
                error.response?.status === 400
                  ? "Este agendamento já virou fila (ou já foi cancelado)."
                  : error.response?.data?.message || "Erro ao cancelar o agendamento";
              Alert.alert("Erro", msg);
              refetchIntentions();
            } finally {
              setCancellingId(null);
            }
          },
        },
      ],
    );
  }

  // Cancela o pedido de troca publicado de fora da fila. 422 = já não está mais
  // aberto (alguém aceitou ou expirou) — some da lista do mesmo jeito.
  function handleCancelSwap(offerId: string, professionalName: string) {
    Alert.alert(
      "Cancelar pedido de troca",
      `Cancelar o pedido para entrar na fila de ${professionalName}?`,
      [
        { text: "Voltar", style: "cancel" },
        {
          text: "Cancelar pedido",
          style: "destructive",
          onPress: async () => {
            if (!accessToken) return;
            setCancellingSwapId(offerId);
            try {
              await swapOfferService.cancel(offerId, accessToken);
              await removePendingSwap(offerId);
            } catch (error: any) {
              if (error.response?.status === 422 || error.response?.status === 404) {
                await removePendingSwap(offerId);
              } else {
                Alert.alert("Erro", "Não foi possível cancelar o pedido. Tente de novo.");
              }
            } finally {
              setCancellingSwapId(null);
              refetchMyOffers();
            }
          },
        },
      ],
    );
  }

  // Realizados sao os atendimentos que ACABARAM. O LATE ficava aqui ate 25/09 —
  // e o cliente atrasado lia "Atrasado" entre os encerrados, como se tivesse
  // acabado, enquanto o profissional ainda esperava para comecar o corte.
  const realizados = history.filter((a) => filaEncerrada(a.status));

  function handleGoToQueue() {
    if (!activeQueue) return;
    // queueStatus vive na aba Início (pai = tabs).
    navigation.getParent()?.navigate("homeTab", {
      screen: "queueStatus",
      pop: true,
      params: {
        professionalId: activeQueue.professionalId,
        establishmentId: activeQueue.establishmentId,
        professionalName: activeQueue.professionalName,
        establishmentName: activeQueue.establishmentName,
        estimatedWaitMinutes: activeQueue.estimatedMinutes,
      },
    });
  }

  return (
    <VStack flex={1} bg="$brandBackground">
      <Box px={16}>
        <ScreenHeader root title="Atendimentos" />
      </Box>
      <Box px={16} alignItems="flex-start">
        <AtualizarNoNavegador atualizando={isRefetching} onPress={() => refetch()} />
      </Box>

      <ScrollView
        ref={rolagemRef}
        onScroll={pilula.onScroll}
        onLayout={pilula.onLayout}
        scrollEventThrottle={32}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#163300" colors={["#163300"]} />
        }
      >
        {semAvaliar && (
          <Box px={16} mt="$5">
            <TouchableOpacity onPress={() => setDetailFor(semAvaliar)} testID="convite-avaliar">
              <HStack bg="$greenTint" borderRadius="$card" p="$4" gap="$3" alignItems="center">
                <Star size={20} color="#163300" />
                <VStack flex={1}>
                  <Text fontFamily="$heading" size="sm" color="$forest">
                    Como foi com {semAvaliar.professionalName}?
                  </Text>
                  <Text size="xs" color="$brandTextSecondary">
                    Sua avaliação ajuda quem vem depois — toque para ver o atendimento.
                  </Text>
                </VStack>
                <TouchableOpacity
                  onPress={() =>
                    setRatingFor({ id: semAvaliar.id, name: semAvaliar.professionalName ?? "" })
                  }
                  testID="avaliar-agora"
                >
                  <Box bg="$brandGreen" borderRadius="$full" px="$3" py="$1.5">
                    <Text fontFamily="$heading" fontSize={fs(12)} color="$forest">
                      Avaliar
                    </Text>
                  </Box>
                </TouchableOpacity>
              </HStack>
            </TouchableOpacity>
          </Box>
        )}

        <VStack mt="$6" px={16}>
          <Text
            fontFamily="$body"
            fontSize={fs(11)}
            fontWeight="$bold"
            letterSpacing={0.8}
            color="$brandTextSecondary"
            mb="$2.5"
          >
            EM ANDAMENTO
          </Text>

          {/* O atrasado (LATE) e atendimento EM ANDAMENTO: ate 25/09 ele caia em
              "Nenhum atendimento em andamento" e ia para os realizados. */}
          {activeQueue && (isInQueue || emAtendimento || isLate) ? (
            <TouchableOpacity onPress={handleGoToQueue}>
              {/* Unico card com borda verde-marca da tela: e o atendimento
                  VIVO, o que a pessoa abriu o app pra ver. */}
              <VStack
                bg="$brandBackground"
                p="$4"
                borderRadius="$card"
                borderWidth={2}
                borderColor="$brandGreen"
                gap="$2"
              >
                <HStack alignItems="center" gap="$2.5">
                  <Users size={20} color="#163300" />
                  <VStack flex={1} gap="$0.5">
                    <Text fontFamily="$display" fontSize={fs(16)} letterSpacing={-0.4} color="$forest">
                      {activeQueue.establishmentName}
                    </Text>
                    <Text size="xs" color="$brandTextSecondary">
                      {activeQueue.professionalName}
                    </Text>
                  </VStack>
                  <ChevronRight size={18} color="#454745" />
                </HStack>
                <HStack
                  bg="$brandGreen"
                  borderRadius="$full"
                  px={12}
                  py={6}
                  gap="$1.5"
                  alignItems="center"
                  alignSelf="flex-start"
                >
                  {/* Pausado NAO pisca: o atendimento esta parado, e ponto
                      piscando sinalizaria movimento. */}
                  <LiveDot size={8} color="#163300" pulsing={!isPaused} />
                  <Text size="xs" fontWeight="$semibold" color="$forest">
                    {isBeingAttended
                      ? "Em atendimento"
                      : isPaused
                        ? "Pausado"
                        : isLate
                          ? "Você foi chamado"
                        : remaining == null
                          ? "Calculando..."
                          : formatWaitTime(remaining)}
                  </Text>
                </HStack>
              </VStack>
            </TouchableOpacity>
          ) : (
            <Box bg="$brandSurface" p="$4" borderRadius="$card">
              <Text size="sm" color="$brandTextSecondary" textAlign="center">
                Nenhum atendimento em andamento
              </Text>
            </Box>
          )}
        </VStack>

        {pendingSwaps.length > 0 && (
          <VStack mt="$6" px={16}>
            <Text
              fontFamily="$body"
              fontSize={fs(11)}
              fontWeight="$bold"
              letterSpacing={0.8}
              color="$brandTextSecondary"
              mb="$2.5"
            >
              PEDIDOS DE TROCA
            </Text>

            <VStack gap="$3">
              {pendingSwaps.map((s) => (
                <Box key={s.offerId} bg="$brandSurface" p="$4" borderRadius="$card">
                  <HStack alignItems="center" gap="$3">
                    <Repeat2 size={22} color="#163300" />
                    <VStack flex={1}>
                      <Text fontFamily="$heading" size="sm">
                        {s.professionalName}
                      </Text>
                      <Text size="xs" color="$brandTextSecondary">
                        {s.establishmentName}
                      </Text>
                      <Text size="xs" color="$brandTextSecondary" mt="$1">
                        Aguardando alguém da fila ceder o lugar
                      </Text>
                    </VStack>
                    <TouchableOpacity
                      onPress={() => handleCancelSwap(s.offerId, s.professionalName)}
                      disabled={cancellingSwapId === s.offerId}
                    >
                      <Text size="xs" color="$brandDanger" fontFamily="$heading">
                        {cancellingSwapId === s.offerId ? "Cancelando..." : "Cancelar"}
                      </Text>
                    </TouchableOpacity>
                  </HStack>
                </Box>
              ))}
            </VStack>
          </VStack>
        )}

        {intentionGroups.length > 0 && (
          <VStack mt="$6" px={16}>
            <Text
              fontFamily="$body"
              fontSize={fs(11)}
              fontWeight="$bold"
              letterSpacing={0.8}
              color="$brandTextSecondary"
              mb="$2.5"
            >
              AGENDAMENTOS
            </Text>

            <VStack gap="$3">
              {intentionGroups.map((group) => (
                <VStack key={group.day.toISOString()} gap="$2">
                  <Text size="xs" color="$brandTextSecondary" fontFamily="$heading">
                    {group.dayLabel}
                  </Text>
                  {group.items.map((i) => (
                    <Box key={i.id} bg="$brandSurface" p="$4" borderRadius="$card">
                      <HStack alignItems="center" gap="$3">
                        <Calendar size={22} color="#163300" />
                        <VStack flex={1}>
                          <Text fontFamily="$heading" size="sm">
                            {i.professionalName}
                          </Text>
                          <Text size="xs" color="$brandTextSecondary">
                            {i.services.map((s) => s.customName).join(", ") || i.establishmentName}
                          </Text>
                          <Text size="xs" color="$brandTextSecondary" mt="$1">
                            Pedido para às {formatClockTime(new Date(i.desiredTime))}
                            {i.estimatedStartTime && i.estimatedStartTime !== i.desiredTime
                              ? ` · previsto ~${formatClockTime(new Date(i.estimatedStartTime))}`
                              : ""}
                          </Text>
                        </VStack>
                        <TouchableOpacity
                          onPress={() => handleCancelIntention(i.id, i.professionalName)}
                          disabled={cancellingId === i.id}
                        >
                          <Text size="xs" color="$brandDanger" fontFamily="$heading">
                            {cancellingId === i.id ? "Cancelando..." : "Cancelar"}
                          </Text>
                        </TouchableOpacity>
                      </HStack>
                    </Box>
                  ))}
                </VStack>
              ))}
            </VStack>
          </VStack>
        )}

        <VStack mt="$6" px={16}>
          <Text
            fontFamily="$body"
            fontSize={fs(11)}
            fontWeight="$bold"
            letterSpacing={0.8}
            color="$brandTextSecondary"
            mb="$2.5"
          >
            REALIZADOS
          </Text>

          {isLoading ? (
            <SkeletonList count={3} />
          ) : realizados.length === 0 ? (
            <Center py="$8">
              <Clock size={40} color="#9CA3AF" />
              <Text size="sm" color="$brandTextSecondary" mt="$2">
                Nenhum atendimento realizado ainda
              </Text>
            </Center>
          ) : (
            <VStack gap="$3">
              {realizados.map((a) => {
                const st = HISTORY_STATUS[a.status] ?? {
                  label: STATUS_DESCONHECIDO,
                  bg: "#F3F5F1",
                  fg: "#454745",
                };
                const canRate = podeAvaliar(a, ratedIds);
                return (
                  <TouchableOpacity key={a.id} activeOpacity={0.7} onPress={() => setDetailFor(a)}>
                    <Box bg="$brandSurface" p="$4" borderRadius="$card">
                      <HStack justifyContent="space-between" alignItems="flex-start">
                        <VStack flex={1} pr="$2">
                          <HStack alignItems="center" gap="$1.5">
                            <Text fontFamily="$heading" size="sm">
                              {a.professionalName}
                            </Text>
                            {/* Sem avaliar (notificacao-avaliar, CLI-33): o ponto. */}
                            {canRate ? (
                              <Box w={8} h={8} borderRadius={4} bg="$brandDanger" testID={`sem-avaliar-${a.id}`} />
                            ) : null}
                          </HStack>
                          {a.establishmentName ? (
                            <Text size="xs" color="$brandTextSecondary" testID={`historico-loja-${a.id}`}>
                              {a.establishmentName}
                            </Text>
                          ) : null}
                          <Text size="xs" color="$brandTextSecondary">
                            {a.services.map((s) => s.customName).join(", ") || "—"}
                          </Text>
                          <Text size="xs" color="$brandTextSecondary" mt="$1">
                            {formatDateTime(a.startTime ?? a.scheduledTime)}
                          </Text>
                        </VStack>
                        <VStack alignItems="flex-end" gap="$1">
                          <Badge bg={st.bg} borderRadius="$full" px="$3" py="$1">
                            <BadgeText color={st.fg} size="xs" fontFamily="$heading">
                              {st.label}
                            </BadgeText>
                          </Badge>
                          <Text size="xs" color="$brandTextSecondary">
                            {/* Sem valor a tela nao quebra: `toFixed` em
                                 undefined derruba a lista inteira, e um card
                                 sem preco e melhor que uma tela branca. */}
                            {a.totalValue != null ? `R$ ${a.totalValue.toFixed(2)}` : "—"}
                          </Text>
                        </VStack>
                      </HStack>
                      <HStack alignItems="center" gap="$1" mt="$3">
                        <ChevronRight size={13} color={canRate ? "#163300" : "#454745"} />
                        <Text size="xs" color="$brandTextSecondary" fontFamily="$heading">
                          {canRate ? "Toque para detalhes e avaliar" : "Toque para ver detalhes"}
                        </Text>
                      </HStack>
                    </Box>
                  </TouchableOpacity>
                );
              })}
            </VStack>
          )}
        </VStack>
      </ScrollView>
      <PilulaVoltarAoTopo
        visivel={pilula.visivel}
        // O ScrollView daqui e o do Gluestack, cujo tipo nao expoe o `scrollTo`
        // da instancia — que existe, porque por baixo e o do React Native.
        onPress={() =>
          (rolagemRef.current as unknown as { scrollTo: (o: { y: number; animated: boolean }) => void } | null)?.scrollTo({
            y: 0,
            animated: true,
          })
        }
      />

      <AttendanceDetailModal
        attendance={detailFor}
        canRate={!!detailFor && podeAvaliar(detailFor, ratedIds)}
        onClose={() => setDetailFor(null)}
        onVerProfissional={() => {
          if (!detailFor) return;
          navigation.navigate("professionalInfo", {
            professionalId: detailFor.professionalId,
            establishmentId: detailFor.establishmentId,
            professionalName: detailFor.professionalName,
          });
          setDetailFor(null);
        }}
        onRate={() => {
          if (detailFor) setRatingFor({ id: detailFor.id, name: detailFor.professionalName });
          setDetailFor(null);
        }}
      />

      <RatingModal
        visible={!!ratingFor}
        attendanceId={ratingFor?.id ?? null}
        professionalName={ratingFor?.name}
        onClose={() => setRatingFor(null)}
      />
    </VStack>
  );
}
