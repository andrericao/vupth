import { TouchableOpacity } from "react-native";
import { VStack, Box, Text, HStack } from "@gluestack-ui/themed";

import { Establishment } from "@domain/establishment/types";
import { serviceTypeLabel } from "@domain/establishment/serviceType";
import { formatDistanceKm } from "@domain/establishment/proximity";
import { PlaceAvatar } from "@components/PlaceAvatar";
import { BadgeAgendar } from "@components/BadgeAgendar";

// Loja fechada NAO some da lista (Andre 2026-07-23: da pra agendar/solicitar
// para a reabertura) — entra no fim, com o caminho aberto: o selo AGENDAR no
// canto, o mesmo do card do Inicio. A linha NAO fica apagada (decisao da Design,
// 17/10, loja-fechada): `opacity` multiplica sobre tudo e o nome da loja cai abaixo de 4,5:1, e a linha
// cinza dizia "nao da pra nada" numa loja que aceita agendar.
//
// ⚠️ C22: o desenho do Pencil mostra "Abre amanha as 9h" aqui, mas o contrato
// de hoje so tem o booleano `is_open` — sem opening/closing time, e muito menos
// por dia da semana. Inventar um horario seria pior do que omitir: mostramos so
// o badge. Quando o backend entregar a grade (S27), e esta linha que ganha o
// "abre <dia> as <hora>".
export function LinhaDaLojaFechada({
  establishment,
  onPress,
}: {
  establishment: Establishment;
  onPress: () => void;
}) {
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
          </VStack>
          <BadgeAgendar testID={`agendar-${establishment.id}`} />
        </HStack>
      </Box>
    </TouchableOpacity>
  );
}
