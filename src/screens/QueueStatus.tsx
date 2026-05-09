import { useState, useEffect } from "react";
import { Alert } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { VStack, Box, Text, Heading, Center, HStack } from "@gluestack-ui/themed";

import { AppNavigatorRoutesProps } from "@routes/app.routes";
import { Header } from "@components/Header";
import { Button } from "@components/Button";
import { QueuePosition, canCancelAttendance, formatWaitTime } from "@domain/queue/types";
import { MOCK_QUEUE_POSITION } from "@domain/queue/mockData";
import { MOCK_PROFESSIONALS } from "@domain/professional/mockData";
import { MOCK_ESTABLISHMENTS } from "@domain/establishment/mockData";

type RouteParams = {
  professionalId: string;
  establishmentId: string;
};

export function QueueStatus() {
  const route = useRoute();
  const navigation = useNavigation<AppNavigatorRoutesProps>();
  const { professionalId, establishmentId } = route.params as RouteParams;

  const [queuePosition, setQueuePosition] = useState<QueuePosition | null>(null);

  useEffect(() => {
    // Simula dados da fila baseado nos mocks
    const establishment = MOCK_ESTABLISHMENTS.find((e) => e.id === establishmentId);
    const professionals = MOCK_PROFESSIONALS[establishmentId] ?? [];
    const professional = professionals.find((p) => p.id === professionalId);

    if (professional && establishment) {
      const position = professional.attendancesInQueue.length + 1;
      setQueuePosition({
        attendanceId: `mock-${Date.now()}`,
        position,
        estimatedWaitMinutes: position * 15,
        professionalName: professional.name,
        establishmentName: establishment.name,
        status: "SCHEDULED",
      });
    }
  }, [professionalId, establishmentId]);

  function handleCancel() {
    Alert.alert(
      "Cancelar atendimento",
      "Tem certeza que deseja sair da fila?",
      [
        { text: "Não", style: "cancel" },
        {
          text: "Sim, sair",
          style: "destructive",
          onPress: () => {
            // TODO: integrar com backend PUT /attendances/{id}/cancel
            navigation.navigate("home");
          },
        },
      ]
    );
  }

  function handleGoHome() {
    navigation.navigate("home");
  }

  if (!queuePosition) {
    return (
      <Center flex={1}>
        <Text>Carregando...</Text>
      </Center>
    );
  }

  const canCancel = canCancelAttendance(queuePosition.status);

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
            {queuePosition.position}º
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
              {queuePosition.establishmentName}
            </Text>
          </HStack>

          <HStack w="$full" justifyContent="space-between" mb="$3">
            <Text size="sm" color="$gray300">
              Profissional
            </Text>
            <Text size="sm" fontFamily="$heading">
              {queuePosition.professionalName}
            </Text>
          </HStack>

          <HStack w="$full" justifyContent="space-between" mb="$3">
            <Text size="sm" color="$gray300">
              Tempo estimado
            </Text>
            <Text size="sm" fontFamily="$heading" color="$green500">
              {formatWaitTime(queuePosition.estimatedWaitMinutes)}
            </Text>
          </HStack>

          <HStack w="$full" justifyContent="space-between">
            <Text size="sm" color="$gray300">
              Status
            </Text>
            <Text size="sm" fontFamily="$heading">
              {queuePosition.status === "SCHEDULED" ? "Agendado" : queuePosition.status}
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
