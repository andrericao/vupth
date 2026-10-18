import { useEffect, useRef, useState } from "react";
import { SectionList, TouchableOpacity, Alert, Linking, Share, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  VStack,
  Box,
  Text,
  HStack,
  Center,
} from "@gluestack-ui/themed";
import { Info, Heart, ChevronRight, Clock, ChevronDown, MapPin, Share2 } from "lucide-react-native";
import { copiarTexto } from "@utils/copiar";
import { FotoAmpliada } from "@components/FotoAmpliada";
import { linkParaCompartilhar, raizDoSite } from "@routes/linking";
import { textoDeDivulgacao } from "@domain/divulgacao";
import { API_ENV } from "@services/api";

import { ScreenHeader, HeaderIconButton } from "@components/ScreenHeader";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { Button } from "@components/Button";
import { SkeletonList } from "@components/Skeleton";
import { PlaceAvatar } from "@components/PlaceAvatar";
import { LiveDot } from "@components/LiveDot";
import { BadgeAgendar } from "@components/BadgeAgendar";
import { ProfessionalWithQueue } from "@domain/professional/types";
import { agruparPorExpediente, emIntervalo, estaNoExpediente, filaFechada } from "@domain/professional/expediente";
import { resolveRating } from "@domain/establishment/rating";
import { NotaDaLoja } from "@components/NotaDaLoja";
import { formatSpecialty } from "@domain/establishment/serviceType";
import { ehSoAgenda } from "@domain/professional/modo";
import { isEffectivelyOpen } from "@domain/establishment/types";
import { enderecoEmUmaLinha, linkDoMapa } from "@domain/establishment/endereco";
import { formatWaitTime } from "@domain/queue/types";
import { useEstablishment, useEstablishmentHours, useProfessionalsWithQueue } from "@hooks/useEstablishments";
import { proximaAbertura, resumoDeHoje, semanaParaExibir } from "@domain/establishment/horarios";
import { useQueueSocket } from "@hooks/useQueueSocket";
import { useFavoritesStore } from "@stores/favoritesStore";
import { fs } from "@stores/fonteStore";

type RouteParams = {
  establishmentId: string;
  /** Link compartilhado apontando um profissional (24/09). */
  profissional?: string;
};

// Linha do profissional (Pencil CLIENT · 08 Estabelecimento).
//
// ⚠️ C21 (PRD do client): cada profissional escolhe o REGIME dele — fila ou
// agenda pura — e os dois convivem na mesma loja. No modo agenda nao existe
// posicao nem ETA pra mostrar: existe grade de horarios. O backend ainda NAO
// expoe esse campo (depende do S24), entao hoje toda linha e de fila, que e o
// unico regime que existe no contrato atual. Quando o campo chegar, e aqui que
// a linha passa a alternar entre "N na fila · ~X min" e "So agenda · livre HH:MM".
function ProfessionalRow({
  professional,
  lojaAberta,
  fora,
  onPress,
  onVerFoto,
  onInfo,
}: {
  professional: ProfessionalWithQueue;
  /** A ⓘ abre "Informacoes do profissional" (foto, servicos, telefone). */
  onInfo: () => void;
  /** Tocar na foto abre em tela cheia (so quando ha foto). */
  onVerFoto?: (uri: string) => void;
  /** Loja fechada: ninguem esta sendo atendido, entao a linha nao pode falar
      de fila nem de "agora". Ver o mesmo conserto na Home. */
  lojaAberta: boolean;
  /** Fora do expediente: ir para Fora FECHA a fila (regra de 09/09), entao a
      linha nao pode oferecer entrada nem anunciar espera. */
  fora: boolean;
  onPress: () => void;
}) {
  const queueCount = professional.queue_count ?? 0;
  const r = resolveRating(
    professional.rating_average,
    professional.rating_count,
  );

  return (
    <TouchableOpacity onPress={onPress} testID={`professional-${professional.id}`}>
      <Box bg="$brandSurface" p="$3" mb="$3" borderRadius="$card">
        <HStack alignItems="center" gap="$3">
          {/* Foto quando o profissional tiver (Partner 1.4.0); sem ela, ou com
              URL quebrada, o PlaceAvatar volta para as iniciais. */}
          {professional.profile_image_url && onVerFoto ? (
            <TouchableOpacity
              onPress={() => onVerFoto(professional.profile_image_url!)}
              accessibilityLabel={`Ver a foto de ${professional.name}`}
              testID={`foto-${professional.id}`}
            >
              <PlaceAvatar name={professional.name} photoUrl={professional.profile_image_url} />
            </TouchableOpacity>
          ) : (
            <PlaceAvatar name={professional.name} photoUrl={professional.profile_image_url} />
          )}
          <VStack flex={1}>
            <Text fontFamily="$heading" fontSize="$sm" color="$forest">
              {professional.name}
            </Text>
            {/* ⚠️ Com a LOJA FECHADA, "Sem fila · Agora" convidava a ir agora
                dentro de uma tela que diz "Fechada agora" — o mesmo defeito ja
                corrigido na Home. Fechada, a linha diz o que da pra fazer. */}
            <HStack alignItems="center" gap="$2" mt="$0.5">
              {!lojaAberta ? (
                <Text size="xs" color="$brandTextSecondary" fontFamily="$heading">
                  Agendar
                </Text>
              ) : fora ? (
                /* Quem esta fora do expediente nao recebe: anunciar "Sem fila ·
                   Agora" aqui convidava para uma fila que ninguem vai atender —
                   e era o defeito que o Partner reportou em 07/09. */
                <Text size="xs" color="$brandTextSecondary" fontFamily="$heading">
                  Fila fechada
                </Text>
              ) : (
                <>
                  <Text size="xs" color="$brandTextPrimary" fontFamily="$heading">
                    {queueCount === 0 ? "Sem fila" : `${queueCount} na fila`}
                  </Text>
                  <Center width={3} height={3} borderRadius="$full" bg="$brandTextSecondary" />
                  <Text size="xs" color="$brandTextSecondary">
                    {queueCount === 0
                      ? "Agora"
                      : `~${formatWaitTime(professional.estimated_wait_minutes ?? 0)}`}
                  </Text>
                  {/* Intervalo e almoco ou saida rapida: a pessoa VOLTA e a fila
                      dela segue andando, por isso ela fica entre quem trabalha —
                      mas com o rotulo, senao a espera anunciada engana. */}
                  {estaNoExpediente(professional.work_status) && professional.accepting_new === false && (
                    <>
                      <Center width={3} height={3} borderRadius="$full" bg="$brandTextSecondary" />
                      <Text size="xs" color="$brandTextSecondary" fontFamily="$heading" testID={`fila-fechada-${professional.id}`}>
                        Fila fechada
                      </Text>
                    </>
                  )}
                  {emIntervalo(professional.work_status) && (
                    <>
                      <Center width={3} height={3} borderRadius="$full" bg="$brandTextSecondary" />
                      <Text size="xs" color="$brandTextSecondary" fontFamily="$heading">
                        Em intervalo
                      </Text>
                    </>
                  )}
                </>
              )}
            </HStack>
            <HStack alignItems="center" gap="$2" mt="$0.5">
              {/* `specialty` e texto livre no backend, mas parte dos cadastros
                  veio com a categoria em INGLES — era isso que aparecia aqui
                  (Andre 2026-08-06). `formatSpecialty` traduz o que reconhece e
                  preserva quem escreveu a especialidade de verdade. */}
              <Text size="2xs" color="$brandTextSecondary" numberOfLines={1} flex={1}>
                {formatSpecialty(professional.specialty)}
              </Text>
              <NotaDaLoja rating={r} starSize={11} size="2xs" color="$brandTextSecondary" fontFamily="$heading" />
            </HStack>
          </VStack>
          <TouchableOpacity
            onPress={onInfo}
            accessibilityRole="button"
            accessibilityLabel={`Informações de ${professional.name}`}
            testID={`info-${professional.id}`}
            hitSlop={8}
          >
            <Info size={18} color="#163300" />
          </TouchableOpacity>
          <ChevronRight size={18} color="#454745" />
        </HStack>
      </Box>
    </TouchableOpacity>
  );
}

export function EstablishmentDetail() {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation<AppNavigatorRoutesProps>();
  const { establishmentId, profissional: profissionalDoLink } = route.params as RouteParams;

  const { data: establishment, isLoading, isError } = useEstablishment(establishmentId);
  // C22 — o horário por DIA da semana (contrato de 16/09, no ar em staging
  // desde 17/09). Antes a tela só sabia "Aberto agora" / "Fechada agora": quem
  // chegava fora do horário não tinha como saber QUANDO a loja reabre, e o
  // agendar (modelo de 04/09) ficava sem sentido.
  const { data: horarios } = useEstablishmentHours(establishmentId);
  const [mostrarSemana, setMostrarSemana] = useState(false);
  const { data: professionals = [] } = useProfessionalsWithQueue(establishmentId);

  // Tempo real: atualiza a fila via WebSocket; o polling vira fallback (backend 18b)
  useQueueSocket(establishmentId);

  const [heroFailed, setHeroFailed] = useState(false);
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);

  const favoriteIds = useFavoritesStore((s) => s.ids);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const isFavorite = favoriteIds.includes(establishmentId);
  const handleToggleFavorite = () => toggleFavorite(establishmentId);

  function handleSelectProfessional(professionalId: string) {
    const prof = professionals.find((p) => p.id === professionalId);
    // "Fora" = fila fechada (ir para Fora fecha a fila, regra de 09/09). A tela
    // de servicos nao oferece a entrada — so o pedido de corte (24/09).
    // Trabalhando com a fila fechada (`accepting_new: false`) tambem nao recebe
    // ninguem novo: mesmo caminho de quem esta Fora (26/09).
    const fora = filaFechada(prof);
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
      profissionalFora: fora,
      soAgenda: ehSoAgenda(prof),
      queueCount: prof?.queue_count ?? 0,
    });
  }

  // "Trabalhando" e "Fora" sao secoes de TELA (contrato de 19/09): o backend
  // manda todo mundo e quem separa e o app.
  const { trabalhando, fora } = agruparPorExpediente(professionals);

  // Link compartilhado com `?profissional=` (24/09): assim que a loja e a
  // lista chegam, abre os servicos dele — uma vez so, para o voltar trazer a
  // pessoa a loja, e nao reabrir o profissional.
  const abriuDoLink = useRef(false);
  useEffect(() => {
    if (!profissionalDoLink || abriuDoLink.current || !establishment) return;
    if (!professionals.some((p) => p.id === profissionalDoLink)) return;
    abriuDoLink.current = true;
    handleSelectProfessional(profissionalDoLink);
    // handleSelectProfessional e recriada a cada render; o que importa aqui e
    // ter a loja e o profissional na mao.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profissionalDoLink, establishment, professionals]);

  function handleSelectShortestQueue() {
    if (trabalhando.length === 0) return;

    // ⚠️ So entre quem esta no expediente. Antes o botao podia mandar o cliente
    // para a "menor espera" de quem foi embora — que e sempre zero.
    const shortest = trabalhando.reduce((prev, curr) =>
      (curr.estimated_wait_minutes ?? 0) < (prev.estimated_wait_minutes ?? 0) ? curr : prev
    );

    handleSelectProfessional(shortest.id);
  }

  if (isLoading) {
    // O esqueleto tem de comecar na MESMA altura da tela pronta, senao o
    // conteudo PULA quando carrega. `pt={60}` era chute; o cabecalho real usa
    // `safe-area + 12`.
    return (
      <VStack flex={1} px={16} style={{ paddingTop: insets.top + 12 }} pb={30} bg="$brandBackground">
        <VStack mt="$6">
          <SkeletonList count={4} />
        </VStack>
      </VStack>
    );
  }

  if (isError || !establishment) {
    return (
      <Center flex={1} bg="$brandBackground">
        <Text color="$brandTextSecondary">Estabelecimento não encontrado</Text>
      </Center>
    );
  }

  const isOpen = isEffectivelyOpen(establishment);
  const agora = new Date();
  const hojeTexto = resumoDeHoje(horarios, agora);
  const reabre = !isOpen ? proximaAbertura(horarios, agora) : null;
  const semana = semanaParaExibir(horarios, agora);
  const endereco = enderecoEmUmaLinha(establishment.address);
  const mapa = linkDoMapa(establishment.address);
  const showPhoto = !!establishment.urlImage && !heroFailed;
  const minWait =
    trabalhando.length > 0
      ? Math.min(...trabalhando.map((p) => p.estimated_wait_minutes ?? 0))
      : 0;
  // Secao vazia nao entra: loja com todo mundo em expediente nao ganha um
  // "Fora" vazio, e loja fechada (que leva todos a OFF) mostra so o "Fora".
  const secoes = [
    { key: "trabalhando" as const, title: "Trabalhando", data: trabalhando },
    { key: "fora" as const, title: "Fora", data: fora },
  ].filter((s) => s.data.length > 0);
  const rating = resolveRating(
    establishment.rating_best ?? establishment.rating_average,
    establishment.rating_count,
  );

  // icone-compartilhar (CLI-9, Andre 11/10): o botao abre a folha de compartilhar
  // do sistema, onde a pessoa escolhe copiar ou a plataforma. Onde ela nao
  // existe (navegador sem Web Share), copia o link e avisa. A base da indicacao
  // (Andre, 26/09).
  async function handleCompartilhar() {
    const link = linkParaCompartilhar(raizDoSite(API_ENV), establishmentId);
    try {
      await Share.share({ message: textoDeDivulgacao({ loja: establishment!.name, link }) });
    } catch {
      if (await copiarTexto(link)) Alert.alert("Link copiado", "Cole onde quiser para indicar esta loja.");
    }
  }
  // Um so botao de favorito pros dois ramos (com foto e sem): antes cada ramo
  // desenhava o proprio, e eles ja tinham saido com tamanhos diferentes.
  const favorito = (
    <HeaderIconButton
      onPress={handleToggleFavorite}
      ground={showPhoto ? "foto" : "claro"}
      testID="favorite-button"
      accessibilityLabel={isFavorite ? "Remover dos favoritos" : "Salvar nos favoritos"}
      accessibilityState={{ selected: isFavorite }}
    >
      {/* Favoritado ENCHE o coracao: o estado nao pode depender so de uma
          diferenca sutil de cor. */}
      <Heart size={20} color="#163300" fill={isFavorite ? "#163300" : "none"} />
    </HeaderIconButton>
  );

  const acoes = (
    <HStack gap="$2">
      <HeaderIconButton
        onPress={handleCompartilhar}
        ground={showPhoto ? "foto" : "claro"}
        testID="compartilhar-loja"
        accessibilityLabel="Compartilhar a loja"
      >
        <Share2 size={20} color="#163300" />
      </HeaderIconButton>
      {favorito}
    </HStack>
  );

  return (
    <VStack flex={1} bg="$brandBackground">
      {/* O hero existe pra FOTO. Sem foto — ou com `urlImage` quebrada, que e
          comum nos cadastros — nao vira faixa de cor: cai no mesmo cabecalho
          simples das outras telas (voltar sobre o fundo claro). Faixa verde
          lisa nao carrega informacao nenhuma e so empurrava o conteudo pra
          baixo. */}
      {showPhoto ? (
        <Box height={210} width="$full">
          <Pressable
            style={{ flex: 1 }}
            onPress={() => setFotoAmpliada(establishment.urlImage!)}
            accessibilityLabel="Ver a foto da loja"
            testID="foto-da-loja"
          >
          {/* expo-image (melhoria de 02/10): a foto fica em disco. Ele nao tem
              ImageBackground — a foto ocupa o fundo e o cabecalho vem por cima. */}
          <Image
            source={{ uri: establishment.urlImage! }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            onError={() => setHeroFailed(true)}
            testID="foto-da-loja-imagem"
          />
          <Box px={16}>
            <ScreenHeader ground="foto" action={acoes} />
          </Box>
          </Pressable>
        </Box>
      ) : (
        // SEM foto o nome da loja e o titulo do cabecalho — voltar · nome ·
        // favoritar na mesma linha, como nas demais telas. Com foto ele nao
        // cabe ali (ficaria por cima da imagem) e desce pro corpo.
        <Box px={16}>
          <ScreenHeader title={establishment.name} action={acoes} />
        </Box>
      )}

      <VStack px={16} pt={showPhoto ? "$5" : "$0"} gap="$1.5">
        {showPhoto && (
          <Text
            fontFamily="$display"
            fontSize={fs(26)}
            lineHeight={fs(30)}
            letterSpacing={-1}
            color="$forest"
          >
            {establishment.name}
          </Text>
        )}
        <HStack alignItems="center" gap="$2">
          <NotaDaLoja rating={rating} starSize={14} gap="$2" size="sm" fontFamily="$heading" color="$brandTextPrimary" testID="nota-da-loja" />
          <Text size="sm" color="$brandTextSecondary">
            {rating.real && rating.count != null ? `(${rating.count} avaliações)` : ""}
            {establishment.distance_km != null
              ? `${rating.real && rating.count != null ? " · " : ""}${establishment.distance_km.toFixed(1)} km`
              : ""}
          </Text>
        </HStack>
        {/* O estado ("Aberto agora") responde SE dá para ir; o horário de hoje e
            o "reabre" respondem QUANDO — e são coisas diferentes. Loja que ainda
            não definiu a semana não ganha linha nenhuma: inventar horário é pior
            que não ter. */}
        <HStack alignItems="center" gap="$2" mt="$0.5">
          <Center
            width={7}
            height={7}
            borderRadius="$full"
            bg={isOpen ? "$brandGreen" : "$brandWarning"}
          />
          <Text size="sm" color="$brandTextSecondary" fontFamily="$heading">
            {/* `isOpen` e a LOJA, nao a fila. Dizer "fila fechada" aqui
                misturava dois estados que o app trata separado (a loja pode
                estar aberta com a fila drenando). */}
            {isOpen ? "Aberto agora" : "Fechada agora"}
          </Text>
          {/* loja-fechada (Design, 17/10): o mesmo badge do card do Inicio, ao
              lado do estado — fechada, mas com caminho. */}
          {!isOpen && <BadgeAgendar testID="agendar-da-loja" />}
          {isOpen && trabalhando.length > 0 && (
            <>
              <Center width={3} height={3} borderRadius="$full" bg="$brandTextSecondary" />
              {/* `formatWaitTime(0)` devolve "Agora" — "menor espera Agora" fica
                  estranho, entao sem fila vira "sem espera". */}
              <Text size="sm" color="$brandTextSecondary">
                {minWait < 1 ? "sem espera" : `menor espera ${formatWaitTime(minWait)}`}
              </Text>
            </>
          )}
        </HStack>

        {(hojeTexto || reabre) && (
          <TouchableOpacity
            onPress={() => setMostrarSemana((v) => !v)}
            disabled={semana.length === 0}
            accessibilityRole="button"
            accessibilityLabel="Horário de funcionamento"
            testID="horario-hoje"
          >
            <HStack alignItems="center" gap="$2" mt="$2">
              <Clock size={14} color="#454745" />
              <Text size="sm" color="$brandTextSecondary">
                {hojeTexto}
                {reabre ? ` · ${reabre}` : ""}
              </Text>
              {semana.length > 0 && (
                <ChevronDown
                  size={14}
                  color="#454745"
                  style={{ transform: [{ rotate: mostrarSemana ? "180deg" : "0deg" }] }}
                />
              )}
            </HStack>
          </TouchableOpacity>
        )}

        {/* Onde fica. Logo abaixo do horario: as duas perguntas de quem vai sair
            de casa sao "esta aberto?" e "como chego?". Tocar abre o mapa. */}
        {endereco && (
          <TouchableOpacity
            onPress={() => mapa && Linking.openURL(mapa)}
            disabled={!mapa}
            accessibilityRole="link"
            accessibilityLabel={`Endereço: ${endereco}. Abrir no mapa`}
            testID="endereco-da-loja"
          >
            <HStack alignItems="flex-start" gap="$2" mt="$2">
              <MapPin size={14} color="#454745" style={{ marginTop: 3 }} />
              <Text size="sm" color="$brandTextSecondary" flex={1}>
                {endereco}
                {mapa ? (
                  <Text size="sm" color="$forest" fontFamily="$heading">
                    {"  "}Como chegar
                  </Text>
                ) : null}
              </Text>
            </HStack>
          </TouchableOpacity>
        )}

        {mostrarSemana && semana.length > 0 && (
          <VStack mt="$2" gap="$1" testID="semana">
            {semana.map((linha) => (
              <HStack key={linha.dia} justifyContent="space-between">
                <Text
                  size="sm"
                  color={linha.ehHoje ? "$brandTextPrimary" : "$brandTextSecondary"}
                  fontWeight={linha.ehHoje ? "$semibold" : "$normal"}
                >
                  {linha.nome}
                </Text>
                <Text
                  size="sm"
                  color={linha.ehHoje ? "$brandTextPrimary" : "$brandTextSecondary"}
                  fontWeight={linha.ehHoje ? "$semibold" : "$normal"}
                >
                  {linha.texto}
                </Text>
              </HStack>
            ))}
          </VStack>
        )}
      </VStack>

      <VStack flex={1} px={16} pt="$5">
        <HStack justifyContent="space-between" alignItems="center" mb="$3">
          <Text fontFamily="$display" fontSize="$lg" color="$forest">
            Quem está atendendo
          </Text>
          {isOpen && (
            <Box bg="$greenTint" borderRadius="$full" px="$3" py="$1">
              <HStack alignItems="center" gap="$1">
                <LiveDot size={5} color="#163300" />
                <Text size="2xs" fontFamily="$heading" color="$forest">
                  Ao vivo
                </Text>
              </HStack>
            </Box>
          )}
        </HStack>

        {/* O cabecalho "Trabalhando" so aparece quando existe a OUTRA secao:
            numa loja com todo mundo em expediente ele seria rotulo sem
            contraste. Ja o "Fora" aparece SEMPRE — sozinho, ele e justamente o
            que explica por que ninguem esta disponivel. */}
        <SectionList
          sections={secoes}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: 12 }}
          renderSectionHeader={({ section }) =>
            secoes.length > 1 || section.key === "fora" ? (
              <Text
                size="xs"
                fontFamily="$heading"
                color="$brandTextSecondary"
                mb="$2"
                testID={`secao-${section.key}`}
              >
                {section.title}
              </Text>
            ) : null
          }
          renderItem={({ item, section }) => (
            <ProfessionalRow
              professional={item}
              lojaAberta={isOpen}
              fora={section.key === "fora"}
              onPress={() => handleSelectProfessional(item.id)}
              onVerFoto={setFotoAmpliada}
              onInfo={() =>
                navigation.navigate("professionalInfo", {
                  professionalId: item.id,
                  establishmentId,
                  professionalName: item.name,
                })
              }
            />
          )}
          ListEmptyComponent={
            <Center mt="$4">
              <Text color="$brandTextSecondary">Nenhum profissional disponível</Text>
            </Center>
          }
        />
      </VStack>

      <VStack px={16} pb={32}>
        {isOpen && trabalhando.length > 0 && (
          <Button title="Entrar com menor espera" onPress={handleSelectShortestQueue} />
        )}

        {/* Loja fechada agora (inclui OPEN fora do horário): no lugar do botão de
            fila, banner âmbar acionável (Andre 2026-07-23) — o fluxo segue pelo
            profissional, onde as ações são Agendar / Solicitar corte. */}
        {!isOpen && (
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                "Fechada agora",
                "A loja não está recebendo clientes neste momento. Escolha um profissional para AGENDAR um horário ou SOLICITAR um corte (o profissional responde em até 5 minutos).",
              )
            }
          >
            <Box
              bg="$brandWarning"
              borderRadius="$card"
              px="$4"
              py="$3"
            >
              <HStack alignItems="center" gap="$2">
                <Info size={18} color="#163300" />
                <Text size="xs" color="$forest" fontFamily="$heading" flex={1}>
                  Fechada agora — escolha um profissional para agendar ou
                  solicitar um corte.
                </Text>
              </HStack>
            </Box>
          </TouchableOpacity>
        )}
      </VStack>
      <FotoAmpliada uri={fotoAmpliada} onClose={() => setFotoAmpliada(null)} />
    </VStack>
  );
}
