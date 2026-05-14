import { useState } from "react";
import { Alert, ActivityIndicator } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { VStack, Box, Text, Heading, Center, HStack } from "@gluestack-ui/themed";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { Header } from "@components/Header";
import { Button } from "@components/Button";
import { canCancelAttendance, formatWaitTime } from "@domain/queue/types";
import { useQueuePosition } from "@hooks/useQueue";
import { useEstablishment, useProfessionalsWithQueue } from "@hooks/useEstablishments";
import { useAuthStore } from "@stores/authStore";
import { attendanceService } from "@services/attendanceService";

type RouteParams = {
  professionalId: string;
  establishmentId: string;
};

export function QueueStatus() {
  const route = useRoute();
  const navigation = useNavigation<AppNavigatorRoutesProps>();
  const { professionalId, establishmentId } = route.params as RouteParams;

  const { data: queueData, isLoading: isLoadingQueue } = useQueuePosition(professionalId);
  const { data: establishment } = useEstablishment(establishmentId);
  const { data: professionals = [] } = useProfessionalsWithQueue(establishmentId);
  const accessToken = useAuthStore((s) => s.accessToken);

  const professional = professionals.find((p) => p.id === professionalId);
  const [attendanceId, setAttendanceId] = useState<string | null>(null);

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
            navigation.navigate("home");
          },
        },
      ]
    );
  }

  function handleGoHome() {
    navigation.navigate("home");
  }

  if (isLoadingQueue) {
    return (
      <Center flex={1}>
        <ActivityIndicator size="large" color="#22C55E" />
        <Text mt="$2">Carregando fila...</Text>
      </Center>
    );
  }

  const position = queueData?.position ?? 0;
  const estimatedWait = queueData?.estimatedWaitMinutes ?? 0;
  const status = "SCHEDULED" as const;
  const canCancel = canCancelAttendance(status);

  return (
    <VStack flex={1} px={15} pt={60} pb={30} bg="$gray700">
      <Header />

      <Center flex={1}>
        <Heading fontFamily="$heading" fontSize="$2xl" textAlign="center">
          Você está na fila!
        </Heading>

        <Box
          bg="$white"
          p="$6"
          mt="$6"
          borderRadius="$xl"
          borderWidth="$2"
          borderColor="$green500"
          w="$full"
          alignItems="center"
        >
          <Text size="sm" color="$gray300">
            Sua posição
          </Text>
          <Heading
            fontFamily="$heading"
            fontSize="$6xl"
            color="$green500"
            testID="queue-position"
          >
            {position}º
          </Heading>

          <Box
            w="$full"
            h="$px"
            bg="$gray500"
            my="$4"
          />

          <HStack w="$full" justifyContent="space-between" mb="$3">
            <Text size="sm" color="$gray300">
              Estabelecimento
            </Text>
            <Text size="sm" fontFamily="$heading">
              {establishment?.name ?? "..."}
            </Text>
          </HStack>

          <HStack w="$full" justifyContent="space-between" mb="$3">
            <Text size="sm" color="$gray300">
              Profissional
            </Text>
            <Text size="sm" fontFamily="$heading">
              {professional?.name ?? "..."}
            </Text>
          </HStack>

          <HStack w="$full" justifyContent="space-between" mb="$3">
            <Text size="sm" color="$gray300">
              Tempo estimado
            </Text>
            <Text size="sm" fontFamily="$heading" color="$green500">
              {formatWaitTime(estimatedWait)}
            </Text>
          </HStack>

          <HStack w="$full" justifyContent="space-between">
            <Text size="sm" color="$gray300">
              Status
            </Text>
            <Text size="sm" fontFamily="$heading">
              {status === "SCHEDULED" ? "Agendado" : status}
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
        <Button title="Voltar ao início" onPress={handleGoHome} />
      </VStack>
    </VStack>
  );
}
