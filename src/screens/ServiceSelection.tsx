import { useState, useEffect } from "react";
import { Alert, TouchableOpacity, ScrollView } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  VStack,
  Box,
  Text,
  Heading,
  HStack,
  Center,
} from "@gluestack-ui/themed";
import { Check } from "phosphor-react-native";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { Header } from "@components/Header";
import { Button } from "@components/Button";
import { SkeletonList } from "@components/Skeleton";
import { ScheduleModal } from "@components/ScheduleModal";
import { cardShadow } from "@utils/styles";
import { ServiceItemResponse } from "@domain/professional/types";
import { establishmentService } from "@services/establishmentService";
import { cutRequestService } from "@services/cutRequestService";
import { useAuthStore } from "@stores/authStore";

type RouteParams = {
  professionalId: string;
  professionalName: string;
  establishmentId: string;
  establishmentName: string;
  estimatedWaitMinutes: number;
  establishmentOpen?: boolean;
};

export function ServiceSelection() {
  const route = useRoute();
  const navigation = useNavigation<AppNavigatorRoutesProps>();
  const {
    professionalId,
    professionalName,
    establishmentId,
    establishmentName,
    estimatedWaitMinutes,
    establishmentOpen,
  } = route.params as RouteParams;
  // Ausente = aberta (fluxos legados). false = fila fechada agora.
  const storeOpen = establishmentOpen ?? true;

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);

  const [services, setServices] = useState<ServiceItemResponse[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [isRequestingCut, setIsRequestingCut] = useState(false);

  useEffect(() => {
    establishmentService
      .getServiceItemsByProfessional(professionalId)
      .then(({ data }) => {
        setServices(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Erro ao carregar serviços");
        setIsLoading(false);
      });
  }, [professionalId]);

  function toggleService(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  const selectedServices = services.filter((s) => selectedIds.includes(s.id));
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalMinutes = selectedServices.reduce(
    (sum, s) => sum + (s.weeklyAverageDurationInMinutes ?? 30),
    0,
  );

  // Vai pra fila. Hoje sempre "agora" (sem targetTime): o agendamento #40 foi
  // revertido para "em breve" ate o backend honrar a intencao (HANDOFF §12.1). O
  // parametro targetTime segue aqui para religar o agendamento sem retrabalho.
  // Portao de auth: a verificacao de token acontece AQUI, ja com os servicos
  // escolhidos. Visitante -> login/cadastro levando a selecao (e o targetTime);
  // ao autenticar, o Login/SignUp redireciona pra queueStatus e cria o atendimento.
  function goToQueue(targetTime?: string) {
    const payload = {
      professionalId,
      professionalName,
      establishmentId,
      establishmentName,
      estimatedWaitMinutes,
      serviceItemIds: selectedIds,
      ...(targetTime ? { targetTime } : {}),
    };
    if (!isAuthenticated) {
      navigation.navigate("login", { redirectTo: "queueStatus", ...payload });
      return;
    }
    navigation.navigate("queueStatus", payload);
  }

  function handleConfirm() {
    goToQueue();
  }

  // Fila fechada agora: "Solicitar corte" (BUG5 C2) — pedido sob aprovação com
  // validade de 5min. Visitante passa pelo mesmo portão de auth da fila (após
  // logar, o create dá 409 e o QueueStatus oferece o corte por lá).
  async function handleRequestCut() {
    if (selectedIds.length === 0 || isRequestingCut) return;
    if (!isAuthenticated || !accessToken) {
      goToQueue();
      return;
    }
    setIsRequestingCut(true);
    try {
      await cutRequestService.create(
        { professionalId, establishmentId, serviceItemIds: selectedIds },
        accessToken,
      );
      Alert.alert(
        "Pedido enviado! ⏳",
        "O profissional tem 5 minutos para responder. Você será avisado aqui no app.",
      );
      navigation.navigate("home");
    } catch (error: any) {
      const code = error.response?.data?.code;
      const msg =
        code === "CUT_REQUEST_NOT_ALLOWED"
          ? "A loja está aberta agora — dá para entrar na fila normalmente."
          : error.response?.data?.message || "Erro ao enviar o pedido de corte";
      Alert.alert("Erro", msg);
    } finally {
      setIsRequestingCut(false);
    }
  }

  if (isLoading) {
    return (
      <VStack flex={1} px={15} pt={60} pb={30} bg="$gray700">
        <Header showBackButton />
        <VStack mt="$6">
          <SkeletonList count={4} />
        </VStack>
      </VStack>
    );
  }

  if (error) {
    return (
      <VStack flex={1} px={15} pt={60} pb={30} bg="$gray700">
        <Header showBackButton />
        <Center flex={1}>
          <Text color="$red500" textAlign="center">{error}</Text>
          <Button title="Voltar" mt="$4" onPress={() => navigation.goBack()} />
        </Center>
      </VStack>
    );
  }

  return (
    <VStack flex={1} px={15} pt={60} pb={30} bg="$gray700">
      <Header showBackButton />

      <Heading fontFamily="$heading" fontSize="$2xl" mt="$4">
        Selecione os serviços
      </Heading>
      <Text size="sm" color="$gray300" mt="$1" mb="$4">
        {professionalName} — {establishmentName}
      </Text>

      {services.length === 0 ? (
        <Center flex={1}>
          <Text color="$gray300">Nenhum serviço disponível para este profissional</Text>
          <Button title="Voltar" mt="$4" onPress={() => navigation.goBack()} />
        </Center>
      ) : (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
            <VStack gap="$3">
              {services.map((service) => {
                const isSelected = selectedIds.includes(service.id);
                return (
                  <TouchableOpacity
                    key={service.id}
                    onPress={() => toggleService(service.id)}
                    testID={`service-${service.id}`}
                  >
                    <Box
                      bg="$white"
                      p="$4"
                      borderRadius="$2xl"
                      style={cardShadow}
                      borderWidth={isSelected ? "$2" : "$0"}
                      borderColor="$green500"
                    >
                      <HStack justifyContent="space-between" alignItems="center">
                        <VStack flex={1}>
                          <Text fontFamily="$heading" size="sm">
                            {service.customName}
                          </Text>
                          <Text size="xs" color="$gray300" mt="$1">
                            {service.weeklyAverageDurationInMinutes ?? 30} min
                          </Text>
                        </VStack>
                        <HStack alignItems="center" gap="$3">
                          <Text fontFamily="$heading" color="$green500">
                            R$ {service.price.toFixed(2)}
                          </Text>
                          {isSelected && (
                            <Box
                              bg="$green500"
                              borderRadius="$full"
                              w={24}
                              h={24}
                              alignItems="center"
                              justifyContent="center"
                            >
                              <Check size={16} color="#FFFFFF" weight="bold" />
                            </Box>
                          )}
                        </HStack>
                      </HStack>
                    </Box>
                  </TouchableOpacity>
                );
              })}
            </VStack>
          </ScrollView>

          {selectedIds.length > 0 && (
            <Box position="absolute" bottom={30} left={15} right={15}>
              <Box bg="$white" p="$4" borderRadius="$2xl" style={cardShadow} mb="$3">
                <HStack justifyContent="space-between">
                  <Text size="sm" color="$gray300">
                    {selectedIds.length} serviço(s) — {totalMinutes} min
                  </Text>
                  <Text fontFamily="$heading" color="$green500">
                    R$ {totalPrice.toFixed(2)}
                  </Text>
                </HStack>
              </Box>
              {/* Fila fechada agora: sem "entrar na fila" — as ações são
                  Solicitar corte + Agendar (badge AGENDAR, Andre 2026-07-23). */}
              {storeOpen ? (
                <Button
                  title="Confirmar e entrar na fila"
                  onPress={handleConfirm}
                />
              ) : (
                <Button
                  title={isRequestingCut ? "Enviando pedido..." : "Solicitar corte"}
                  isDisabled={isRequestingCut}
                  onPress={handleRequestCut}
                />
              )}
              <Button
                title="Agendar para depois"
                variant="outline"
                mt="$2"
                onPress={() => setShowSchedule(true)}
              />
            </Box>
          )}
        </>
      )}

      <ScheduleModal
        visible={showSchedule}
        onClose={() => setShowSchedule(false)}
      />
    </VStack>
  );
}
