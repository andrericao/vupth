import { useState, useEffect } from "react";
import { FlatList, TouchableOpacity } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  VStack,
  Box,
  Text,
  Heading,
  HStack,
  Center,
  Badge,
  BadgeText,
} from "@gluestack-ui/themed";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { Header } from "@components/Header";
import { Button } from "@components/Button";
import { Establishment } from "@domain/establishment/types";
import { ProfessionalWithQueue } from "@domain/professional/types";
import { MOCK_ESTABLISHMENTS } from "@domain/establishment/mockData";
import { MOCK_PROFESSIONALS } from "@domain/professional/mockData";
import { formatWaitTime } from "@domain/queue/types";
import { isAuthenticated } from "@domain/auth/authState";

type RouteParams = {
  establishmentId: string;
};

function ProfessionalCard({
  professional,
  onPress,
}: {
  professional: ProfessionalWithQueue;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} testID={`professional-${professional.id}`}>
      <Box
        bg="$white"
        p="$4"
        mb="$3"
        borderRadius="$lg"
        borderWidth="$1"
        borderColor="$green500"
      >
        <HStack justifyContent="space-between" alignItems="center">
          <VStack flex={1}>
            <Heading size="sm" fontFamily="$heading">
              {professional.name}
            </Heading>
            <Text size="xs" color="$gray300" mt="$1">
              {professional.specialty}
            </Text>
          </VStack>
          <VStack alignItems="flex-end">
            <Text size="sm" fontFamily="$heading" color="$green500">
              {professional.attendancesInQueue.length} na fila
            </Text>
            <Text size="xs" color="$gray300">
              ~{formatWaitTime(professional.estimatedWaitMinutes)}
            </Text>
          </VStack>
        </HStack>
      </Box>
    </TouchableOpacity>
  );
}

function ServiceItemRow({
  name,
  price,
  duration,
}: {
  name: string;
  price: number;
  duration: number;
}) {
  return (
    <HStack
      justifyContent="space-between"
      py="$2"
      borderBottomWidth="$1"
      borderBottomColor="$gray500"
    >
      <Text size="sm" flex={1}>
        {name}
      </Text>
      <Text size="sm" color="$green500" fontFamily="$heading" mr="$4">
        R$ {price.toFixed(2)}
      </Text>
      <Text size="xs" color="$gray300">
        {duration} min
      </Text>
    </HStack>
  );
}

export function EstablishmentDetail() {
  const route = useRoute();
  const navigation = useNavigation<AppNavigatorRoutesProps>();
  const { establishmentId } = route.params as RouteParams;

  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [professionals, setProfessionals] = useState<ProfessionalWithQueue[]>([]);

  useEffect(() => {
    const found = MOCK_ESTABLISHMENTS.find((e) => e.id === establishmentId);
    setEstablishment(found ?? null);

    const profs = MOCK_PROFESSIONALS[establishmentId] ?? [];
    setProfessionals(profs);
  }, [establishmentId]);

  function handleJoinQueue(professionalId: string) {
    if (!isAuthenticated()) {
      navigation.navigate("login", {
        redirectTo: "queueStatus",
        establishmentId,
        professionalId,
      });
      return;
    }

    navigation.navigate("queueStatus", {
      professionalId,
      establishmentId,
    });
  }

  function handleJoinShortestQueue() {
    if (professionals.length === 0) return;

    const shortest = professionals.reduce((prev, curr) =>
      curr.estimatedWaitMinutes < prev.estimatedWaitMinutes ? curr : prev
    );

    handleJoinQueue(shortest.id);
  }

  if (!establishment) {
    return (
      <Center flex={1}>
        <Text>Estabelecimento não encontrado</Text>
      </Center>
    );
  }

  const minWait =
    professionals.length > 0
      ? Math.min(...professionals.map((p) => p.estimatedWaitMinutes))
      : 0;

  return (
    <VStack flex={1} px={15} pt={60} pb={30} bg="$gray700">
      <Header showBackButton />

      <Center mt="$4">
        <Heading fontFamily="$heading" fontSize="$3xl">
          {establishment.name}
        </Heading>
        <HStack mt="$2" gap="$2" alignItems="center">
          <Badge
            bg={establishment.isOpen ? "$green500" : "$gray400"}
            borderRadius="$full"
            px="$3"
            py="$1"
          >
            <BadgeText color="$white" size="xs">
              {establishment.isOpen ? "Aberto" : "Fechado"}
            </BadgeText>
          </Badge>
          <Text size="sm" color="$gray300">
            Espera mínima: {formatWaitTime(minWait)}
          </Text>
        </HStack>
      </Center>

      {establishment.serviceItems.length > 0 && (
        <Box mt="$4">
          <Heading size="sm" fontFamily="$heading" mb="$2">
            Serviços
          </Heading>
          {establishment.serviceItems.map((item) => (
            <ServiceItemRow
              key={item.id}
              name={item.customName}
              price={item.price}
              duration={item.estimatedMinutes}
            />
          ))}
        </Box>
      )}

      <Heading size="sm" fontFamily="$heading" mt="$4" mb="$2">
        Profissionais ({professionals.length})
      </Heading>

      <FlatList
        data={professionals}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <ProfessionalCard
            professional={item}
            onPress={() => handleJoinQueue(item.id)}
          />
        )}
        ListEmptyComponent={
          <Center mt="$4">
            <Text color="$gray300">Nenhum profissional disponível</Text>
          </Center>
        }
      />

      {establishment.isOpen && professionals.length > 0 && (
        <Button
          title="Entrar na fila (menor espera)"
          onPress={handleJoinShortestQueue}
          mt="$3"
        />
      )}
    </VStack>
  );
}
