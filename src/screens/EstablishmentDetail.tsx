import { useState } from "react";
import { FlatList, TouchableOpacity, Alert, ImageBackground } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  VStack,
  Box,
  Text,
  HStack,
  Center,
} from "@gluestack-ui/themed";
import { Star, Info, ChevronLeft, Heart, ChevronRight } from "lucide-react-native";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { Button } from "@components/Button";
import { SkeletonList } from "@components/Skeleton";
import { PlaceAvatar } from "@components/PlaceAvatar";
import { LiveDot } from "@components/LiveDot";
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
  onPress,
}: {
  professional: ProfessionalWithQueue;
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
            <HStack alignItems="center" gap="$2" mt="$0.5">
              <Text size="xs" color="$brandTextPrimary" fontFamily="$heading">
                {queueCount === 0 ? "Sem fila" : `${queueCount} na fila`}
              </Text>
              <Center width={3} height={3} borderRadius="$full" bg="$brandTextSecondary" />
              <Text size="xs" color="$brandTextSecondary">
                {queueCount === 0
                  ? "Agora"
                  : `~${formatWaitTime(professional.estimated_wait_minutes ?? 0)}`}
              </Text>
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
                <Star size={11} color="#FFB703" fill="#FFB703" />
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
  const route = useRoute();
  const navigation = useNavigation<AppNavigatorRoutesProps>();
  const { establishmentId } = route.params as RouteParams;

  const { data: establishment, isLoading, isError } = useEstablishment(establishmentId);
  const { data: professionals = [] } = useProfessionalsWithQueue(establishmentId);

  // Tempo real: atualiza a fila via WebSocket; o polling vira fallback (backend 18b)
  useQueueSocket(establishmentId);

  const [heroFailed, setHeroFailed] = useState(false);

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

  function handleSelectShortestQueue() {
    if (professionals.length === 0) return;

    const shortest = professionals.reduce((prev, curr) =>
      (curr.estimated_wait_minutes ?? 0) < (prev.estimated_wait_minutes ?? 0) ? curr : prev
    );

    handleSelectProfessional(shortest.id);
  }

  if (isLoading) {
    return (
      <VStack flex={1} px={20} pt={60} pb={30} bg="$brandBackground">
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
  const showPhoto = !!establishment.urlImage && !heroFailed;
  const minWait =
    professionals.length > 0
      ? Math.min(...professionals.map((p) => p.estimated_wait_minutes ?? 0))
      : 0;
  const rating = resolveRating(
    establishment.rating_best ?? establishment.rating_average,
    establishment.rating_count,
    establishment.id,
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
            <HeroNav onBack={() => navigation.goBack()} onPhoto />
          </ImageBackground>
        </Box>
      ) : (
        <HeroNav onBack={() => navigation.goBack()} />
      )}

      <VStack px={20} pt="$5" gap="$1.5">
        <Text
          fontFamily="$display"
          fontSize={26}
          lineHeight={30}
          letterSpacing={-1}
          color="$forest"
        >
          {establishment.name}
        </Text>
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
        {/* ⚠️ C22 (PRD do client): o horario e por DIA da semana e a tela deveria
            mostrar o dia corrente ("Hoje 9h-19h") e quando reabre. O contrato de
            hoje so tem o booleano `is_open` — sem opening/closing time — entao
            mostramos o estado, que e o que existe. A grade por dia depende do
            backend (S27). */}
        <HStack alignItems="center" gap="$2" mt="$0.5">
          <Center
            width={7}
            height={7}
            borderRadius="$full"
            bg={isOpen ? "$brandGreen" : "$amber500"}
          />
          <Text size="sm" color="$brandTextSecondary" fontFamily="$heading">
            {isOpen ? "Aberto agora" : "Fila fechada agora"}
          </Text>
          {isOpen && professionals.length > 0 && (
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
      </VStack>

      <VStack flex={1} px={20} pt="$5">
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

        <FlatList
          data={professionals}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 12 }}
          renderItem={({ item }) => (
            <ProfessionalRow
              professional={item}
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

      <VStack px={20} pb={32}>
        {isOpen && professionals.length > 0 && (
          <Button title="Entrar com menor espera" onPress={handleSelectShortestQueue} />
        )}

        {/* Loja fechada agora (inclui OPEN fora do horário): no lugar do botão de
            fila, banner âmbar acionável (Andre 2026-07-23) — o fluxo segue pelo
            profissional, onde as ações são Agendar / Solicitar corte. */}
        {!isOpen && (
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
              borderRadius="$card"
              px="$4"
              py="$3"
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
    </VStack>
  );
}

function HeroNav({ onBack, onPhoto }: { onBack: () => void; onPhoto?: boolean }) {
  return (
    <HStack justifyContent="space-between" alignItems="center" px={20} pt={56}>
      <TouchableOpacity onPress={onBack} testID="back-button">
        <Center width={40} height={40} borderRadius="$full" bg={onPhoto ? "#FFFFFFE6" : "$greenTint"}>
          <ChevronLeft size={20} color="#163300" />
        </Center>
      </TouchableOpacity>
      <Center width={40} height={40} borderRadius="$full" bg={onPhoto ? "#FFFFFFE6" : "$greenTint"}>
        <Heart size={20} color="#163300" />
      </Center>
    </HStack>
  );
}
