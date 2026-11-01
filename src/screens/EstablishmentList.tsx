import { memo, useState } from "react";
import { FlatList, Platform, TouchableOpacity, RefreshControl, TextInput } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { VStack, Box, Text, HStack, Center } from "@gluestack-ui/themed";
import { Search, ChevronRight, Zap, ArrowUpDown } from "lucide-react-native";

import { AppNavigatorRoutesProps, AppRoutes } from "@routes/auth.routes";
import { Establishment, ServiceType, isEffectivelyOpen } from "@domain/establishment/types";
import { filterEstablishments } from "@domain/establishment/filter";
import { serviceTypeTitle } from "@domain/establishment/serviceType";
import { formatDistanceKm } from "@domain/establishment/proximity";
import { resolveRating } from "@domain/establishment/rating";
import { NotaDaLoja } from "@components/NotaDaLoja";
import { useEstablishments } from "@hooks/useEstablishments";
import { ScreenHeader } from "@components/ScreenHeader";
import { statusTag } from "@domain/establishment/statusTag";
import { SkeletonList, SkeletonPilula } from "@components/Skeleton";
import { PlaceAvatar } from "@components/PlaceAvatar";
import { LinhaDaLojaFechada } from "@components/LinhaDaLojaFechada";
import { formatWaitTime } from "@domain/queue/types";
import { COR_DO_PLACEHOLDER } from "@utils/corDoPlaceholder";
import { fs } from "@stores/fonteStore";

type SortBy = "wait" | "distance";

function waitLabel(e: Establishment): string {
  const w = e.estimated_wait_minutes;
  return w == null || w === 0 ? "Sem fila" : `~${formatWaitTime(w)}`;
}

// estudo-desempenho (DEC-145): `memo` — o `onPress` novo a cada render so depende da loja.
const OpenRow = memo(function OpenRow({
  establishment,
  onPress,
  volatilPendente = false,
}: {
  establishment: Establishment;
  onPress: () => void;
  // DEC-148: lista do disco ainda nao confirmada pelo Backend — a tag (aberta/fila/espera) vira skeleton.
  volatilPendente?: boolean;
}) {
  const r = resolveRating(
    establishment.rating_best ?? establishment.rating_average,
    establishment.rating_count,
  );
  return (
    <TouchableOpacity onPress={onPress} testID={`establishment-${establishment.id}`}>
      <Box bg="$brandSurface" p="$3" mb="$3" borderRadius="$card">
        <HStack alignItems="center" gap="$3">
          <PlaceAvatar name={establishment.name} photoUrl={establishment.urlImage} />
          <VStack flex={1}>
            <Text fontFamily="$heading" fontSize="$sm" color="$forest">
              {establishment.name}
            </Text>
            {/* A ESPERA MORA NA TAG. Ela estava aqui E na pilula ao lado, que
                dizia "Livre"/"Aberto" — duas palavras que nao carregavam a
                diferenca (aberta com fila x sem fila) e repetiam o que esta
                linha ja dizia melhor. A linha fica com onde fica e o quanto
                vale. */}
            <HStack alignItems="center" gap="$2" mt="$0.5">
              {establishment.distance_km != null && (
                <>
                  <Text size="xs" color="$brandTextSecondary">
                    {formatDistanceKm(establishment.distance_km)}
                  </Text>
                  <Center width={3} height={3} borderRadius="$full" bg="$brandTextSecondary" />
                </>
              )}
              <NotaDaLoja rating={r} starSize={11} size="xs" color="$brandTextSecondary" fontFamily="$heading" />
            </HStack>
          </VStack>
          {/* Mesma tag da Home — uma regra so pras duas telas. Aqui so chega
              loja ABERTA (a fechada tem linha propria), entao ela sai "Livre"
              ou com o tempo. */}
          {volatilPendente ? (
            <SkeletonPilula testID={`skeleton-status-${establishment.id}`} />
          ) : (
            <Box bg="$brandGreen" borderRadius="$full" px="$3" py="$1.5">
              <Text size="2xs" fontFamily="$heading" color="$forest">
                {statusTag(establishment).label}
              </Text>
            </Box>
          )}
        </HStack>
      </Box>
    </TouchableOpacity>
  );
}, (a, b) => a.establishment === b.establishment && a.volatilPendente === b.volatilPendente);

export function EstablishmentList() {
  const navigation = useNavigation<AppNavigatorRoutesProps>();
  const route = useRoute<RouteProp<AppRoutes, "establishmentList">>();
  const filter = (route.params?.filter ?? "ALL") as ServiceType | "ALL";

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("wait");

  const { data: establishments = [], isLoading, isError, refetch, isRefetching, frescos } =
    useEstablishments();

  const matching = filterEstablishments(establishments, search, filter);
  const open = matching.filter(isEffectivelyOpen);
  const closed = matching.filter((e) => !isEffectivelyOpen(e));

  // Distancia so existe quando o backend recebeu coordenada (GPS). Sem ela, a
  // ordenacao por distancia nao teria o que comparar — por isso o botao de
  // ordenar so aparece quando ha distancia em alguma loja.
  const hasDistance = matching.some((e) => e.distance_km != null);

  const sortedOpen = [...open].sort((a, b) => {
    if (sortBy === "distance") {
      return (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity);
    }
    return (a.estimated_wait_minutes ?? 0) - (b.estimated_wait_minutes ?? 0);
  });

  // Atalho: a loja aberta com a menor espera. Some quando nao ha loja aberta.
  // (DEC-148: com a lista ainda do disco, o atalho da menor espera nao aparece — a espera seria a de ontem.)
  const best = open.length > 0 && frescos
    ? open.reduce((prev, curr) =>
        (curr.estimated_wait_minutes ?? 0) < (prev.estimated_wait_minutes ?? 0) ? curr : prev,
      )
    : null;

  function goToDetail(id: string) {
    navigation.navigate("establishmentDetail", { establishmentId: id });
  }

  return (
    <VStack flex={1} bg="$brandBackground">
      <Box px={16}>
        <ScreenHeader title={serviceTypeTitle(filter).toUpperCase()} />
      </Box>

      <VStack px={16} gap="$3.5">
        <HStack
          bg="$brandSurface"
          borderRadius="$full"
          gap={10}
          px={16}
          py={13}
          alignItems="center"
        >
          <Search size={18} color="#454745" />
          <Box flex={1}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar pelo nome"
              placeholderTextColor={COR_DO_PLACEHOLDER}
              style={{ fontFamily: "Inter_400Regular", fontSize: fs(15), color: "#163300", padding: 0 }}
              returnKeyType="search"
            />
          </Box>
        </HStack>

        {/* Atalho da menor espera — o mesmo padrao do CTA da tela da loja: e um
            caminho rapido entre os ABERTOS, nao uma promessa sobre todos. */}
        {best && (
          <TouchableOpacity onPress={() => goToDetail(best.id)} testID="shortest-wait-shortcut">
            <HStack
              bg="$forest"
              borderRadius={20}
              gap={12}
              p={16}
              alignItems="center"
            >
              <Center width={38} height={38} borderRadius="$full" bg="$brandGreen">
                <Zap size={20} color="#163300" />
              </Center>
              <VStack flex={1} gap={2}>
                <Text fontFamily="$heading" fontSize={fs(15)} color="$white">
                  Entrar com menor espera
                </Text>
                <Text fontFamily="$body" fontSize={fs(13)} color="$brandGreen">
                  {best.name} · {waitLabel(best).replace("~", "")}
                </Text>
              </VStack>
              <ChevronRight size={20} color="#9FE870" />
            </HStack>
          </TouchableOpacity>
        )}

        <HStack justifyContent="space-between" alignItems="center">
          <Text size="sm" color="$brandTextSecondary" fontFamily="$heading">
            {open.length === 0
              ? "Nenhuma aberta agora"
              : `${open.length} ${open.length === 1 ? "aberta agora" : "abertas agora"}`}
          </Text>
          {hasDistance && (
            <TouchableOpacity
              onPress={() => setSortBy((s) => (s === "wait" ? "distance" : "wait"))}
              testID="sort-toggle"
            >
              <HStack
                bg="$brandSurface"
                borderRadius="$full"
                gap={6}
                px={12}
                py={7}
                alignItems="center"
              >
                <ArrowUpDown size={13} color="#163300" />
                <Text fontFamily="$heading" fontSize={fs(12)} color="$brandTextPrimary">
                  {sortBy === "wait" ? "Menor espera" : "Mais perto"}
                </Text>
              </HStack>
            </TouchableOpacity>
          )}
        </HStack>
      </VStack>

      <VStack flex={1} px={16} pt="$4">
        {isLoading ? (
          <SkeletonList count={5} />
        ) : isError ? (
          <Center mt={40}>
            <Text color="$brandDanger">Erro ao carregar estabelecimentos</Text>
          </Center>
        ) : (
          <FlatList
            data={[...sortedOpen, ...closed]}
            keyExtractor={(item) => item.id}
            // estudo-desempenho (DEC-145): a mesma janela da Home — primeira dobra ja e o resto em lotes.
            initialNumToRender={8}
            maxToRenderPerBatch={6}
            updateCellsBatchingPeriod={50}
            windowSize={7}
            removeClippedSubviews={Platform.OS === "android"}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                colors={["#163300"]}
                tintColor="#163300"
              />
            }
            renderItem={({ item }) =>
              // DEC-148: com a lista do disco, aberta/fechada e dado velho: todas entram como linha neutra, com
              // a tag em skeleton, ate o Backend confirmar.
              !frescos || isEffectivelyOpen(item) ? (
                <OpenRow establishment={item} onPress={() => goToDetail(item.id)} volatilPendente={!frescos} />
              ) : (
                <LinhaDaLojaFechada establishment={item} onPress={() => goToDetail(item.id)} />
              )
            }
            ListEmptyComponent={
              <Center mt={40}>
                <Text color="$brandTextSecondary">
                  {search ? "Nada encontrado para essa busca" : "Nenhum estabelecimento por aqui"}
                </Text>
              </Center>
            }
          />
        )}
      </VStack>
    </VStack>
  );
}
