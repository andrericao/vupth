import { FlatList, TouchableOpacity, Alert } from "react-native";
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
import { Star, Info } from "phosphor-react-native";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { Header } from "@components/Header";
import { Button } from "@components/Button";
import { SkeletonList } from "@components/Skeleton";
import { cardShadow } from "@utils/styles";
import { ProfessionalWithQueue } from "@domain/professional/types";
import { resolveRating } from "@domain/establishment/rating";
import { formatSpecialty } from "@domain/establishment/serviceType";
import { isEffectivelyOpen } from "@domain/establishment/types";
import { formatWaitTime } from "@domain/queue/types";
import { useEstablishment, useProfessionalsWithQueue } from "@hooks/useEstablishments";
import { useQueueSocket } from "@hooks/useQueueSocket";

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
        borderRadius="$2xl"
        style={cardShadow}
      >
        <HStack justifyContent="space-between" alignItems="center">
          <VStack flex={1}>
            <Heading size="sm" fontFamily="$heading">
              {professional.name}
            </Heading>
            {/* `specialty` e texto livre no backend, mas parte dos cadastros
                veio com a categoria em INGLES — era isso que aparecia aqui
                (Andre 2026-08-06). `formatSpecialty` traduz o que reconhece e
                preserva quem escreveu a especialidade de verdade. */}
            <Text size="xs" color="$gray300" mt="$1">
              {formatSpecialty(professional.specialty)}
            </Text>
            {(() => {
              const r = resolveRating(
                professional.rating_average,
                professional.rating_count,
                professional.id,
              );
              return (
                <HStack alignItems="center" gap="$1" mt="$1">
                  <Star size={13} color="#FFB703" weight="fill" />
                  <Text size="xs" color="$gray400" fontFamily="$heading">
                    {r.value.toFixed(1)}
                    {r.real && r.count != null ? ` (${r.count})` : ""}
                  </Text>
                </HStack>
              );
            })()}
          </VStack>
          <VStack alignItems="flex-end">
            <Text size="sm" fontFamily="$heading" color="$green500">
              {professional.queue_count ?? 0} na fila
            </Text>
            <Text size="xs" color="$gray300">
              {formatWaitTime(professional.estimated_wait_minutes ?? 0)}
            </Text>
          </VStack>
        </HStack>
      </Box>
    </TouchableOpacity>
  );
}

export function EstablishmentDetail() {
  const route = useRoute();
  const navigation = useNavigation<AppNavigatorRoutesProps>();
  const { establishmentId } = route.params as RouteParams;

  const { data: establishment, isLoading, isError } = useEstablishment(establishmentId);
  const { data: professionals = [] } = useProfessionalsWithQueue(establishmentId);

  // Tempo real: atualiza a fila via WebSocket; o polling vira fallback (backend 18b)
  useQueueSocket(establishmentId);

  function handleSelectProfessional(professionalId: string) {
    const prof = professionals.find((p) => p.id === professionalId);
    if (!establishment) return;

    // Loja fechada NÃO bloqueia mais (Andre 2026-07-23): o fluxo segue até os
    // serviços e lá as ações viram "Solicitar corte" + "Agendar para depois"
    // (o backend continua guardião — gate C1). Visitante (sem login) navega e vê
    // preços; o portão de auth fica na ServiceSelection.
    navigation.navigate("serviceSelection", {
      professionalId,
      professionalName: prof?.name ?? "",
      establishmentId,
      establishmentName: establishment?.name ?? "",
      estimatedWaitMinutes: prof?.estimated_wait_minutes ?? 0,
      establishmentOpen: isEffectivelyOpen(establishment),
    });
  }

  function handleSelectShortestQueue() {
    if (professionals.length === 0) return;

    const shortest = professionals.reduce((prev, curr) =>
      (curr.estimated_wait_minutes ?? 0) < (prev.estimated_wait_minutes ?? 0) ? curr : prev
    );

    handleSelectProfessional(shortest.id);
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

  if (isError || !establishment) {
    return (
      <Center flex={1}>
        <Text>Estabelecimento não encontrado</Text>
      </Center>
    );
  }

  const minWait =
    professionals.length > 0
      ? Math.min(...professionals.map((p) => p.estimated_wait_minutes ?? 0))
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
            bg={isEffectivelyOpen(establishment) ? "$green500" : "$amber500"}
            borderRadius="$full"
            px="$3"
            py="$1"
          >
            <BadgeText color={isEffectivelyOpen(establishment) ? "$white" : "#1A281A"} size="xs">
              {isEffectivelyOpen(establishment) ? "Aberto" : "AGENDAR"}
            </BadgeText>
          </Badge>
          <Text size="sm" color="$gray300">
            Espera mínima: {formatWaitTime(minWait)}
          </Text>
        </HStack>
      </Center>

      <Heading size="sm" fontFamily="$heading" mt="$4" mb="$2">
        Profissionais: {professionals.length}
      </Heading>

      <FlatList
        data={professionals}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <ProfessionalCard
            professional={item}
            onPress={() => handleSelectProfessional(item.id)}
          />
        )}
        ListEmptyComponent={
          <Center mt="$4">
            <Text color="$gray300">Nenhum profissional disponível</Text>
          </Center>
        }
      />

      {isEffectivelyOpen(establishment) && professionals.length > 0 && (
        <Button
          title="Entrar na fila (menor espera)"
          onPress={handleSelectShortestQueue}
          mt="$3"
        />
      )}

      {/* Loja fechada agora (inclui OPEN fora do horário): no lugar do botão de
          fila, banner âmbar acionável (Andre 2026-07-23) — o fluxo segue pelo
          profissional, onde as ações são Agendar / Solicitar corte. */}
      {!isEffectivelyOpen(establishment) && (
        <TouchableOpacity
          onPress={() =>
            Alert.alert(
              "Fila fechada agora",
              "A fila não está recebendo clientes neste momento. Escolha um profissional para AGENDAR um horário ou SOLICITAR um corte (o profissional responde em até 5 minutos).",
            )
          }
        >
          <Box
            bg="$amber100"
            borderWidth="$1"
            borderColor="$amber500"
            borderRadius="$2xl"
            px="$4"
            py="$3"
            mt="$3"
          >
            <HStack alignItems="center" gap="$2">
              <Info size={18} color="#92400e" />
              <Text size="xs" color="$amber800" fontFamily="$heading" flex={1}>
                Fila fechada agora — escolha um profissional para agendar ou
                solicitar um corte.
              </Text>
            </HStack>
          </Box>
        </TouchableOpacity>
      )}
    </VStack>
  );
}
