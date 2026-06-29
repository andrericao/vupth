import { useState, useCallback } from "react";
import { TouchableOpacity, RefreshControl } from "react-native";
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
import { Queue, Clock, CaretRight } from "phosphor-react-native";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { Header } from "@components/Header";
import { useQueueCountdown } from "@hooks/useQueueCountdown";
import { useClientAttendances } from "@hooks/useAttendances";
import { SkeletonList } from "@components/Skeleton";
import { RatingModal } from "@components/RatingModal";
import { AttendanceDetailModal } from "@components/AttendanceDetailModal";
import { ClientAttendance } from "@services/attendanceService";
import { cardShadow } from "@utils/styles";
import { formatWaitTime, formatClockTime } from "@domain/queue/types";

const HISTORY_STATUS: Record<string, { label: string; color: string }> = {
  FINISHED: { label: "Concluído", color: "#00B37E" },
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
  const { activeQueue, remaining, color, isInQueue, isBeingAttended } = useQueueCountdown();
  const { data: history = [], isLoading, refetch, isRefetching } = useClientAttendances();
  const [ratingFor, setRatingFor] = useState<{ id: string; name: string } | null>(null);
  const [detailFor, setDetailFor] = useState<ClientAttendance | null>(null);

  // Atualiza ao focar a aba (sem precisar fechar/reabrir o app).
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

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
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#00B37E" colors={["#00B37E"]} />
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

          {activeQueue && (isInQueue || isBeingAttended) ? (
            <TouchableOpacity onPress={handleGoToQueue}>
              <Box bg="$white" p="$4" borderRadius="$2xl" style={cardShadow} borderWidth="$1" borderColor={isBeingAttended ? "#00B37E" : color}>
                <HStack alignItems="center" gap="$3">
                  <Queue size={24} color={isBeingAttended ? "#00B37E" : color} />
                  <VStack flex={1}>
                    <Text fontFamily="$heading" size="sm">
                      {activeQueue.establishmentName}
                    </Text>
                    <Text size="xs" color="$gray300">
                      {activeQueue.professionalName}
                    </Text>
                  </VStack>
                  <Badge bg={isBeingAttended ? "#00B37E" : color} borderRadius="$full" px="$3" py="$1">
                    <BadgeText color="$white" size="xs">
                      {isBeingAttended ? "Em atendimento" : formatWaitTime(remaining)}
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
                const canRate = a.status === "FINISHED";
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
