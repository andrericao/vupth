import { useState, useCallback, useEffect, useRef } from "react";
import { Alert, TouchableOpacity, RefreshControl, ScrollView, Text, View } from "react-native";
import { useNavigation, useFocusEffect, useScrollToTop } from "@react-navigation/native";
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
    <View className="flex-1 bg-vupth-background">
      <View className="px-4">
        <ScreenHeader root title="Atendimentos" />
      </View>
      <View className="px-4 items-start">
        <AtualizarNoNavegador atualizando={isRefetching} onPress={() => refetch()} />
      </View>

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
          <View className="px-4 mt-5">
            <TouchableOpacity onPress={() => setDetailFor(semAvaliar)} testID="convite-avaliar">
              <View className="flex-row bg-vupth-greenTint rounded-card p-4 gap-3 items-center">
                <Star size={20} color="#163300" />
                <View className="flex-1">
                  <Text className="font-heading text-sm text-vupth-forest">
                    Como foi com {semAvaliar.professionalName}?
                  </Text>
                  <Text className="font-body text-xs text-vupth-textSecondary">
                    Sua avaliação ajuda quem vem depois — toque para ver o atendimento.
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() =>
                    setRatingFor({ id: semAvaliar.id, name: semAvaliar.professionalName ?? "" })
                  }
                  testID="avaliar-agora"
                >
                  <View className="bg-vupth-green rounded-full px-3 py-1.5">
                    <Text className="font-heading text-vupth-forest" style={{ fontSize: fs(12) }}>
                      Avaliar
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        )}

        <View className="mt-6 px-4">
          <Text
            className="font-body text-f11 font-bold text-vupth-textSecondary mb-2.5"
            style={{ letterSpacing: 0.8 }}
          >
            EM ANDAMENTO
          </Text>

          {/* O atrasado (LATE) e atendimento EM ANDAMENTO: ate 25/09 ele caia em
              "Nenhum atendimento em andamento" e ia para os realizados. */}
          {activeQueue && (isInQueue || emAtendimento || isLate) ? (
            <TouchableOpacity onPress={handleGoToQueue}>
              {/* Unico card com borda verde-marca da tela: e o atendimento
                  VIVO, o que a pessoa abriu o app pra ver. */}
              <View className="bg-vupth-background p-4 rounded-card border-2 border-vupth-green gap-2">
                <View className="flex-row items-center gap-2.5">
                  <Users size={20} color="#163300" />
                  <View className="flex-1 gap-0.5">
                    <Text className="font-display text-vupth-forest" style={{ fontSize: fs(16), letterSpacing: -0.4 }}>
                      {activeQueue.establishmentName}
                    </Text>
                    <Text className="font-body text-xs text-vupth-textSecondary">
                      {activeQueue.professionalName}
                    </Text>
                  </View>
                  <ChevronRight size={18} color="#454745" />
                </View>
                <View
                  className="flex-row bg-vupth-green rounded-full px-3 py-1.5 gap-1.5 items-center self-start"
                >
                  {/* Pausado NAO pisca: o atendimento esta parado, e ponto
                      piscando sinalizaria movimento. */}
                  <LiveDot size={8} color="#163300" pulsing={!isPaused} />
                  <Text className="font-body text-xs font-semibold text-vupth-forest">
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
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            <View className="bg-vupth-surface p-4 rounded-card">
              <Text className="font-body text-sm text-vupth-textSecondary text-center">
                Nenhum atendimento em andamento
              </Text>
            </View>
          )}
        </View>

        {pendingSwaps.length > 0 && (
          <View className="mt-6 px-4">
            <Text
              className="font-body text-f11 font-bold text-vupth-textSecondary mb-2.5"
              style={{ letterSpacing: 0.8 }}
            >
              PEDIDOS DE TROCA
            </Text>

            <View className="gap-3">
              {pendingSwaps.map((s) => (
                <View className="bg-vupth-surface p-4 rounded-card" key={s.offerId}>
                  <View className="flex-row items-center gap-3">
                    <Repeat2 size={22} color="#163300" />
                    <View className="flex-1">
                      <Text className="font-heading text-sm text-vupth-textPrimary">
                        {s.professionalName}
                      </Text>
                      <Text className="font-body text-xs text-vupth-textSecondary">
                        {s.establishmentName}
                      </Text>
                      <Text className="font-body text-xs text-vupth-textSecondary mt-1">
                        Aguardando alguém da fila ceder o lugar
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleCancelSwap(s.offerId, s.professionalName)}
                      disabled={cancellingSwapId === s.offerId}
                    >
                      <Text className="font-heading text-xs text-vupth-danger">
                        {cancellingSwapId === s.offerId ? "Cancelando..." : "Cancelar"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {intentionGroups.length > 0 && (
          <View className="mt-6 px-4">
            <Text
              className="font-body text-f11 font-bold text-vupth-textSecondary mb-2.5"
              style={{ letterSpacing: 0.8 }}
            >
              AGENDAMENTOS
            </Text>

            <View className="gap-3">
              {intentionGroups.map((group) => (
                <View className="gap-2" key={group.day.toISOString()}>
                  <Text className="font-heading text-xs text-vupth-textSecondary">
                    {group.dayLabel}
                  </Text>
                  {group.items.map((i) => (
                    <View className="bg-vupth-surface p-4 rounded-card" key={i.id}>
                      <View className="flex-row items-center gap-3">
                        <Calendar size={22} color="#163300" />
                        <View className="flex-1">
                          <Text className="font-heading text-sm text-vupth-textPrimary">
                            {i.professionalName}
                          </Text>
                          <Text className="font-body text-xs text-vupth-textSecondary">
                            {i.services.map((s) => s.customName).join(", ") || i.establishmentName}
                          </Text>
                          <Text className="font-body text-xs text-vupth-textSecondary mt-1">
                            Pedido para às {formatClockTime(new Date(i.desiredTime))}
                            {i.estimatedStartTime && i.estimatedStartTime !== i.desiredTime
                              ? ` · previsto ~${formatClockTime(new Date(i.estimatedStartTime))}`
                              : ""}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleCancelIntention(i.id, i.professionalName)}
                          disabled={cancellingId === i.id}
                        >
                          <Text className="font-heading text-xs text-vupth-danger">
                            {cancellingId === i.id ? "Cancelando..." : "Cancelar"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </View>
        )}

        <View className="mt-6 px-4">
          <Text
            className="font-body text-f11 font-bold text-vupth-textSecondary mb-2.5"
            style={{ letterSpacing: 0.8 }}
          >
            REALIZADOS
          </Text>

          {isLoading ? (
            <SkeletonList count={3} />
          ) : realizados.length === 0 ? (
            <View className="items-center justify-center py-8">
              <Clock size={40} color="#9CA3AF" />
              <Text className="font-body text-sm text-vupth-textSecondary mt-2">
                Nenhum atendimento realizado ainda
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {realizados.map((a) => {
                const st = HISTORY_STATUS[a.status] ?? {
                  label: STATUS_DESCONHECIDO,
                  bg: "#F3F5F1",
                  fg: "#454745",
                };
                const canRate = podeAvaliar(a, ratedIds);
                return (
                  <TouchableOpacity key={a.id} activeOpacity={0.7} onPress={() => setDetailFor(a)}>
                    <View className="bg-vupth-surface p-4 rounded-card">
                      <View className="flex-row justify-between items-start">
                        <View className="flex-1 pr-2">
                          <Text className="font-heading text-sm text-vupth-textPrimary">
                            {a.professionalName}
                          </Text>
                          <Text className="font-body text-xs text-vupth-textSecondary">
                            {a.services.map((s) => s.customName).join(", ") || "—"}
                          </Text>
                          <Text className="font-body text-xs text-vupth-textSecondary mt-1">
                            {formatDateTime(a.startTime ?? a.scheduledTime)}
                          </Text>
                        </View>
                        <View className="items-end gap-1">
                          {/* O par (fundo, texto) do status vem em hex: `style`. */}
                          <View className="rounded-full px-3 py-1" style={{ backgroundColor: st.bg }}>
                            <Text className="font-heading text-xs" style={{ color: st.fg }}>
                              {st.label}
                            </Text>
                          </View>
                          <Text className="font-body text-xs text-vupth-textSecondary">
                            {/* Sem valor a tela nao quebra: `toFixed` em
                                 undefined derruba a lista inteira, e um card
                                 sem preco e melhor que uma tela branca. */}
                            {a.totalValue != null ? `R$ ${a.totalValue.toFixed(2)}` : "—"}
                          </Text>
                        </View>
                      </View>
                      <View className="flex-row items-center gap-1 mt-3">
                        <ChevronRight size={13} color={canRate ? "#163300" : "#454745"} />
                        <Text className="font-heading text-xs text-vupth-textSecondary">
                          {canRate ? "Toque para detalhes e avaliar" : "Toque para ver detalhes"}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
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
    </View>
  );
}

