import { useState } from "react";
import { FlatList, TouchableOpacity, RefreshControl, Text, TextInput, View } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Search, ChevronRight, Zap, ArrowUpDown, Star } from "lucide-react-native";

import { AppNavigatorRoutesProps, AppRoutes } from "@routes/auth.routes";
import { Establishment, ServiceType, isEffectivelyOpen } from "@domain/establishment/types";
import { filterEstablishments } from "@domain/establishment/filter";
import { serviceTypeTitle, serviceTypeLabel } from "@domain/establishment/serviceType";
import { formatDistanceKm } from "@domain/establishment/proximity";
import { resolveRating } from "@domain/establishment/rating";
import { useEstablishments } from "@hooks/useEstablishments";
import { ScreenHeader } from "@components/ScreenHeader";
import { statusTag } from "@domain/establishment/statusTag";
import { SkeletonList } from "@components/Skeleton";
import { PlaceAvatar } from "@components/PlaceAvatar";
import { formatWaitTime } from "@domain/queue/types";
import { COR_DO_PLACEHOLDER } from "@utils/corDoPlaceholder";
import { fs } from "@stores/fonteStore";

type SortBy = "wait" | "distance";

function waitLabel(e: Establishment): string {
  const w = e.estimated_wait_minutes;
  return w == null || w === 0 ? "Sem fila" : `~${formatWaitTime(w)}`;
}

function OpenRow({
  establishment,
  onPress,
}: {
  establishment: Establishment;
  onPress: () => void;
}) {
  const r = resolveRating(
    establishment.rating_best ?? establishment.rating_average,
    establishment.rating_count,
    establishment.id,
  );
  return (
    <TouchableOpacity onPress={onPress} testID={`establishment-${establishment.id}`}>
      <View className="bg-vupth-surface p-3 mb-3 rounded-card">
        <View className="flex-row items-center gap-3">
          <PlaceAvatar name={establishment.name} photoUrl={establishment.urlImage} />
          <View className="flex-1">
            <Text className="font-heading text-sm text-vupth-forest">
              {establishment.name}
            </Text>
            {/* A ESPERA MORA NA TAG. Ela estava aqui E na pilula ao lado, que
                dizia "Livre"/"Aberto" — duas palavras que nao carregavam a
                diferenca (aberta com fila x sem fila) e repetiam o que esta
                linha ja dizia melhor. A linha fica com onde fica e o quanto
                vale. */}
            <View className="flex-row items-center gap-2 mt-0.5">
              {establishment.distance_km != null && (
                <>
                  <Text className="font-body text-xs text-vupth-textSecondary">
                    {formatDistanceKm(establishment.distance_km)}
                  </Text>
                  <View className="w-[3px] h-[3px] rounded-full bg-vupth-textSecondary" />
                </>
              )}
              <View className="flex-row items-center gap-1">
                <Star size={11} color="#163300" fill="#163300" />
                <Text className="font-heading text-xs text-vupth-textSecondary">
                  {r.value.toFixed(1)}
                </Text>
              </View>
            </View>
          </View>
          {/* Mesma tag da Home — uma regra so pras duas telas. Aqui so chega
              loja ABERTA (a fechada tem linha propria), entao ela sai "Livre"
              ou com o tempo. */}
          <View className="bg-vupth-green rounded-full px-3 py-1.5">
            <Text className="font-heading text-f10 text-vupth-forest">
              {statusTag(establishment).label}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Loja fechada NAO some da lista (Andre 2026-07-23: da pra agendar/solicitar
// para a reabertura) — entra apagada no fim, com o caminho ainda aberto.
//
// ⚠️ C22: o desenho do Pencil mostra "Abre amanha as 9h" aqui, mas o contrato
// de hoje so tem o booleano `is_open` — sem opening/closing time, e muito menos
// por dia da semana. Inventar um horario seria pior do que omitir: mostramos so
// "Fechada". Quando o backend entregar a grade (S27), e esta linha que ganha o
// "abre <dia> as <hora>".
function ClosedRow({
  establishment,
  onPress,
}: {
  establishment: Establishment;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} testID={`establishment-${establishment.id}`}>
      {/* Fechada entra APAGADA (decisao da design, 2026-08-26) — o mesmo
          tratamento da Home.

          0,8 e nao 0,7: medido, `opacity` multiplica sobre TUDO, inclusive o
          texto que ja tinha passado no contraste. A 0,7 o nome da loja cai pra
          3,82:1 e reprova no AA; a 0,8 fica em 4,92:1. */}
      <View className="bg-vupth-surface p-3 mb-3 rounded-card opacity-80">
        <View className="flex-row items-center gap-3">
          <PlaceAvatar name={establishment.name} photoUrl={establishment.urlImage} bg="$brandBorder" color="$brandTextSecondary" />
          <View className="flex-1">
            <Text className="font-heading text-sm text-vupth-textSecondary">
              {establishment.name}
            </Text>
            <Text className="font-body text-xs text-vupth-textSecondary mt-0.5">
              {serviceTypeLabel(establishment.serviceType ?? "")}
              {establishment.distance_km != null
                ? ` · ${formatDistanceKm(establishment.distance_km)}`
                : ""}
            </Text>
          </View>
          {/* Mesma tag das outras duas telas. Aqui ela dizia "Fechada" e o
              subtitulo dizia "Toque para agendar" — o estado e a acao
              separados, com vocabulario que so existia nesta tela. */}
          <View className="border border-vupth-border rounded-full px-3 py-1.5">
            <Text className="font-heading text-f10 text-vupth-textSecondary">
              {statusTag(establishment).label}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function EstablishmentList() {
  const navigation = useNavigation<AppNavigatorRoutesProps>();
  const route = useRoute<RouteProp<AppRoutes, "establishmentList">>();
  const filter = (route.params?.filter ?? "ALL") as ServiceType | "ALL";

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("wait");

  const { data: establishments = [], isLoading, isError, refetch, isRefetching } =
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
  const best = open.length > 0
    ? open.reduce((prev, curr) =>
        (curr.estimated_wait_minutes ?? 0) < (prev.estimated_wait_minutes ?? 0) ? curr : prev,
      )
    : null;

  function goToDetail(id: string) {
    navigation.navigate("establishmentDetail", { establishmentId: id });
  }

  return (
    // NativeWind (DEC-5): mesmas medidas do v1. O "2xs" (10) virou text-f10.
    <View className="flex-1 bg-vupth-background">
      <View className="px-4">
        <ScreenHeader title={serviceTypeTitle(filter).toUpperCase()} />
      </View>

      <View className="px-4 gap-3.5">
        <View className="flex-row bg-vupth-surface rounded-full gap-2.5 px-4 py-[13px] items-center">
          <Search size={18} color="#454745" />
          <View className="flex-1">
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar pelo nome"
              placeholderTextColor={COR_DO_PLACEHOLDER}
              style={{ fontFamily: "Inter_400Regular", fontSize: fs(15), color: "#163300", padding: 0 }}
              returnKeyType="search"
            />
          </View>
        </View>

        {/* Atalho da menor espera — o mesmo padrao do CTA da tela da loja: e um
            caminho rapido entre os ABERTOS, nao uma promessa sobre todos. */}
        {best && (
          <TouchableOpacity onPress={() => goToDetail(best.id)} testID="shortest-wait-shortcut">
            <View className="flex-row bg-vupth-forest rounded-card gap-3 p-4 items-center">
              <View className="w-[38px] h-[38px] rounded-full bg-vupth-green items-center justify-center">
                <Zap size={20} color="#163300" />
              </View>
              <View className="flex-1 gap-0.5">
                <Text className="font-heading text-f15 text-white">
                  Entrar com menor espera
                </Text>
                <Text className="font-body text-f13 text-vupth-green">
                  {best.name} · {waitLabel(best).replace("~", "")}
                </Text>
              </View>
              <ChevronRight size={20} color="#9FE870" />
            </View>
          </TouchableOpacity>
        )}

        <View className="flex-row justify-between items-center">
          <Text className="font-heading text-sm text-vupth-textSecondary">
            {open.length === 0
              ? "Nenhuma aberta agora"
              : `${open.length} ${open.length === 1 ? "aberta agora" : "abertas agora"}`}
          </Text>
          {hasDistance && (
            <TouchableOpacity
              onPress={() => setSortBy((s) => (s === "wait" ? "distance" : "wait"))}
              testID="sort-toggle"
            >
              <View className="flex-row bg-vupth-surface rounded-full gap-1.5 px-3 py-[7px] items-center">
                <ArrowUpDown size={13} color="#163300" />
                <Text className="font-heading text-vupth-textPrimary" style={{ fontSize: fs(12) }}>
                  {sortBy === "wait" ? "Menor espera" : "Mais perto"}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View className="flex-1 px-4 pt-4">
        {isLoading ? (
          <SkeletonList count={5} />
        ) : isError ? (
          <View className="mt-10 items-center">
            <Text className="font-body text-md text-vupth-danger">Erro ao carregar estabelecimentos</Text>
          </View>
        ) : (
          <FlatList
            data={[...sortedOpen, ...closed]}
            keyExtractor={(item) => item.id}
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
              isEffectivelyOpen(item) ? (
                <OpenRow establishment={item} onPress={() => goToDetail(item.id)} />
              ) : (
                <ClosedRow establishment={item} onPress={() => goToDetail(item.id)} />
              )
            }
            ListEmptyComponent={
              <View className="mt-10 items-center">
                <Text className="font-body text-md text-vupth-textSecondary">
                  {search ? "Nada encontrado para essa busca" : "Nenhum estabelecimento por aqui"}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}
