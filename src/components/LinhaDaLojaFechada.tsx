import { memo } from "react";
import { TouchableOpacity } from "react-native";
import { VStack, Box, Text, HStack } from "@gluestack-ui/themed";

import { Establishment } from "@domain/establishment/types";
import { serviceTypeLabel } from "@domain/establishment/serviceType";
import { formatDistanceKm } from "@domain/establishment/proximity";
import { textoDaProximaAbertura } from "@domain/establishment/horarios";
import { PlaceAvatar } from "@components/PlaceAvatar";
import { BadgeAgendar } from "@components/BadgeAgendar";

// Loja fechada NAO some da lista (Andre 2026-07-23: da pra agendar/solicitar
// para a reabertura) — entra no fim, com o caminho aberto: o selo AGENDAR no
// canto, o mesmo do card do Inicio. A linha NAO fica apagada (decisao da Design,
// 17/10, loja-fechada): `opacity` multiplica sobre tudo e o nome da loja cai abaixo de 4,5:1, e a linha
// cinza dizia "nao da pra nada" numa loja que aceita agendar.
//
// horario-de-funcionamento-visivel (CLI-24, DEC-159): o `next_open` da listagem (BAK-19) diz quando a loja abre
// ("Abre amanhã, 09:00"). Sem horario publicado, omite: inventar um horario seria pior.
// estudo-desempenho (DEC-145): `memo` — a lista passa um `onPress` novo a cada render, mas ele so depende da
// loja; sem a loja nova, a linha nao desenha de novo.
export const LinhaDaLojaFechada = memo(function LinhaDaLojaFechada({
  establishment,
  onPress,
}: {
  establishment: Establishment;
  onPress: () => void;
}) {
  const abre = textoDaProximaAbertura(establishment.next_open, new Date());
  return (
    <TouchableOpacity onPress={onPress} testID={`establishment-${establishment.id}`}>
      <Box bg="$brandSurface" p="$3" mb="$3" borderRadius="$card">
        <HStack alignItems="center" gap="$3">
          <PlaceAvatar name={establishment.name} photoUrl={establishment.urlImage} />
          <VStack flex={1}>
            <Text fontFamily="$heading" fontSize="$sm" color="$brandTextPrimary">
              {establishment.name}
            </Text>
            <Text size="xs" color="$brandTextSecondary" mt="$0.5">
              {serviceTypeLabel(establishment.serviceType ?? "")}
              {establishment.distance_km != null
                ? ` · ${formatDistanceKm(establishment.distance_km)}`
                : ""}
            </Text>
            {abre ? (
              <Text size="xs" color="$brandTextSecondary" mt="$0.5" testID={`abre-${establishment.id}`}>
                {abre}
              </Text>
            ) : null}
          </VStack>
          <BadgeAgendar testID={`agendar-${establishment.id}`} />
        </HStack>
      </Box>
    </TouchableOpacity>
  );
}, (a, b) => a.establishment === b.establishment);
