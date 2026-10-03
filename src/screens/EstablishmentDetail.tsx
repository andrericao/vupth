import { useEffect, useRef, useState } from "react";
import { SectionList, TouchableOpacity, Alert, Linking, Share, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Star, Info, Heart, ChevronRight, Clock, ChevronDown, MapPin, Copy } from "lucide-react-native";
import { copiarTexto } from "@utils/copiar";
import { FotoAmpliada } from "@components/FotoAmpliada";
import { linkParaCompartilhar, raizDoSite } from "@routes/linking";
import { API_ENV } from "@services/api";

import { ScreenHeader, HeaderIconButton } from "@components/ScreenHeader";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { Button } from "@components/Button";
import { SkeletonList } from "@components/Skeleton";
import { PlaceAvatar } from "@components/PlaceAvatar";
import { LiveDot } from "@components/LiveDot";
import { ProfessionalWithQueue } from "@domain/professional/types";
import { agruparPorExpediente, emIntervalo, estaNoExpediente, filaFechada } from "@domain/professional/expediente";
import { resolveRating } from "@domain/establishment/rating";
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
}: {
  professional: ProfessionalWithQueue;
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
    professional.id,
  );

  return (
    <TouchableOpacity onPress={onPress} testID={`professional-${professional.id}`}>
      <View className="bg-vupth-surface p-3 mb-3 rounded-card">
        <View className="flex-row items-center gap-3">
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
          <View className="flex-1">
            <Text className="font-heading text-sm text-vupth-forest">
              {professional.name}
            </Text>
            {/* ⚠️ Com a LOJA FECHADA, "Sem fila · Agora" convidava a ir agora
                dentro de uma tela que diz "Fechada agora" — o mesmo defeito ja
                corrigido na Home. Fechada, a linha diz o que da pra fazer. */}
            <View className="flex-row items-center gap-2 mt-0.5">
              {!lojaAberta ? (
                <Text className="font-heading text-xs text-vupth-textSecondary">
                  Agendar
                </Text>
              ) : fora ? (
                /* Quem esta fora do expediente nao recebe: anunciar "Sem fila ·
                   Agora" aqui convidava para uma fila que ninguem vai atender —
                   e era o defeito que o Partner reportou em 07/09. */
                <Text className="font-heading text-xs text-vupth-textSecondary">
                  Fila fechada
                </Text>
              ) : (
                <>
                  <Text className="font-heading text-xs text-vupth-textPrimary">
                    {queueCount === 0 ? "Sem fila" : `${queueCount} na fila`}
                  </Text>
                  <View className="items-center justify-center w-[3px] h-[3px] rounded-full bg-vupth-textSecondary" />
                  <Text className="font-body text-xs text-vupth-textSecondary">
                    {queueCount === 0
                      ? "Agora"
                      : `~${formatWaitTime(professional.estimated_wait_minutes ?? 0)}`}
                  </Text>
                  {/* Intervalo e almoco ou saida rapida: a pessoa VOLTA e a fila
                      dela segue andando, por isso ela fica entre quem trabalha —
                      mas com o rotulo, senao a espera anunciada engana. */}
                  {estaNoExpediente(professional.work_status) && professional.accepting_new === false && (
                    <>
                      <View className="items-center justify-center w-[3px] h-[3px] rounded-full bg-vupth-textSecondary" />
                      <Text className="font-heading text-xs text-vupth-textSecondary" testID={`fila-fechada-${professional.id}`}>
                        Fila fechada
                      </Text>
                    </>
                  )}
                  {emIntervalo(professional.work_status) && (
                    <>
                      <View className="items-center justify-center w-[3px] h-[3px] rounded-full bg-vupth-textSecondary" />
                      <Text className="font-heading text-xs text-vupth-textSecondary">
                        Em intervalo
                      </Text>
                    </>
                  )}
                </>
              )}
            </View>
            <View className="flex-row items-center gap-2 mt-0.5">
              {/* `specialty` e texto livre no backend, mas parte dos cadastros
                  veio com a categoria em INGLES — era isso que aparecia aqui
                  (Andre 2026-08-06). `formatSpecialty` traduz o que reconhece e
                  preserva quem escreveu a especialidade de verdade. */}
              <Text className="font-body text-f10 text-vupth-textSecondary flex-1" numberOfLines={1}>
                {formatSpecialty(professional.specialty)}
              </Text>
              <View className="flex-row items-center gap-1">
                <Star size={11} color="#163300" fill="#163300" />
                <Text className="font-heading text-f10 text-vupth-textSecondary">
                  {r.value.toFixed(1)}
                </Text>
              </View>
            </View>
          </View>
          <ChevronRight size={18} color="#454745" />
        </View>
      </View>
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
      <View className="flex-1 px-4 pb-[30px] bg-vupth-background" style={{ paddingTop: insets.top + 12 }}>
        <View className="mt-6">
          <SkeletonList count={4} />
        </View>
      </View>
    );
  }

  if (isError || !establishment) {
    return (
      <View className="items-center justify-center flex-1 bg-vupth-background">
        <Text className="font-body text-vupth-textSecondary text-md">Estabelecimento não encontrado</Text>
      </View>
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
    establishment.id,
  );

  // Copiar o link da loja (Andre, 26/09): a base da indicacao. Sem o modulo
  // nativo (APK anterior ao build), cai no compartilhar do sistema.
  async function handleCopiarLink() {
    const link = linkParaCompartilhar(raizDoSite(API_ENV), establishmentId);
    if (await copiarTexto(link)) {
      Alert.alert("Link copiado", "Cole onde quiser para indicar esta loja.");
      return;
    }
    Share.share({ message: link }).catch(() => {});
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
    <View className="flex-row gap-2">
      <HeaderIconButton
        onPress={handleCopiarLink}
        ground={showPhoto ? "foto" : "claro"}
        testID="copiar-link"
        accessibilityLabel="Copiar o link da loja"
      >
        <Copy size={20} color="#163300" />
      </HeaderIconButton>
      {favorito}
    </View>
  );

  return (
    <View className="flex-1 bg-vupth-background">
      {/* O hero existe pra FOTO. Sem foto — ou com `urlImage` quebrada, que e
          comum nos cadastros — nao vira faixa de cor: cai no mesmo cabecalho
          simples das outras telas (voltar sobre o fundo claro). Faixa verde
          lisa nao carrega informacao nenhuma e so empurrava o conteudo pra
          baixo. */}
      {showPhoto ? (
        <View className="h-[210px] w-full">
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
          <View className="px-4">
            <ScreenHeader ground="foto" action={acoes} />
          </View>
          </Pressable>
        </View>
      ) : (
        // SEM foto o nome da loja e o titulo do cabecalho — voltar · nome ·
        // favoritar na mesma linha, como nas demais telas. Com foto ele nao
        // cabe ali (ficaria por cima da imagem) e desce pro corpo.
        <View className="px-4">
          <ScreenHeader title={establishment.name} action={acoes} />
        </View>
      )}

      <View className={`px-4 ${showPhoto ? "pt-5" : "pt-0"} gap-1.5`}>
        {showPhoto && (
          <Text
            className="font-display text-f26 text-vupth-forest"
            style={{ lineHeight: fs(30), letterSpacing: -1 }}
          >
            {establishment.name}
          </Text>
        )}
        <View className="flex-row items-center gap-2">
          <Star size={14} color="#163300" fill="#163300" />
          <Text className="font-heading text-sm text-vupth-textPrimary">
            {rating.value.toFixed(1)}
          </Text>
          <Text className="font-body text-sm text-vupth-textSecondary">
            {rating.real && rating.count != null ? `(${rating.count} avaliações)` : ""}
            {establishment.distance_km != null
              ? `${rating.real && rating.count != null ? " · " : ""}${establishment.distance_km.toFixed(1)} km`
              : ""}
          </Text>
        </View>
        {/* O estado ("Aberto agora") responde SE dá para ir; o horário de hoje e
            o "reabre" respondem QUANDO — e são coisas diferentes. Loja que ainda
            não definiu a semana não ganha linha nenhuma: inventar horário é pior
            que não ter. */}
        <View className="flex-row items-center gap-2 mt-0.5">
          <View
            className={`items-center justify-center w-[7px] h-[7px] rounded-full ${isOpen ? "bg-vupth-green" : "bg-vupth-warning"}`}
          />
          <Text className="font-heading text-sm text-vupth-textSecondary">
            {/* `isOpen` e a LOJA, nao a fila. Dizer "fila fechada" aqui
                misturava dois estados que o app trata separado (a loja pode
                estar aberta com a fila drenando). */}
            {isOpen ? "Aberto agora" : "Fechada agora"}
          </Text>
          {isOpen && trabalhando.length > 0 && (
            <>
              <View className="items-center justify-center w-[3px] h-[3px] rounded-full bg-vupth-textSecondary" />
              {/* `formatWaitTime(0)` devolve "Agora" — "menor espera Agora" fica
                  estranho, entao sem fila vira "sem espera". */}
              <Text className="font-body text-sm text-vupth-textSecondary">
                {minWait < 1 ? "sem espera" : `menor espera ${formatWaitTime(minWait)}`}
              </Text>
            </>
          )}
        </View>

        {(hojeTexto || reabre) && (
          <TouchableOpacity
            onPress={() => setMostrarSemana((v) => !v)}
            disabled={semana.length === 0}
            accessibilityRole="button"
            accessibilityLabel="Horário de funcionamento"
            testID="horario-hoje"
          >
            <View className="flex-row items-center gap-2 mt-2">
              <Clock size={14} color="#454745" />
              <Text className="font-body text-sm text-vupth-textSecondary">
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
            </View>
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
            <View className="flex-row items-start gap-2 mt-2">
              <MapPin size={14} color="#454745" style={{ marginTop: 3 }} />
              <Text className="font-body text-sm text-vupth-textSecondary flex-1">
                {endereco}
                {mapa ? (
                  <Text className="font-heading text-sm text-vupth-forest">
                    {"  "}Como chegar
                  </Text>
                ) : null}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {mostrarSemana && semana.length > 0 && (
          <View className="mt-2 gap-1" testID="semana">
            {semana.map((linha) => (
              <View className="flex-row justify-between" key={linha.dia}>
                <Text
                  className={`font-body text-sm ${linha.ehHoje ? "text-vupth-textPrimary" : "text-vupth-textSecondary"} ${linha.ehHoje ? "font-semibold" : "font-normal"}`}
                >
                  {linha.nome}
                </Text>
                <Text
                  className={`font-body text-sm ${linha.ehHoje ? "text-vupth-textPrimary" : "text-vupth-textSecondary"} ${linha.ehHoje ? "font-semibold" : "font-normal"}`}
                >
                  {linha.texto}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View className="flex-1 px-4 pt-5">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="font-display text-lg text-vupth-forest">
            Quem está atendendo
          </Text>
          {isOpen && (
            <View className="bg-vupth-greenTint rounded-full px-3 py-1">
              <View className="flex-row items-center gap-1">
                <LiveDot size={5} color="#163300" />
                <Text className="font-heading text-f10 text-vupth-forest">
                  Ao vivo
                </Text>
              </View>
            </View>
          )}
        </View>

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
                className="font-heading text-xs text-vupth-textSecondary mb-2"
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
            />
          )}
          ListEmptyComponent={
            <View className="items-center justify-center mt-4">
              <Text className="font-body text-vupth-textSecondary text-md">Nenhum profissional disponível</Text>
            </View>
          }
        />
      </View>

      <View className="px-4 pb-8">
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
            <View className="bg-vupth-warning rounded-card px-4 py-3">
              <View className="flex-row items-center gap-2">
                <Info size={18} color="#163300" />
                <Text className="font-heading text-xs text-vupth-forest flex-1">
                  Fechada agora — escolha um profissional para agendar ou
                  solicitar um corte.
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      </View>
      <FotoAmpliada uri={fotoAmpliada} onClose={() => setFotoAmpliada(null)} />
    </View>
  );
}

