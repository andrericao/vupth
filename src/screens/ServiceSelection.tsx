import { useState, useEffect } from "react";
import { TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
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
import { ServiceItemResponse } from "@domain/professional/types";
import { establishmentService } from "@services/establishmentService";

type RouteParams = {
  professionalId: string;
  professionalName: string;
  establishmentId: string;
  establishmentName: string;
  estimatedWaitMinutes: number;
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
  } = route.params as RouteParams;

  const [services, setServices] = useState<ServiceItemResponse[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  function handleConfirm() {
    navigation.navigate("queueStatus", {
      professionalId,
      professionalName,
      establishmentId,
      establishmentName,
      estimatedWaitMinutes,
      serviceItemIds: selectedIds,
    });
  }

  if (isLoading) {
    return (
      <Center flex={1} bg="$gray700">
        <ActivityIndicator size="large" color="#00B37E" />
        <Text mt="$2" color="$gray300">Carregando serviços...</Text>
      </Center>
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
                      borderRadius="$lg"
                      borderWidth="$2"
                      borderColor={isSelected ? "$green500" : "$gray500"}
                    >
                      <HStack justifyContent="space-between" alignItems="center">
                        <VStack flex={1}>
                          <Text fontFamily="$heading" size="sm">
                            {service.customName}
                          </Text>
                          <Text size="xs" color="$gray300" mt="$1">
                            ~{service.weeklyAverageDurationInMinutes ?? 30} min
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
              <Box bg="$white" p="$4" borderRadius="$lg" mb="$3">
                <HStack justifyContent="space-between">
                  <Text size="sm" color="$gray300">
                    {selectedIds.length} serviço(s) — ~{totalMinutes} min
                  </Text>
                  <Text fontFamily="$heading" color="$green500">
                    R$ {totalPrice.toFixed(2)}
                  </Text>
                </HStack>
              </Box>
              <Button
                title="Confirmar e entrar na fila"
                onPress={handleConfirm}
              />
            </Box>
          )}
        </>
      )}
    </VStack>
  );
}
