import { memo } from "react";
import { TouchableOpacity } from "react-native";
import { VStack, Text, HStack, Center } from "@gluestack-ui/themed";
import { Star } from "lucide-react-native";

import { Establishment } from "@domain/establishment/types";
import { formatDistanceKm } from "@domain/establishment/proximity";
import { statusTag } from "@domain/establishment/statusTag";
import { serviceTypeLabel } from "@domain/establishment/serviceType";
import { resolveRating } from "@domain/establishment/rating";
import { PlaceAvatar } from "@components/PlaceAvatar";
import { LiveDot } from "@components/LiveDot";
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
        fontSize={fs(12)}
        fontWeight="$bold"
        color={live ? "$forest" : "$brandTextSecondary"}
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
  destaque,
  onPress,
}: {
  establishment: Establishment;
  // "Pra ontem": em quanto tempo a pessoa senta na cadeira, contando o caminho.
  destaque?: string | null;
  // Distancia real (GPS). null = device sem coordenada ou loja ainda nao
  // geocodificada pelo backend — a linha some, a loja nunca some da lista.
  distanceKm: number | null;
  onPress: (establishment: Establishment) => void;
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

  const meta: string[] = destaque ? [destaque] : [];
  if (establishment.serviceType) meta.push(serviceTypeLabel(establishment.serviceType));
  if (distanceKm != null) meta.push(formatDistanceKm(distanceKm));
  // A nota voltou ao card (Andre, 09/10: "a distancia e a avaliacao devem
  // aparecer no card da home"). Tinha saido no redesenho de 16/08 (7344e150).
  // A mesma fonte da tela da loja: a melhor nota da loja, senao a media.
  const nota = resolveRating(
    establishment.rating_best ?? establishment.rating_average,
    establishment.rating_count,
    establishment.id,
  );

  return (
    <TouchableOpacity onPress={() => onPress(establishment)} testID={`establishment-${establishment.id}`}>
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
          <Text fontFamily="$display" fontSize={fs(15)} fontWeight="$bold" color="$brandTextPrimary">
            {establishment.name}
          </Text>
          <HStack gap={8} alignItems="center" flexWrap="wrap">
            <HStack gap={3} alignItems="center" testID={`nota-${establishment.id}`}>
              <Star size={12} color="#163300" fill="#163300" />
              <Text fontFamily="$heading" fontSize={fs(13)} color="$brandTextPrimary">
                {nota.value.toFixed(1)}
              </Text>
            </HStack>
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
          </HStack>
        </VStack>
        {/* Fechada nao e beco sem saida: ainda da pra agendar (Andre 2026-07-23). */}
        <StatusPill {...tag} />
      </HStack>
    </TouchableOpacity>
  );
});
