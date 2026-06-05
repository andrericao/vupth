import { useState } from "react";
import { FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { VStack, Box, Text, Heading, HStack, Badge, BadgeText, Center } from "@gluestack-ui/themed";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { Header } from "@components/Header";
import { Input2 } from "@components/Input2";
import { Establishment, ServiceType } from "@domain/establishment/types";
import { useEstablishments } from "@hooks/useEstablishments";
import { useAuthStore } from "@stores/authStore";
import { useQueueCountdown } from "@hooks/useQueueCountdown";
import { formatWaitTime } from "@domain/queue/types";
import { UserCircle, Queue } from "phosphor-react-native";

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
  const isOpen = establishment.open_status === "OPEN";

  return (
    <TouchableOpacity onPress={onPress} testID={`establishment-${establishment.id}`}>
      <Box
        bg="$white"
        p="$4"
        mb="$3"
        borderRadius="$lg"
        borderWidth="$1"
        borderColor={isOpen ? "$green500" : "$gray400"}
      >
        <HStack justifyContent="space-between" alignItems="center">
          <VStack flex={1}>
            <Heading size="md" fontFamily="$heading">
              {establishment.name}
            </Heading>
            {establishment.serviceType && (
              <Text size="sm" color="$gray300" mt="$1">
                {SERVICE_TYPE_LABELS[establishment.serviceType]}
              </Text>
            )}
            {establishment.address && (
              <Text size="xs" color="$gray400" mt="$1">
                {establishment.address.neighborhood}, {establishment.address.city}
              </Text>
            )}
            <Text size="xs" color="$gray300" mt="$1">
              {establishment.services?.length ?? 0} serviço(s)
            </Text>
          </VStack>
          <Badge
            bg={isOpen ? "$green500" : "$gray400"}
            borderRadius="$full"
            px="$3"
            py="$1"
          >
            <BadgeText color="$white" size="xs">
              {isOpen ? "Aberto" : "Fechado"}
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
  const { data: establishments = [], isLoading, isError } = useEstablishments();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { activeQueue, remaining, color, isInQueue } = useQueueCountdown();

  const isSearching = search.trim().length > 0;

  const filteredEstablishments = establishments.filter((e) => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = selectedFilter === "ALL" || e.serviceType === selectedFilter;
    const matchesOpen = isSearching || e.open_status === "OPEN";
    return matchesSearch && matchesFilter && matchesOpen;
  });

  function handleEstablishmentPress(establishment: Establishment) {
    navigation.navigate("establishmentDetail", { establishmentId: establishment.id });
  }

  return (
    <VStack flex={1} px={15} pt={60} bg="$gray700">
      <Header />

      <HStack justifyContent="flex-end" mt="$2">
        {isAuthenticated ? (
          <TouchableOpacity onPress={() => navigation.navigate("profile")} testID="profile-icon">
            <UserCircle size={32} color="#22C55E" weight="fill" />
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
            establishmentId: activeQueue.establishmentId,
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

      <Heading fontFamily="$heading" fontSize="$2xl" mt="$4" mb="$2">
        Estabelecimentos
      </Heading>

      <Input2
        placeholder="Buscar estabelecimento..."
        value={search}
        onChangeText={setSearch}
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
        <Center mt="$10">
          <ActivityIndicator size="large" color="#22C55E" />
          <Text color="$gray300" mt="$2">Carregando...</Text>
        </Center>
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
