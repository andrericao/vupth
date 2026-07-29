import { useState, useCallback } from "react";
import { Alert, TouchableOpacity, RefreshControl } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import {
  VStack,
  Text,
  Heading,
  Box,
  HStack,
  Center,
  ScrollView,
  Badge,
  BadgeText,
} from "@gluestack-ui/themed";
import { Queue, Clock, CaretRight, CalendarBlank, ArrowsLeftRight } from "phosphor-react-native";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { Header } from "@components/Header";
import { useQueueCountdown } from "@hooks/useQueueCountdown";
import { useClientAttendances } from "@hooks/useAttendances";
import { useClientIntentions } from "@hooks/useIntentions";
import { useAuthStore } from "@stores/authStore";
import { useRatedStore } from "@stores/ratedStore";
import { SkeletonList } from "@components/Skeleton";
import { RatingModal } from "@components/RatingModal";
import { AttendanceDetailModal } from "@components/AttendanceDetailModal";
import { ClientAttendance } from "@services/attendanceService";
import { intentionsService } from "@services/intentionsService";
import { swapOfferService } from "@services/swapOfferService";
import { usePendingSwapStore } from "@stores/pendingSwapStore";
import { useOutOfQueueSwap } from "@hooks/useOutOfQueueSwap";
import { groupIntentionsByDay } from "@domain/schedule/agenda";
import { cardShadow } from "@utils/styles";
import { formatWaitTime, formatClockTime } from "@domain/queue/types";

const HISTORY_STATUS: Record<string, { label: string; color: string }> = {
  FINISHED: { label: "Concluído", color: "#3B7A3F" },
  CANCELLED: { label: "Cancelado", color: "#E63946" },
  LATE: { label: "Atrasado", color: "#F59E0B" },
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
  const { activeQueue, remaining, color, isInQueue, isBeingAttended, isPaused } = useQueueCountdown();
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
  const [cancellingSwapId, setCancellingSwapId] = useState<string | null>(null);

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

  const realizados = history.filter(
    (a) => a.status === "FINISHED" || a.status === "CANCELLED" || a.status === "LATE",
  );

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
    <VStack flex={1} bg="$gray700">
      <VStack px={15} pt={60}>
        <Header />
        <Heading fontFamily="$heading" fontSize="$2xl" mt="$4">
          Atendimentos
        </Heading>
      </VStack>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3B7A3F" colors={["#3B7A3F"]} />
        }
      >
        <VStack mt="$6" px={15}>
          <Text
            size="xs"
            color="$gray300"
            fontFamily="$heading"
            mb="$2"
          >
            EM ANDAMENTO
          </Text>

          {activeQueue && (isInQueue || emAtendimento) ? (
            <TouchableOpacity onPress={handleGoToQueue}>
              <Box bg="$white" p="$4" borderRadius="$2xl" style={cardShadow} borderWidth="$1" borderColor={emAtendimento ? "#3B7A3F" : color}>
                <HStack alignItems="center" gap="$3">
                  <Queue size={24} color={emAtendimento ? "#3B7A3F" : color} />
                  <VStack flex={1}>
                    <Text fontFamily="$heading" size="sm">
                      {activeQueue.establishmentName}
                    </Text>
                    <Text size="xs" color="$gray300">
                      {activeQueue.professionalName}
                    </Text>
                  </VStack>
                  <Badge bg={emAtendimento ? "#3B7A3F" : color} borderRadius="$full" px="$3" py="$1">
                    <BadgeText color="$white" size="xs">
                      {isBeingAttended ? "Em atendimento" : isPaused ? "Pausado" : formatWaitTime(remaining)}
                    </BadgeText>
                  </Badge>
                  <CaretRight size={18} color="#9CA3AF" />
                </HStack>
              </Box>
            </TouchableOpacity>
          ) : (
            <Box bg="$white" p="$4" borderRadius="$2xl" style={cardShadow}>
              <Text size="sm" color="$gray300" textAlign="center">
                Nenhum atendimento em andamento
              </Text>
            </Box>
          )}
        </VStack>

        {pendingSwaps.length > 0 && (
          <VStack mt="$6" px={15}>
            <Text size="xs" color="$gray300" fontFamily="$heading" mb="$2">
              PEDIDOS DE TROCA
            </Text>

            <VStack gap="$3">
              {pendingSwaps.map((s) => (
                <Box key={s.offerId} bg="$white" p="$4" borderRadius="$2xl" style={cardShadow}>
                  <HStack alignItems="center" gap="$3">
                    <ArrowsLeftRight size={22} color="#2F432F" />
                    <VStack flex={1}>
                      <Text fontFamily="$heading" size="sm">
                        {s.professionalName}
                      </Text>
                      <Text size="xs" color="$gray300">
                        {s.establishmentName}
                      </Text>
                      <Text size="xs" color="$gray400" mt="$1">
                        Aguardando alguém da fila ceder o lugar
                      </Text>
                    </VStack>
                    <TouchableOpacity
                      onPress={() => handleCancelSwap(s.offerId, s.professionalName)}
                      disabled={cancellingSwapId === s.offerId}
                    >
                      <Text size="xs" color="$red500" fontFamily="$heading">
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
          <VStack mt="$6" px={15}>
            <Text size="xs" color="$gray300" fontFamily="$heading" mb="$2">
              AGENDAMENTOS
            </Text>

            <VStack gap="$3">
              {intentionGroups.map((group) => (
                <VStack key={group.day.toISOString()} gap="$2">
                  <Text size="xs" color="$gray400" fontFamily="$heading">
                    {group.dayLabel}
                  </Text>
                  {group.items.map((i) => (
                    <Box key={i.id} bg="$white" p="$4" borderRadius="$2xl" style={cardShadow}>
                      <HStack alignItems="center" gap="$3">
                        <CalendarBlank size={22} color="#2F432F" />
                        <VStack flex={1}>
                          <Text fontFamily="$heading" size="sm">
                            {i.professionalName}
                          </Text>
                          <Text size="xs" color="$gray300">
                            {i.services.map((s) => s.customName).join(", ") || i.establishmentName}
                          </Text>
                          <Text size="xs" color="$gray400" mt="$1">
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
                          <Text size="xs" color="$red500" fontFamily="$heading">
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

        <VStack mt="$6" px={15}>
          <Text
            size="xs"
            color="$gray300"
            fontFamily="$heading"
            mb="$2"
          >
            REALIZADOS
          </Text>

          {isLoading ? (
            <SkeletonList count={3} />
          ) : realizados.length === 0 ? (
            <Center py="$8">
              <Clock size={40} color="#9CA3AF" />
              <Text size="sm" color="$gray300" mt="$2">
                Nenhum atendimento realizado ainda
              </Text>
            </Center>
          ) : (
            <VStack gap="$3">
              {realizados.map((a) => {
                const st = HISTORY_STATUS[a.status] ?? {
                  label: a.status,
                  color: "#9CA3AF",
                };
                const canRate = a.status === "FINISHED" && !ratedIds.includes(a.id);
                return (
                  <TouchableOpacity key={a.id} activeOpacity={0.7} onPress={() => setDetailFor(a)}>
                    <Box bg="$white" p="$4" borderRadius="$2xl" style={cardShadow}>
                      <HStack justifyContent="space-between" alignItems="flex-start">
                        <VStack flex={1} pr="$2">
                          <Text fontFamily="$heading" size="sm">
                            {a.professionalName}
                          </Text>
                          <Text size="xs" color="$gray300">
                            {a.services.map((s) => s.customName).join(", ") || "—"}
                          </Text>
                          <Text size="xs" color="$gray400" mt="$1">
                            {formatDateTime(a.startTime ?? a.scheduledTime)}
                          </Text>
                        </VStack>
                        <VStack alignItems="flex-end" gap="$1">
                          <Badge bg={st.color} borderRadius="$full" px="$3" py="$1">
                            <BadgeText color="$white" size="xs">
                              {st.label}
                            </BadgeText>
                          </Badge>
                          <Text size="xs" color="$gray300">
                            R$ {a.totalValue.toFixed(2)}
                          </Text>
                        </VStack>
                      </HStack>
                      <HStack alignItems="center" gap="$1" mt="$3">
                        <CaretRight size={13} color={canRate ? "#FFB703" : "#9CA3AF"} weight="bold" />
                        <Text size="xs" color="$gray300" fontFamily="$heading">
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

      <AttendanceDetailModal
        attendance={detailFor}
        canRate={!!detailFor && detailFor.status === "FINISHED" && !ratedIds.includes(detailFor.id)}
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
    </VStack>
  );
}
