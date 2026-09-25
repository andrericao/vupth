import { useState, useCallback, useEffect, useRef } from "react";
import { FlatList, TouchableOpacity, RefreshControl, TextInput } from "react-native";
import { useNavigation, useRoute, useScrollToTop, RouteProp } from "@react-navigation/native";
import { VStack, Box, Text, HStack, Center } from "@gluestack-ui/themed";
import { Search, SlidersHorizontal, ChevronRight } from "lucide-react-native";

import { AppNavigatorRoutesProps, AppRoutes } from "@routes/auth.routes";
import { Establishment, ServiceType } from "@domain/establishment/types";
import { filterEstablishments } from "@domain/establishment/filter";
import { orderForHome, formatDistanceKm } from "@domain/establishment/proximity";
import { statusTag } from "@domain/establishment/statusTag";
import { serviceTypeLabel } from "@domain/establishment/serviceType";
import { primeiroNome } from "@domain/auth/displayName";
import { useEstablishments } from "@hooks/useEstablishments";
import { ScreenHeader } from "@components/ScreenHeader";
import { useClientAttendances } from "@hooks/useAttendances";
import { useAuthStore } from "@stores/authStore";
import { useLocationStore } from "@stores/locationStore";
import { addressService } from "@services/addressService";
import { useQueueCountdown } from "@hooks/useQueueCountdown";
import { useDoubleBackExit } from "@hooks/useDoubleBackExit";
import { SkeletonList } from "@components/Skeleton";
import { PlaceAvatar } from "@components/PlaceAvatar";
import { LiveDot } from "@components/LiveDot";
import { FilterSheet } from "@components/FilterSheet";
import { useFavoritesStore } from "@stores/favoritesStore";
import { usePedidoDeCorteStore } from "@stores/pedidoDeCorteStore";
import { formatWaitTime, formatClockTime } from "@domain/queue/types";

// [marca-vupth] Saudacao por horario do dia (Pencil CLIENT · 06 Home).
function greetingForHour(hour: number): string {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

// "há N dias/semanas/meses" — so usado no card "Recentes", nao vale um
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

/**
 * Pilula de status da loja na lista.
 *
 * ABERTA agora  -> brand-green solido, ponto piscando: "da pra entrar JA".
 * FECHADA       -> contornada e quieta: "so agendar".
 *
 * As duas usavam o MESMO brand-green, e a unica diferenca era o ponto piscar —
 * que nao aparece num relance nem num print. Numa lista de cinco lojas, TODAS
 * carregavam o acento maximo da marca, abertas ou fechadas, e o verde parava
 * de significar "pode ir agora" (a regra do C25 e 1-2 acentos por tela).
 *
 * A fechada nao pode ser `brandSurface`: o CARTAO da linha ja e surface, e a
 * pilula sumiria nele (1,00:1). Contornada resolve — a borda agrupa e o TEXTO
 * carrega o sentido, a 8,54:1 sobre o cartao.
 *
 * E sem ponto quando fechada: ponto e sinal de "ao vivo"; parado numa loja
 * fechada e ruido.
 */
function StatusPill({ label, live }: { label: string; live: boolean }) {
  return (
    <HStack
      bg={live ? "$brandGreen" : "transparent"}
      borderWidth={live ? 0 : 1}
      borderColor="$brandBorder"
      borderRadius="$full"
      gap={6}
      px={12}
      py={6}
      alignItems="center"
    >
      {live && <LiveDot size={8} color="#163300" pulsing />}
      <Text
        fontFamily="$display"
        fontSize={12}
        fontWeight="$bold"
        color={live ? "$forest" : "$brandTextSecondary"}
      >
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
  // Sem contagem de pessoas na listagem (o backend so expoe tempo estimado):
  // "Sem fila" quando zero, senao o tempo. Nao inventamos "N na fila".
  // A ESPERA MORA NA TAG, nao aqui. A linha imprimia `queueLabel` +
  // `timeLabel`, que diziam a mesma coisa duas vezes: "Sem fila · Agora" ou,
  // pior, "2h · ~2h" — o mesmo numero repetido. Agora a tag responde "posso ir
  // agora?" e a linha responde "que lugar e esse, e onde fica".
  // `serviceType` e opcional no contrato — sem ele a linha fica so com a
  // distancia, em vez de imprimir "undefined".
  const tag = statusTag(establishment);

  const meta: string[] = establishment.serviceType
    ? [serviceTypeLabel(establishment.serviceType)]
    : [];
  if (distanceKm != null) meta.push(formatDistanceKm(distanceKm));

  return (
    <TouchableOpacity onPress={onPress} testID={`establishment-${establishment.id}`}>
      {/* Fechada entra APAGADA (decisao da design, 2026-08-26) — o mesmo
          tratamento nas duas listas.

          0,8 e nao 0,7: medido, `opacity` multiplica sobre TUDO, inclusive o
          texto que ja tinha passado no contraste. A 0,7 o nome da loja cai pra
          3,82:1 e reprova no AA; a 0,8 fica em 4,92:1. E o apagado mais forte
          que ainda deixa ler. */}
      <HStack
        bg="$brandSurface"
        borderRadius={18}
        gap={14}
        p={14}
        mb={12}
        alignItems="center"
        opacity={tag.live ? 1 : 0.8}
      >
        {/* Avatar APAGADO quando fechada — o mesmo sinal da lista cheia. Era
            verde nas duas situacoes, entao a linha fechada so se distinguia
            pela tag no canto oposto. */}
        <PlaceAvatar
          name={establishment.name}
          photoUrl={establishment.urlImage}
          bg={tag.live ? "$greenTint" : "$brandBorder"}
          color={tag.live ? "$forest" : "$brandTextSecondary"}
        />
        <VStack flex={1} gap={4}>
          <Text fontFamily="$display" fontSize={15} fontWeight="$bold" color="$brandTextPrimary">
            {establishment.name}
          </Text>
          <HStack gap={8} alignItems="center">
            {/* O ponto SEPARA, entao nao vem antes do primeiro item. Antes a
                linha comecava com o `queueLabel` e a meta so completava; sem
                ele, o separador virou um "·" orfao no comeco. */}
            {meta.map((m, i) => (
              <HStack key={m} gap={8} alignItems="center">
                {i > 0 && (
                  <Center width={3} height={3} borderRadius={1.5} bg="$brandTextSecondary" />
                )}
                <Text fontFamily="$body" fontSize={13} color="$brandTextSecondary">
                  {m}
                </Text>
              </HStack>
            ))}
          </HStack>
        </VStack>
        {/* Fechada nao e beco sem saida: ainda da pra agendar (Andre 2026-07-23). */}
        <StatusPill {...tag} />
      </HStack>
    </TouchableOpacity>
  );
}

export function Home() {
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<ServiceType | "ALL">("ALL");
  const [showFilter, setShowFilter] = useState(false);

  const navigation = useNavigation<AppNavigatorRoutesProps>();
  // Tocar na aba JA ATIVA volta ao topo da lista (Andre, 18/09): e o gesto que
  // todo app de lista tem, e o caminho natural de quem desceu demais. O
  // `useScrollToTop` do React Navigation ja faz o combinado com o partner —
  // sobe com animacao e, se ja estiver no topo, nao faz nada.
  const listaRef = useRef<FlatList<Establishment>>(null);
  useScrollToTop(listaRef as never);
  const route = useRoute<RouteProp<AppRoutes, "home">>();
  const { data: establishments = [], isLoading, isError, refetch, isRefetching } = useEstablishments();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const { activeQueue, remaining, isInQueue, isLate } = useQueueCountdown();
  const pedidosDeCorte = usePedidoDeCorteStore((s) => s.pedidos);
  // "Recentes": ultimo atendimento CONCLUIDO de verdade. O backend nao tem
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
  // Favoritos sobem ao topo — e o que faz o coracao da tela da loja valer
  // alguma coisa (do contrario ele preenche um icone e nao muda nada).
  const favoriteIds = useFavoritesStore((s) => s.ids);
  const filteredEstablishments = orderForHome(
    filterEstablishments(establishments, search, selectedFilter),
    coords != null,
    location,
    favoriteIds,
  );

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  function handleEstablishmentPress(establishment: Establishment) {
    navigation.navigate("establishmentDetail", { establishmentId: establishment.id });
  }

  // Sem nome cadastrado, cai no apelido do e-mail — NUNCA no texto de
  // visitante. "Estabelecimentos" e o que quem nao entrou ve; usar o mesmo
  // titulo pra quem entrou fazia o login parecer que nao funcionou (aconteceu
  // no teste visual de 2026-08-26). Ver `domain/auth/displayName`.
  const firstName = primeiroNome(user);

  return (
    <VStack flex={1} bg="$brandBackground">
      {/* A Home ROLA INTEIRA. Antes, tudo daqui até "Perto de você" ficava FORA
          da lista — saudação, busca, card da fila e Recentes ficavam colados no
          topo e só os estabelecimentos rolavam, o que dava a sensação de uma
          página presa com uma janelinha rolando dentro. Agora tudo é
          `ListHeaderComponent`: um scroll só, do topo ao fim. */}
      <FlatList
        ref={listaRef}
        data={isLoading || isError ? [] : filteredEstablishments}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            colors={["#163300"]}
            tintColor="#163300"
          />
        }
        ListHeaderComponent={
          <>
      {/* A saudacao e o TITULO da Home, nao um par sobreposto: como eyebrow
          (linha pequena por cima) ela empurrava o nome pra baixo e a Home
          comecava numa altura diferente de todas as outras telas. */}
      <Box px={16}>
        <ScreenHeader
          root
          title={
            isAuthenticated && firstName
              ? `${greetingForHour(new Date().getHours())}, ${firstName}`
              : "Estabelecimentos"
          }
          action={
            isAuthenticated ? (
              // O avatar vai DIRETO pra aba Perfil. Antes ele abria uma tela
              // intermediaria (`Profile`) cujos dois atalhos — "Atendimentos" e
              // "Configuracoes" — ja eram abas da barra de baixo: o avatar
              // levava a uma tela cujo trabalho era te mandar pra outra tela.
              <TouchableOpacity
                onPress={() =>
                  navigation.getParent()?.navigate("settingsTab", { screen: "settings" })
                }
                testID="profile-icon"
              >
                <PlaceAvatar name={firstName ?? "?"} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => navigation.navigate("signUp", {})}>
                <Text fontFamily="$display" fontSize={14} fontWeight="$bold" color="$forest">
                  Cadastrar
                </Text>
              </TouchableOpacity>
            )
          }
        />
      </Box>

      {/* Busca */}
      <Box px={16} pt={16}>
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
              placeholder="Buscar serviço ou lugar"
              placeholderTextColor="#6B706B"
              style={{ fontFamily: "Inter_400Regular", fontSize: 15, color: "#163300", padding: 0 }}
              returnKeyType="search"
            />
          </Box>
          {/* Era um icone SOLTO: parecia botao e nao fazia nada (QA Alexia).
              Agora abre o filtro e MOSTRA quando ha um ativo — lista filtrada
              sem indicacao visivel e o usuario achando que sumiu loja. */}
          <TouchableOpacity
            onPress={() => setShowFilter(true)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={
              selectedFilter === "ALL"
                ? "Filtrar por categoria"
                : `Filtro ativo: ${serviceTypeLabel(selectedFilter)}. Tocar para mudar`
            }
            testID="open-filter"
          >
            <Box
              bg={selectedFilter === "ALL" ? "transparent" : "$forest"}
              borderRadius="$full"
              px={selectedFilter === "ALL" ? 0 : 8}
              py={selectedFilter === "ALL" ? 0 : 6}
            >
              <SlidersHorizontal
                size={18}
                color={selectedFilter === "ALL" ? "#163300" : "#9FE870"}
              />
            </Box>
          </TouchableOpacity>
        </HStack>
      </Box>

      {/* Fila ativa. O atrasado (LATE) tambem: ele segue na fila — sem o card,
          o Inicio dizia que nao havia nada, e o teste de 25/09 leu "acabou". */}
      {(isInQueue || isLate) && activeQueue && (
        <Box px={16} pt={20}>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("queueStatus", {
                professionalId: activeQueue.professionalId,
                professionalName: activeQueue.professionalName,
                establishmentId: activeQueue.establishmentId,
                establishmentName: activeQueue.establishmentName,
                estimatedWaitMinutes: activeQueue.estimatedMinutes ?? undefined,
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
                  {isLate ? "VOCÊ FOI CHAMADO" : "VOCÊ ESTÁ NA FILA"}
                </Text>
                <HStack
                  bg="$forest"
                  borderRadius="$full"
                  gap={6}
                  px={12}
                  py={6}
                  alignItems="center"
                >
                  <LiveDot size={8} color="#9FE870" />
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
                      : remaining == null
                        ? "Calculando..."
                        : formatWaitTime(remaining)}
                  </Text>
                  <Text fontFamily="$body" fontSize={14} color="$forest">
                    {remaining == null ? "" : `~${formatWaitTime(remaining)} · `}
                    {activeQueue.establishmentName}
                  </Text>
                </VStack>
                <ChevronRight size={24} color="#163300" />
              </HStack>
            </VStack>
          </TouchableOpacity>
        </Box>
      )}

      {/* Pedido de corte esperando resposta. Sem isto o cliente pedia e ficava no
          escuro ate o fim dos 5 minutos (teste de 25/09); o desfecho chega em
          aviso pelo usePedidoDeCorte. */}
      {pedidosDeCorte.map((p) => (
        <Box px={16} pt={20} key={p.id}>
          <VStack bg="$brandSurface" borderRadius={24} gap={6} p={20} testID="pedido-de-corte">
            <Text
              fontFamily="$body"
              fontSize={12}
              fontWeight="$bold"
              letterSpacing={0.8}
              color="$forest"
            >
              PEDIDO DE CORTE ENVIADO
            </Text>
            <Text fontFamily="$display" fontSize={18} letterSpacing={-0.4} color="$forest">
              Aguardando {p.professionalName || "o profissional"} responder
            </Text>
            <Text fontFamily="$body" fontSize={14} color="$brandTextSecondary">
              {p.establishmentName ? `${p.establishmentName} · ` : ""}resposta até {formatClockTime(new Date(p.expiraEm))}
            </Text>
          </VStack>
        </Box>
      ))}

      {/* Recentes */}
      {lastVisit && (
        <VStack px={16} pt={22} gap={12}>
          <Text
            fontFamily="$display"
            fontSize={17}
            fontWeight="$bold"
            letterSpacing={-0.3}
            color="$brandTextPrimary"
          >
            Recentes
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

      {/* A secao lista o que esta PERTO, aberto ou nao — a ordem e distancia
          pura (decisao do Andre, 2026-08-06). "Livres agora" prometia so as
          abertas e listava fechada logo abaixo; quem diz quem esta aberto e a
          tag de cada linha. */}
        <VStack px={16} pt={22} gap={12}>
        <HStack justifyContent="space-between" alignItems="center">
          <Text
            fontFamily="$display"
            fontSize={17}
            fontWeight="$bold"
            letterSpacing={-0.3}
            color="$brandTextPrimary"
          >
            Perto de você
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
        </VStack>
          </>
        }
        renderItem={({ item }) => (
          <Box px={16}>
            <EstablishmentRow
              establishment={item}
              distanceKm={item.distance_km ?? null}
              onPress={() => handleEstablishmentPress(item)}
            />
          </Box>
        )}
        ListEmptyComponent={
          isLoading ? (
            <Box px={16}>
              <SkeletonList count={4} />
            </Box>
          ) : isError ? (
            <Center mt={40}>
              <Text color="$brandDanger">Erro ao carregar estabelecimentos</Text>
            </Center>
          ) : (
            <Center mt={40}>
              <Text color="$brandTextSecondary">Nenhum estabelecimento encontrado</Text>
            </Center>
          )
        }
      />

      <FilterSheet
        visible={showFilter}
        value={selectedFilter}
        onSelect={setSelectedFilter}
        onClose={() => setShowFilter(false)}
      />
    </VStack>
  );
}
