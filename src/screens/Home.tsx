import { useState, useCallback, useEffect } from "react";
import { FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { VStack, Box, Text, Heading, HStack, Badge, BadgeText, Center } from "@gluestack-ui/themed";

import { AppNavigatorRoutesProps, AppRoutes } from "@routes/auth.routes";
import { Header } from "@components/Header";
import { Input2 } from "@components/Input2";
import { Establishment, ServiceType, isEffectivelyOpen } from "@domain/establishment/types";
import { filterEstablishments } from "@domain/establishment/filter";
import { sortByProximity } from "@domain/establishment/proximity";
import { resolveRating } from "@domain/establishment/rating";
import { useEstablishments } from "@hooks/useEstablishments";
import { useAuthStore } from "@stores/authStore";
import { useLocationStore } from "@stores/locationStore";
import { LocationSelector } from "@components/LocationSelector";
import { useQueueCountdown } from "@hooks/useQueueCountdown";
import { useDoubleBackExit } from "@hooks/useDoubleBackExit";
import { SkeletonList } from "@components/Skeleton";
import { cardShadow } from "@utils/styles";
import { formatWaitTime } from "@domain/queue/types";
import { UserCircle, Queue, Clock, Star } from "phosphor-react-native";

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  BARBER: "Barbearia",
  BEAUTY_SALON: "Salão",
  EYEBROW: "Sobrancelha",
  NAIL_SALON: "Manicure",
  SPA: "Spa",
  CLINIC: "Clínica",
};

const SERVICE_FILTERS: { key: ServiceType | "ALL"; label: string }[] = [
  { key: "ALL", label: "Todos" },
  { key: "BARBER", label: "Barbearia" },
  { key: "BEAUTY_SALON", label: "Salão" },
  { key: "EYEBROW", label: "Sobrancelha" },
  { key: "NAIL_SALON", label: "Manicure" },
  { key: "SPA", label: "Spa" },
  { key: "CLINIC", label: "Clínica" },
];

function EstablishmentCard({
  establishment,
  onPress,
}: {
  establishment: Establishment;
  onPress: () => void;
}) {
  // "Aberta AGORA" efetiva (inclui horario de funcionamento) — loja OPEN fora
  // do horario mostra "Fechado" (feedback Andre 2026-07-22).
  const isOpen = isEffectivelyOpen(establishment);

  return (
    <TouchableOpacity onPress={onPress} testID={`establishment-${establishment.id}`}>
      <Box
        bg="$white"
        p="$4"
        mb="$3"
        borderRadius="$2xl"
        style={cardShadow}
      >
        <HStack justifyContent="space-between" alignItems="center">
          <VStack flex={1}>
            <Heading size="md" fontFamily="$heading">
              {establishment.name}
            </Heading>
            {establishment.services?.length > 0 && (
              <Text size="sm" color="$gray300" mt="$1">
                {establishment.services
                  .map((s) => SERVICE_TYPE_LABELS[s as ServiceType] ?? s)
                  .join(", ")}
              </Text>
            )}
            {establishment.address && (
              <Text size="xs" color="$gray400" mt="$1">
                {establishment.address.neighborhood}, {establishment.address.city}
              </Text>
            )}
            <HStack alignItems="center" gap="$3" mt="$2">
              {establishment.estimated_wait_minutes != null && (
                <HStack alignItems="center" gap="$1">
                  <Clock size={14} color="#3B7A3F" weight="fill" />
                  <Text size="xs" color="$green700" fontFamily="$heading">
                    {formatWaitTime(establishment.estimated_wait_minutes)}
                  </Text>
                </HStack>
              )}
              {(() => {
                // Card destaca a MAIOR estrela (melhor avaliado); cai na média
                // agregada e, por fim, no placeholder até o backend mandar.
                const r = resolveRating(
                  establishment.rating_best ?? establishment.rating_average,
                  establishment.rating_count,
                  establishment.id,
                );
                return (
                  <HStack alignItems="center" gap="$1">
                    <Star size={14} color="#FFB703" weight="fill" />
                    <Text size="xs" color="$gray300" fontFamily="$heading">
                      {r.value.toFixed(1)}
                      {r.real && r.count != null ? ` (${r.count})` : ""}
                    </Text>
                  </HStack>
                );
              })()}
            </HStack>
          </VStack>
          {/* Fechada não é beco sem saída: badge âmbar "AGENDAR" sinaliza que a
              fila está fechada mas dá pra agendar/solicitar (Andre 2026-07-23). */}
          <Badge
            bg={isOpen ? "$green500" : "$amber500"}
            borderRadius="$full"
            px="$3"
            py="$1"
          >
            <BadgeText color={isOpen ? "$white" : "#1A281A"} size="xs">
              {isOpen ? "Aberto" : "AGENDAR"}
            </BadgeText>
          </Badge>
        </HStack>
      </Box>
    </TouchableOpacity>
  );
}

export function Home() {
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<ServiceType | "ALL">("ALL");

  const navigation = useNavigation<AppNavigatorRoutesProps>();
  const route = useRoute<RouteProp<AppRoutes, "home">>();
  const { data: establishments = [], isLoading, isError, refetch, isRefetching } = useEstablishments();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { activeQueue, remaining, color, isInQueue } = useQueueCountdown();

  // Home é a raiz do stack: evita que um único "voltar" do Android feche o app.
  useDoubleBackExit();

  // Filtro vindo da aba Serviços (navigate("home", { filter })).
  const filterParam = route.params?.filter;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (filterParam) setSelectedFilter(filterParam);
  }, [filterParam]);

  // Ordena por proximidade (bairro→cidade→resto) quando o cliente definiu uma
  // localização; senão, ordem padrão (menor espera). Ver LocationSelector.
  const location = useLocationStore((s) => s.location);
  const filteredEstablishments = sortByProximity(
    filterEstablishments(establishments, search, selectedFilter),
    location,
  );

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  function handleEstablishmentPress(establishment: Establishment) {
    navigation.navigate("establishmentDetail", { establishmentId: establishment.id });
  }

  return (
    <VStack flex={1} px={15} pt={60} bg="$gray700">
      <Header />

      <HStack justifyContent="flex-end" mt="$2">
        {isAuthenticated ? (
          <TouchableOpacity onPress={() => navigation.navigate("profile")} testID="profile-icon">
            <UserCircle size={32} color="#3B7A3F" weight="fill" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => navigation.navigate("signUp", {})}>
            <Text size="sm" color="$green500" fontFamily="$heading">Cadastrar</Text>
          </TouchableOpacity>
        )}
      </HStack>

      {isInQueue && activeQueue && (
        <TouchableOpacity
          onPress={() => navigation.navigate("queueStatus", {
            professionalId: activeQueue.professionalId,
            professionalName: activeQueue.professionalName,
            establishmentId: activeQueue.establishmentId,
            establishmentName: activeQueue.establishmentName,
            estimatedWaitMinutes: activeQueue.estimatedMinutes,
            serviceItemIds: [],
          })}
        >
          <Box bg={color} p="$3" mt="$2" borderRadius="$lg">
            <HStack alignItems="center" gap="$2">
              <Queue size={20} color="#FFFFFF" />
              <Text color="$white" fontFamily="$heading" size="sm" flex={1}>
                Em fila {formatWaitTime(remaining)}
              </Text>
              <Text color="$white" size="xs">
                {activeQueue.establishmentName}
              </Text>
            </HStack>
          </Box>
        </TouchableOpacity>
      )}

      <Heading fontFamily="$heading" fontSize="$2xl" mt="$4" mb="$1">
        Estabelecimentos
      </Heading>

      <LocationSelector />

      <Input2
        placeholder="Buscar estabelecimento..."
        value={search}
        onChangeText={setSearch}
        showSearchIcon
        onClear={() => setSearch("")}
      />

      <Box mt="$3" mb="$2">
        <FlatList
          data={SERVICE_FILTERS}
          keyExtractor={(item) => item.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelectedFilter(item.key)}
              testID={`filter-${item.key}`}
            >
              <Box
                px="$4"
                py="$2"
                mr="$2"
                borderRadius="$full"
                bg={selectedFilter === item.key ? "$green500" : "$white"}
                borderWidth="$1"
                borderColor="$green500"
              >
                <Text
                  size="sm"
                  color={selectedFilter === item.key ? "$white" : "$green500"}
                  fontFamily="$heading"
                >
                  {item.label}
                </Text>
              </Box>
            </TouchableOpacity>
          )}
        />
      </Box>

      {isLoading ? (
        <SkeletonList count={4} />
      ) : isError ? (
        <Center mt="$10">
          <Text color="$red500">Erro ao carregar estabelecimentos</Text>
        </Center>
      ) : (
        <FlatList
          data={filteredEstablishments}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} colors={["#3B7A3F"]} tintColor="#3B7A3F" />
          }
          renderItem={({ item }) => (
            <EstablishmentCard
              establishment={item}
              onPress={() => handleEstablishmentPress(item)}
            />
          )}
          ListEmptyComponent={
            <Center mt="$10">
              <Text color="$gray300">Nenhum estabelecimento encontrado</Text>
            </Center>
          }
        />
      )}
    </VStack>
  );
}
