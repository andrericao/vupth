import { useState } from "react";
import { SectionList, TouchableOpacity, Alert, ImageBackground } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  VStack,
  Box,
  Text,
  HStack,
  Center,
} from "@gluestack-ui/themed";
import { Star, Info, Heart, ChevronRight, Clock, ChevronDown } from "lucide-react-native";

import { ScreenHeader, HeaderIconButton } from "@components/ScreenHeader";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { Button } from "@components/Button";
import { SkeletonList } from "@components/Skeleton";
import { PlaceAvatar } from "@components/PlaceAvatar";
import { LiveDot } from "@components/LiveDot";
import { ProfessionalWithQueue } from "@domain/professional/types";
import { agruparPorExpediente, emIntervalo } from "@domain/professional/expediente";
import { resolveRating } from "@domain/establishment/rating";
import { formatSpecialty } from "@domain/establishment/serviceType";
import { isEffectivelyOpen } from "@domain/establishment/types";
import { formatWaitTime } from "@domain/queue/types";
import { useEstablishment, useEstablishmentHours, useProfessionalsWithQueue } from "@hooks/useEstablishments";
import { proximaAbertura, resumoDeHoje, semanaParaExibir } from "@domain/establishment/horarios";
import { useQueueSocket } from "@hooks/useQueueSocket";
import { useFavoritesStore } from "@stores/favoritesStore";

type RouteParams = {
  establishmentId: string;
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
}: {
  professional: ProfessionalWithQueue;
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
    professional.id,
  );

  return (
    <TouchableOpacity onPress={onPress} testID={`professional-${professional.id}`}>
      <Box bg="$brandSurface" p="$3" mb="$3" borderRadius="$card">
        <HStack alignItems="center" gap="$3">
          <PlaceAvatar name={professional.name} />
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
              <HStack alignItems="center" gap="$1">
                <Star size={11} color="#163300" fill="#163300" />
                <Text size="2xs" color="$brandTextSecondary" fontFamily="$heading">
                  {r.value.toFixed(1)}
                </Text>
              </HStack>
            </HStack>
          </VStack>
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
  const { establishmentId } = route.params as RouteParams;

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

  const favoriteIds = useFavoritesStore((s) => s.ids);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const isFavorite = favoriteIds.includes(establishmentId);
  const handleToggleFavorite = () => toggleFavorite(establishmentId);

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
      queueCount: prof?.queue_count ?? 0,
    });
  }

  // "Trabalhando" e "Fora" sao secoes de TELA (contrato de 19/09): o backend
  // manda todo mundo e quem separa e o app.
  const { trabalhando, fora } = agruparPorExpediente(professionals);

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
    establishment.id,
  );

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

  return (
    <VStack flex={1} bg="$brandBackground">
      {/* O hero existe pra FOTO. Sem foto — ou com `urlImage` quebrada, que e
          comum nos cadastros — nao vira faixa de cor: cai no mesmo cabecalho
          simples das outras telas (voltar sobre o fundo claro). Faixa verde
          lisa nao carrega informacao nenhuma e so empurrava o conteudo pra
          baixo. */}
      {showPhoto ? (
        <Box height={210} width="$full">
          <ImageBackground
            source={{ uri: establishment.urlImage! }}
            style={{ flex: 1 }}
            resizeMode="cover"
            onError={() => setHeroFailed(true)}
          >
            <Box px={16}>
              <ScreenHeader ground="foto" action={favorito} />
            </Box>
          </ImageBackground>
        </Box>
      ) : (
        // SEM foto o nome da loja e o titulo do cabecalho — voltar · nome ·
        // favoritar na mesma linha, como nas demais telas. Com foto ele nao
        // cabe ali (ficaria por cima da imagem) e desce pro corpo.
        <Box px={16}>
          <ScreenHeader title={establishment.name} action={favorito} />
        </Box>
      )}

      <VStack px={16} pt={showPhoto ? "$5" : "$0"} gap="$1.5">
        {showPhoto && (
          <Text
            fontFamily="$display"
            fontSize={26}
            lineHeight={30}
            letterSpacing={-1}
            color="$forest"
          >
            {establishment.name}
          </Text>
        )}
        <HStack alignItems="center" gap="$2">
          <Star size={14} color="#163300" fill="#163300" />
          <Text size="sm" fontFamily="$heading" color="$brandTextPrimary">
            {rating.value.toFixed(1)}
          </Text>
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
    </VStack>
  );
}
