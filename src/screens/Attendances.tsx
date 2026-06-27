import { TouchableOpacity, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
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
import { formatWaitTime } from "@domain/queue/types";

const HISTORY_STATUS: Record<string, { label: string; color: string }> = {
  FINISHED: { label: "Concluído", color: "#00B37E" },
  CANCELLED: { label: "Cancelado", color: "#EF4444" },
  LATE: { label: "Atrasado", color: "#F59E0B" },
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return "";
  }
}

export function Attendances() {
  const navigation = useNavigation<AppNavigatorRoutesProps>();
  const { activeQueue, remaining, color, isInQueue } = useQueueCountdown();
  const { data: history = [], isLoading } = useClientAttendances();

  const realizados = history.filter(
    (a) => a.status === "FINISHED" || a.status === "CANCELLED" || a.status === "LATE",
  );

  function handleGoToQueue() {
    if (!activeQueue) return;
    navigation.navigate("queueStatus", {
      professionalId: activeQueue.professionalId,
      establishmentId: activeQueue.establishmentId,
      professionalName: activeQueue.professionalName,
      establishmentName: activeQueue.establishmentName,
      estimatedWaitMinutes: activeQueue.estimatedMinutes,
    });
  }

  return (
    <VStack flex={1} bg="$gray700">
      <VStack px={15} pt={60}>
        <Header showBackButton />
        <Heading fontFamily="$heading" fontSize="$2xl" mt="$4">
          Atendimentos
        </Heading>
      </VStack>

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }}>
        <VStack mt="$6" px={15}>
          <Text
            size="xs"
            color="$gray300"
            fontFamily="$heading"
            mb="$2"
          >
            EM ANDAMENTO
          </Text>

          {isInQueue && activeQueue ? (
            <TouchableOpacity onPress={handleGoToQueue}>
              <Box bg="$white" p="$4" borderRadius="$lg" borderWidth="$1" borderColor={color}>
                <HStack alignItems="center" gap="$3">
                  <Queue size={24} color={color} />
                  <VStack flex={1}>
                    <Text fontFamily="$heading" size="sm">
                      {activeQueue.establishmentName}
                    </Text>
                    <Text size="xs" color="$gray300">
                      {activeQueue.professionalName}
                    </Text>
                  </VStack>
                  <Badge bg={color} borderRadius="$full" px="$3" py="$1">
                    <BadgeText color="$white" size="xs">~{formatWaitTime(remaining)}</BadgeText>
                  </Badge>
                  <CaretRight size={18} color="#9CA3AF" />
                </HStack>
              </Box>
            </TouchableOpacity>
          ) : (
            <Box bg="$white" p="$4" borderRadius="$lg">
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
            <Center py="$8">
              <ActivityIndicator size="large" color="#00B37E" />
            </Center>
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
                return (
                  <Box key={a.id} bg="$white" p="$4" borderRadius="$lg">
                    <HStack justifyContent="space-between" alignItems="flex-start">
                      <VStack flex={1} pr="$2">
                        <Text fontFamily="$heading" size="sm">
                          {a.professionalName}
                        </Text>
                        <Text size="xs" color="$gray300">
                          {a.services.map((s) => s.customName).join(", ") || "—"}
                        </Text>
                        <Text size="xs" color="$gray400" mt="$1">
                          {formatDate(a.scheduledTime)}
                          {a.durationInMinutes ? ` · ${a.durationInMinutes} min` : ""}
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
                  </Box>
                );
              })}
            </VStack>
          )}
        </VStack>
      </ScrollView>
    </VStack>
  );
}
