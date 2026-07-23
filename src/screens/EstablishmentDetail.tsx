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
            <Text size="xs" color="$gray300" mt="$1">
              {professional.specialty}
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

    // Loja fechada AGORA (inclui OPEN fora do horário — is_open efetivo):
    // ninguém entra na fila. (Futuro: manifestar interesse — INTENÇÃO.)
    if (!establishment || !isEffectivelyOpen(establishment)) {
      Alert.alert(
        "Estabelecimento fechado",
        "Este estabelecimento está fechado agora, então não é possível entrar na fila. Em breve você poderá manifestar interesse para a próxima abertura.",
      );
      return;
    }

    // Visitante (sem login) pode navegar e ver os servicos/precos: a verificacao
    // de token acontece so na ENTRADA da fila (apos escolher os servicos), na
    // ServiceSelection. Aqui nao barra mais.
    navigation.navigate("serviceSelection", {
      professionalId,
      professionalName: prof?.name ?? "",
      establishmentId,
      establishmentName: establishment?.name ?? "",
      estimatedWaitMinutes: prof?.estimated_wait_minutes ?? 0,
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
            bg={isEffectivelyOpen(establishment) ? "$green500" : "$gray400"}
            borderRadius="$full"
            px="$3"
            py="$1"
          >
            <BadgeText color="$white" size="xs">
              {isEffectivelyOpen(establishment) ? "Aberto" : "Fechado"}
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
          fila, um "i" explicativo (pedido Andre 2026-07-23). Quando a barra de
          encaixe (F5) entrar, isto vira o botão "Agendar". */}
      {!isEffectivelyOpen(establishment) && (
        <TouchableOpacity
          onPress={() =>
            Alert.alert(
              "Estabelecimento fechado",
              "Fora do horário de funcionamento não dá para entrar na fila. Em breve você poderá agendar um horário para quando reabrir.",
            )
          }
        >
          <Box
            bg="$white"
            borderRadius="$2xl"
            px="$4"
            py="$3"
            mt="$3"
            style={cardShadow}
          >
            <HStack alignItems="center" gap="$2">
              <Info size={18} color="#3B7A3F" />
              <Text size="xs" color="$gray300" flex={1}>
                Fechado agora — em breve você poderá agendar para a reabertura.
              </Text>
            </HStack>
          </Box>
        </TouchableOpacity>
      )}
    </VStack>
  );
}
