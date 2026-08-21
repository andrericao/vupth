import { useState, useCallback, useEffect, useRef } from "react";
import { FlatList, TouchableOpacity, RefreshControl, TextInput } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { VStack, Box, Text, HStack, Center } from "@gluestack-ui/themed";
import {
  MagnifyingGlass,
  SlidersHorizontal,
  CaretRight,
} from "phosphor-react-native";

import { AppNavigatorRoutesProps, AppRoutes } from "@routes/auth.routes";
import { Establishment, ServiceType, isEffectivelyOpen } from "@domain/establishment/types";
import { filterEstablishments } from "@domain/establishment/filter";
import { orderForHome, formatDistanceKm } from "@domain/establishment/proximity";
import { useEstablishments } from "@hooks/useEstablishments";
import { useClientAttendances } from "@hooks/useAttendances";
import { useAuthStore } from "@stores/authStore";
import { useLocationStore } from "@stores/locationStore";
import { addressService } from "@services/addressService";
import { useQueueCountdown } from "@hooks/useQueueCountdown";
import { useDoubleBackExit } from "@hooks/useDoubleBackExit";
import { SkeletonList } from "@components/Skeleton";
import { PlaceAvatar } from "@components/PlaceAvatar";
import { formatWaitTime } from "@domain/queue/types";

// [marca-vupth] Saudacao por horario do dia (Pencil CLIENT · 06 Home).
function greetingForHour(hour: number): string {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

// "há N dias/semanas/meses" — so usado no card "Seu de sempre", nao vale um
// util compartilhado ainda (uso unico).
function timeAgoLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 7) return `há ${days} dias`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `há ${weeks} semana${weeks > 1 ? "s" : ""}`;
  const months = Math.floor(days / 30);
  return `há ${months} ${months > 1 ? "meses" : "mês"}`;
}

// Pilula de status: fundo brand-green + texto/ponto forest (Pencil).
function StatusPill({ label }: { label: string }) {
  return (
    <HStack
      bg="$brandGreen"
      borderRadius="$full"
      gap={6}
      px={12}
      py={6}
      alignItems="center"
    >
      <Center width={8} height={8} borderRadius={4} bg="$forest" />
      <Text fontFamily="$display" fontSize={12} fontWeight="$bold" color="$forest">
        {label}
      </Text>
    </HStack>
  );
}

function EstablishmentRow({
  establishment,
  distanceKm,
  onPress,
}: {
  establishment: Establishment;
  // Distancia real (GPS). null = device sem coordenada ou loja ainda nao
  // geocodificada pelo backend — a linha some, a loja nunca some da lista.
  distanceKm: number | null;
  onPress: () => void;
}) {
  // "Aberta AGORA" efetiva (inclui horario de funcionamento) — loja OPEN fora
  // do horario mostra fechada (feedback Andre 2026-07-22).
  const isOpen = isEffectivelyOpen(establishment);
  const wait = establishment.estimated_wait_minutes;
  // Sem contagem de pessoas na listagem (o backend so expoe tempo estimado):
  // "Sem fila" quando zero, senao o tempo. Nao inventamos "N na fila".
  const queueLabel = wait == null || wait === 0 ? "Sem fila" : formatWaitTime(wait);
  const timeLabel = wait == null || wait === 0 ? "Agora" : `~${formatWaitTime(wait)}`;

  const meta: string[] = [timeLabel];
  if (distanceKm != null) meta.push(formatDistanceKm(distanceKm));

  return (
    <TouchableOpacity onPress={onPress} testID={`establishment-${establishment.id}`}>
      <HStack
        bg="$brandSurface"
        borderRadius={18}
        gap={14}
        p={14}
        mb={12}
        alignItems="center"
      >
        <PlaceAvatar name={establishment.name} photoUrl={establishment.urlImage} />
        <VStack flex={1} gap={4}>
          <Text fontFamily="$display" fontSize={15} fontWeight="$bold" color="$brandTextPrimary">
            {establishment.name}
          </Text>
          <HStack gap={8} alignItems="center">
            <Text fontFamily="$body" fontSize={13} fontWeight="$semibold" color="$brandTextPrimary">
              {queueLabel}
            </Text>
            {meta.map((m) => (
              <HStack key={m} gap={8} alignItems="center">
                <Center width={3} height={3} borderRadius={1.5} bg="$brandTextSecondary" />
                <Text fontFamily="$body" fontSize={13} color="$brandTextSecondary">
                  {m}
                </Text>
              </HStack>
            ))}
          </HStack>
        </VStack>
        {/* Fechada nao e beco sem saida: ainda da pra agendar (Andre 2026-07-23). */}
        <StatusPill label={isOpen ? (wait ? "Aberto" : "Livre") : "Agendar"} />
      </HStack>
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
  const user = useAuthStore((s) => s.user);
  const { activeQueue, remaining, isInQueue } = useQueueCountdown();
  // "Seu de sempre": ultimo atendimento CONCLUIDO de verdade. O backend nao tem
  // "favorito", entao usamos o historico. Sem historico, a secao nao aparece.
  const { data: history = [] } = useClientAttendances({ status: "FINISHED" });
  const lastVisit = history[0];

  // Home é a raiz do stack: evita que um único "voltar" do Android feche o app.
  useDoubleBackExit();

  // Filtro vindo da aba Serviços (navigate("home", { filter })).
  const filterParam = route.params?.filter;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (filterParam) setSelectedFilter(filterParam);
  }, [filterParam]);

  // Ordena por proximidade (bairro→cidade→resto) quando o cliente definiu uma
  // localização; senão, ordem padrão (menor espera).
  const location = useLocationStore((s) => s.location);
  const locationResolved = useLocationStore((s) => s.resolved);
  const setLocation = useLocationStore((s) => s.setLocation);
  const accessToken = useAuthStore((s) => s.accessToken);

  // Polimento: cliente logado sem localidade ainda resolvida → usa o endereço
  // principal dele automaticamente. Uma vez por sessão; quem limpou o filtro
  // ("Ver todos") já está `resolved` e não tem a localidade de volta sozinho.
  const didAutoLocate = useRef(false);
  useEffect(() => {
    if (didAutoLocate.current || !isAuthenticated || !accessToken || locationResolved) return;
    didAutoLocate.current = true;
    addressService
      .getMain(accessToken)
      .then(({ data }) => {
        if (data?.city) {
          setLocation({ city: data.city, neighborhood: data.neighborhood, state: data.state });
        }
      })
      .catch(() => {});
  }, [isAuthenticated, accessToken, locationResolved, setLocation]);

  // GPS: quando ha coordenadas, `useEstablishments` ja pediu a lista com
  // `lat`/`lng` e o BACKEND devolveu ordenada por distancia — nao reordenamos.
  const coords = useLocationStore((s) => s.coords);
  const filteredEstablishments = orderForHome(
    filterEstablishments(establishments, search, selectedFilter),
    coords != null,
    location,
  );

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  function handleEstablishmentPress(establishment: Establishment) {
    navigation.navigate("establishmentDetail", { establishmentId: establishment.id });
  }

  const firstName = user?.first_name?.trim().split(/\s+/)[0];

  return (
    <VStack flex={1} bg="$brandBackground" pt={54}>
      {/* Topo: saudacao + avatar */}
      <HStack px={20} pt={8} justifyContent="space-between" alignItems="center">
        {isAuthenticated && firstName ? (
          <VStack gap={2}>
            <Text fontFamily="$body" fontSize={14} color="$brandTextSecondary">
              {greetingForHour(new Date().getHours())},
            </Text>
            <Text
              fontFamily="$display"
              fontSize={22}
              fontWeight="$extrabold"
              letterSpacing={-0.5}
              color="$brandTextPrimary"
            >
              {firstName}
            </Text>
          </VStack>
        ) : (
          <Text
            fontFamily="$display"
            fontSize={22}
            fontWeight="$extrabold"
            letterSpacing={-0.5}
            color="$brandTextPrimary"
          >
            Estabelecimentos
          </Text>
        )}
        {isAuthenticated ? (
          <TouchableOpacity onPress={() => navigation.navigate("profile")} testID="profile-icon">
            <PlaceAvatar name={firstName ?? "?"} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => navigation.navigate("signUp", {})}>
            <Text fontFamily="$display" fontSize={14} fontWeight="$bold" color="$forest">
              Cadastrar
            </Text>
          </TouchableOpacity>
        )}
      </HStack>

      {/* Busca */}
      <Box px={20} pt={16}>
        <HStack
          bg="$brandSurface"
          borderRadius="$full"
          gap={10}
          px={16}
          py={13}
          alignItems="center"
        >
          <MagnifyingGlass size={18} color="#454745" />
          <Box flex={1}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar serviço ou lugar"
              placeholderTextColor="#454745"
              style={{ fontFamily: "Inter_400Regular", fontSize: 15, color: "#163300", padding: 0 }}
              returnKeyType="search"
            />
          </Box>
          <SlidersHorizontal size={18} color="#163300" />
        </HStack>
      </Box>

      {/* Fila ativa */}
      {isInQueue && activeQueue && (
        <Box px={20} pt={20}>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("queueStatus", {
                professionalId: activeQueue.professionalId,
                professionalName: activeQueue.professionalName,
                establishmentId: activeQueue.establishmentId,
                establishmentName: activeQueue.establishmentName,
                estimatedWaitMinutes: activeQueue.estimatedMinutes,
                serviceItemIds: [],
              })
            }
          >
            <VStack bg="$brandGreen" borderRadius={24} gap={14} p={20}>
              <HStack justifyContent="space-between" alignItems="center">
                <Text
                  fontFamily="$body"
                  fontSize={12}
                  fontWeight="$bold"
                  letterSpacing={0.8}
                  color="$forest"
                >
                  VOCÊ ESTÁ NA FILA
                </Text>
                <HStack
                  bg="$forest"
                  borderRadius="$full"
                  gap={6}
                  px={12}
                  py={6}
                  alignItems="center"
                >
                  <Center width={8} height={8} borderRadius={4} bg="$brandGreen" />
                  <Text fontFamily="$display" fontSize={12} fontWeight="$bold" color="$brandGreen">
                    Ao vivo
                  </Text>
                </HStack>
              </HStack>
              <HStack gap={16} alignItems="center">
                <VStack flex={1}>
                  <Text
                    fontFamily="$display"
                    fontSize={46}
                    fontWeight="$extrabold"
                    letterSpacing={-2}
                    lineHeight={46}
                    color="$forest"
                  >
                    {/* Posicao real (GET wait-time). Ate o 1o poll chegar, cai no
                        tempo — nunca inventa um numero de pessoas. */}
                    {activeQueue.position != null
                      ? activeQueue.position <= 1
                        ? "É a sua vez"
                        : `Faltam ${activeQueue.position - 1}`
                      : formatWaitTime(remaining)}
                  </Text>
                  <Text fontFamily="$body" fontSize={14} color="$forest">
                    ~{formatWaitTime(remaining)} · {activeQueue.establishmentName}
                  </Text>
                </VStack>
                <CaretRight size={24} color="#163300" />
              </HStack>
            </VStack>
          </TouchableOpacity>
        </Box>
      )}

      {/* Seu de sempre */}
      {lastVisit && (
        <VStack px={20} pt={22} gap={12}>
          <Text
            fontFamily="$display"
            fontSize={17}
            fontWeight="$bold"
            letterSpacing={-0.3}
            color="$brandTextPrimary"
          >
            Seu de sempre
          </Text>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("establishmentDetail", {
                establishmentId: lastVisit.establishmentId,
              })
            }
          >
            <HStack bg="$brandSurface" borderRadius={18} gap={14} p={14} alignItems="center">
              <PlaceAvatar name={lastVisit.professionalName} bg="$accentPeach" />
              <VStack flex={1} gap={3}>
                <Text fontFamily="$display" fontSize={15} fontWeight="$bold" color="$brandTextPrimary">
                  {lastVisit.professionalName}
                  {lastVisit.services?.length
                    ? ` · ${lastVisit.services.map((s) => s.customName).join(" + ")}`
                    : ""}
                </Text>
                {timeAgoLabel(lastVisit.endTime ?? lastVisit.scheduledTime) && (
                  <Text fontFamily="$body" fontSize={13} color="$brandTextSecondary">
                    Última vez {timeAgoLabel(lastVisit.endTime ?? lastVisit.scheduledTime)}
                  </Text>
                )}
              </VStack>
              <Box bg="$forest" borderRadius="$full" px={14} py={9}>
                <Text fontFamily="$display" fontSize={13} fontWeight="$bold" color="$brandGreen">
                  Repetir
                </Text>
              </Box>
            </HStack>
          </TouchableOpacity>
        </VStack>
      )}

      {/* Livres agora */}
      <VStack flex={1} px={20} pt={22} gap={12}>
        <HStack justifyContent="space-between" alignItems="center">
          <Text
            fontFamily="$display"
            fontSize={17}
            fontWeight="$bold"
            letterSpacing={-0.3}
            color="$brandTextPrimary"
          >
            Livres agora
          </Text>
          {/* Leva a lista cheia (Pencil CLIENT · 07), carregando o filtro de
              categoria que estiver ativo aqui. Antes apontava para a propria
              Home — era um link morto. */}
          <TouchableOpacity
            onPress={() => navigation.navigate("establishmentList", { filter: selectedFilter })}
            testID="see-all"
          >
            <Text fontFamily="$body" fontSize={14} fontWeight="$semibold" color="$brandTextSecondary">
              Ver todos
            </Text>
          </TouchableOpacity>
        </HStack>

        {isLoading ? (
          <SkeletonList count={4} />
        ) : isError ? (
          <Center mt={40}>
            <Text color="$brandDanger">Erro ao carregar estabelecimentos</Text>
          </Center>
        ) : (
          <FlatList
            data={filteredEstablishments}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={onRefresh}
                colors={["#163300"]}
                tintColor="#163300"
              />
            }
            renderItem={({ item }) => (
              <EstablishmentRow
                establishment={item}
                distanceKm={item.distance_km ?? null}
                onPress={() => handleEstablishmentPress(item)}
              />
            )}
            ListEmptyComponent={
              <Center mt={40}>
                <Text color="$brandTextSecondary">Nenhum estabelecimento encontrado</Text>
              </Center>
            }
          />
        )}
      </VStack>
    </VStack>
  );
}
