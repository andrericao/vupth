import { memo } from "react";
import { TouchableOpacity } from "react-native";
import { VStack, Text, HStack, Center } from "@gluestack-ui/themed";
import { MapPin } from "lucide-react-native";

import { Establishment } from "@domain/establishment/types";
import { formatDistanceKm } from "@domain/establishment/proximity";
import { statusTag } from "@domain/establishment/statusTag";
import { serviceTypeLabel } from "@domain/establishment/serviceType";
import { resolveRating } from "@domain/establishment/rating";
import { NotaDaLoja } from "@components/NotaDaLoja";
import { PlaceAvatar } from "@components/PlaceAvatar";
import { LiveDot } from "@components/LiveDot";
import { BadgeAgendar } from "@components/BadgeAgendar";
import { useTema } from "@hooks/useTema";
import { fs } from "@stores/fonteStore";

// O card de uma loja na lista do Inicio (saiu da Home em 09/10, junto com a
// volta da nota: assim o card tem teste proprio sem carregar a Home inteira).

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
  const { cores } = useTema();
  // agendar-ambar (18/10): fechada, o convite e o selo ambar AGENDAR.
  if (!live) return <BadgeAgendar testID="status-agendar" />;
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
      {/* O ponto e o rotulo estao sobre o green, que e o mesmo nos dois temas: o par e o onGreen. */}
      {live && <LiveDot size={8} color={cores.onGreen} pulsing />}
      <Text
        fontFamily="$display"
        fontSize={fs(12)}
        fontWeight="$bold"
        color={live ? "$onGreen" : "$brandTextSecondary"}
      >
        {label}
      </Text>
    </HStack>
  );
}

// Memorizada (Andre, 18/09: "apresentar de acordo como o usuario vai
// scrollando"): a Home re-renderiza a cada tique do countdown, a cada letra da
// busca e quando a pilula aparece — e cada vez redesenhava TODAS as linhas.
export const CardDaLoja = memo(function CardDaLoja({
  establishment,
  distanceKm,
  semGps = false,
  destaque,
  onPress,
}: {
  establishment: Establishment;
  // "Pra ontem": em quanto tempo a pessoa senta na cadeira, contando o caminho.
  destaque?: string | null;
  // Distancia real (GPS). null = device sem coordenada ou loja ainda nao
  // geocodificada pelo backend — a linha some, a loja nunca some da lista.
  distanceKm: number | null;
  // Aparelho sem localizacao: no lugar da distancia, "Ligue o GPS" (Andre,
  // 09/10). Com GPS e loja sem coordenada, a distancia so some.
  semGps?: boolean;
  onPress: (establishment: Establishment) => void;
}) {
  const { cores } = useTema();
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

  const meta: string[] = destaque ? [destaque] : [];
  if (establishment.serviceType) meta.push(serviceTypeLabel(establishment.serviceType));
  // A distancia sai da meta: tem icone proprio (distancia-no-card, Andre 09/10:
  // "quero o icone de distancia tambem").
  const distancia = distanceKm != null ? formatDistanceKm(distanceKm) : semGps ? "Ligue o GPS" : null;
  // A nota voltou ao card (Andre, 09/10: "a distancia e a avaliacao devem
  // aparecer no card da home"). Tinha saido no redesenho de 16/08 (7344e150).
  // A mesma fonte da tela da loja: a melhor nota da loja, senao a media.
  const nota = resolveRating(
    establishment.rating_best ?? establishment.rating_average,
    establishment.rating_count,
  );

  return (
    <TouchableOpacity onPress={() => onPress(establishment)} testID={`establishment-${establishment.id}`}>
      {/* Fechada NAO entra apagada (decisao da Design, 17/10, loja-fechada):
          `opacity` multiplica sobre tudo — a 0,8 o nome da loja ja ficava em
          4,92:1, e a linha cinza dizia "nao da pra nada" numa loja que aceita
          agendar. O aviso e o selo AGENDAR, no canto. */}
      <HStack bg="$brandSurface" borderRadius={18} gap={14} p={14} mb={12} alignItems="center">
        {/* As iniciais saem no par do greenTint (o padrao do avatar): forest no claro, green no escuro. */}
        <PlaceAvatar name={establishment.name} photoUrl={establishment.urlImage} />
        <VStack flex={1} gap={4}>
          <Text fontFamily="$display" fontSize={fs(15)} fontWeight="$bold" color="$brandTextPrimary">
            {establishment.name}
          </Text>
          <HStack gap={8} alignItems="center" flexWrap="wrap">
            <NotaDaLoja
              rating={nota}
              starSize={12}
              gap={3}
              testID={`nota-${establishment.id}`}
              fontFamily="$heading"
              fontSize={fs(13)}
              color="$brandTextPrimary"
            />
            {/* O ponto SEPARA, entao nao vem antes do primeiro item. Antes a
                linha comecava com o `queueLabel` e a meta so completava; sem
                ele, o separador virou um "·" orfao no comeco. */}
            {meta.map((m) => (
              <HStack key={m} gap={8} alignItems="center">
                <Center width={3} height={3} borderRadius={1.5} bg="$brandTextSecondary" />
                <Text fontFamily="$body" fontSize={fs(13)} color="$brandTextSecondary">
                  {m}
                </Text>
              </HStack>
            ))}
            {distancia && (
              <HStack gap={8} alignItems="center">
                <Center width={3} height={3} borderRadius={1.5} bg="$brandTextSecondary" />
                <HStack gap={3} alignItems="center" testID={`distancia-${establishment.id}`}>
                  <MapPin size={12} color={cores.textPrimary} />
                  <Text fontFamily="$body" fontSize={fs(13)} color="$brandTextSecondary">
                    {distancia}
                  </Text>
                </HStack>
              </HStack>
            )}
          </HStack>
        </VStack>
        {/* Fechada nao e beco sem saida: ainda da pra agendar (Andre 2026-07-23). */}
        <StatusPill {...tag} />
      </HStack>
    </TouchableOpacity>
  );
});
