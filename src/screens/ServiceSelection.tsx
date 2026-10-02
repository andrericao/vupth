import { useState, useEffect } from "react";
import { Alert, TouchableOpacity, ScrollView, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  VStack,
  Box,
  Text,
  HStack,
  Center,
} from "@gluestack-ui/themed";
import { Check, Calendar, Scissors, Repeat2 } from "lucide-react-native";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { Button } from "@components/Button";
import { ScreenHeader } from "@components/ScreenHeader";
import { SkeletonList } from "@components/Skeleton";
import { ScheduleModal } from "@components/ScheduleModal";
import { MoreOptionsModal, MoreOption } from "@components/MoreOptionsModal";
import { formatWaitTime, estimatedStartTime } from "@domain/queue/types";
import { ServiceItemResponse } from "@domain/professional/types";
import { outOfQueueOfferErrorMessage } from "@domain/queue/swap";
import { establishmentService } from "@services/establishmentService";
import { cutRequestService } from "@services/cutRequestService";
import { swapOfferService } from "@services/swapOfferService";
import { useAuthStore } from "@stores/authStore";
import { usePendingSwapStore } from "@stores/pendingSwapStore";
import { usePedidoDeCorteStore } from "@stores/pedidoDeCorteStore";
import { pedidoDaResposta } from "@domain/queue/pedidoDeCorte";
import { regraDaMulta } from "@domain/queue/saidaDaFila";
import { contaComMultas, origemDaMulta, reais } from "@domain/queue/multasPendentes";
import { useMultasPendentes } from "@hooks/useMultasPendentes";
import { acaoPrincipal, opcoesDoMenu, temSegundaPorta, MENSAGEM_SO_AGENDA, OpcaoDoMenu } from "@domain/professional/modo";

// Sombra do card de resumo (verde escuro sobre fundo claro). Este e um dos
// POUCOS lugares com sombra legitima: no Pencil o "Resumo" sobre `forest` e um
// dos 13 elementos que a tem. Nao usa a `floatingShadow` compartilhada porque
// aquela e calibrada p/ superficie clara e some sobre o forest.
const summaryShadow = {
  shadowColor: "#163300",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 16,
  elevation: 4,
};

type RouteParams = {
  professionalId: string;
  professionalName: string;
  establishmentId: string;
  establishmentName: string;
  estimatedWaitMinutes: number;
  establishmentOpen?: boolean;
  // Profissional em "Fora": a entrada na fila nao age; o caminho e o corte.
  profissionalFora?: boolean;
  // Profissional "so agenda" (Backend 8e6c00f): sem fila e sem corte — so agendar.
  soAgenda?: boolean;
  // Seleção restaurada ao voltar do portão de auth (visitante que logou).
  serviceItemIds?: string[];
  // Tamanho da fila do profissional: a posição do cliente é este número + 1.
  queueCount?: number;
};

// Fora do corpo do componente: o relogio so e lido no toque, nunca no render.
const agora = () => Date.now();

export function ServiceSelection() {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation<AppNavigatorRoutesProps>();
  const {
    professionalId,
    professionalName,
    establishmentId,
    establishmentName,
    estimatedWaitMinutes,
    establishmentOpen,
    serviceItemIds,
    queueCount,
    profissionalFora,
    soAgenda = false,
  } = route.params as RouteParams;
  // Ausente = aberta (fluxos legados). false = fila fechada agora.
  const storeOpen = establishmentOpen ?? true;
  const situacao = { soAgenda, fora: !!profissionalFora, lojaAberta: storeOpen };
  const principal = acaoPrincipal(situacao);
  // A estimativa da fila (posicao, horario, multa) so vale quando a acao e entrar nela.
  const vaiPraFila = principal === "fila";

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const addPendingSwap = usePendingSwapStore((s) => s.addPending);
  const guardarPedidoDeCorte = usePedidoDeCorteStore((s) => s.adicionar);

  const [services, setServices] = useState<ServiceItemResponse[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(serviceItemIds ?? []);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [isRequestingCut, setIsRequestingCut] = useState(false);
  const [isPublishingSwap, setIsPublishingSwap] = useState(false);
  // "Agora" ancorado na ABERTURA da tela: Date.now() no render e impuro
  // (react-hooks/purity) e faria a previsao pular a cada re-render. Mesmo
  // padrao do QueueStatus.
  const [openedAt] = useState(() => Date.now());

  useEffect(() => {
    establishmentService
      .getServiceItemsByProfessional(professionalId)
      .then(({ data }) => {
        setServices(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Erro ao carregar serviços");
        setIsLoading(false);
      });
  }, [professionalId]);

  function toggleService(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  const selectedServices = services.filter((s) => selectedIds.includes(s.id));
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  // Multas pendentes entram na conta, separadas do servico (Backend 389a152).
  const { data: pendentes } = useMultasPendentes();
  const multas = pendentes?.penalties ?? [];
  const conta = contaComMultas(totalPrice, multas);
  const [showMultas, setShowMultas] = useState(false);
  const totalMinutes = selectedServices.reduce(
    (sum, s) => sum + (s.weeklyAverageDurationInMinutes ?? 30),
    0,
  );

  // Vai pra fila. Hoje sempre "agora" (sem targetTime): o agendamento #40 foi
  // revertido para "em breve" ate o backend honrar a intencao (HANDOFF §12.1). O
  // parametro targetTime segue aqui para religar o agendamento sem retrabalho.
  // Portao de auth: a verificacao de token acontece AQUI, ja com os servicos
  // escolhidos. Visitante -> login/cadastro levando a selecao (e o targetTime);
  // ao autenticar, o Login/SignUp redireciona pra queueStatus e cria o atendimento.
  function goToQueue(targetTime?: string) {
    const payload = {
      professionalId,
      professionalName,
      establishmentId,
      establishmentName,
      estimatedWaitMinutes,
      serviceItemIds: selectedIds,
      ...(targetTime ? { targetTime } : {}),
    };
    if (!isAuthenticated) {
      navigation.navigate("login", { redirectTo: "queueStatus", ...payload });
      return;
    }
    navigation.navigate("queueStatus", payload);
  }

  function handleConfirm() {
    goToQueue();
  }

  // Portão de auth das ações que NÃO entram na fila (corte, troca): o visitante
  // volta pra ESTA tela com a seleção preservada, em vez de cair na fila.
  function goToLoginAndComeBack() {
    navigation.navigate("login", {
      redirectTo: "serviceSelection",
      professionalId,
      professionalName,
      establishmentId,
      establishmentName,
      estimatedWaitMinutes,
      serviceItemIds: selectedIds,
      establishmentOpen,
    });
  }

  // Troca (C13, fatia 2): quem está FORA da fila publica uma oferta EARLIER —
  // posição implícita = fim. Se alguém da fila aceitar, ele cede a vaga (vai pro
  // fim) e o atendimento do solicitante NASCE naquele lugar. Os serviços vão na
  // publicação porque a fila precisa da duração para recalcular os ETAs.
  async function handleRequestSwap() {
    if (selectedIds.length === 0 || isPublishingSwap) return;
    if (!isAuthenticated || !accessToken) {
      setShowMoreOptions(false);
      goToLoginAndComeBack();
      return;
    }
    setIsPublishingSwap(true);
    try {
      const { data: offer } = await swapOfferService.create(
        { professionalId, serviceItemIds: selectedIds, direction: "EARLIER" },
        accessToken,
      );
      // Guarda o contexto: o atendimento nasce no ACEITE, sem passar pelo app —
      // sem isso não teríamos os nomes para montar a fila local depois.
      await addPendingSwap({
        offerId: offer.id,
        professionalId,
        professionalName,
        establishmentId,
        establishmentName,
        estimatedWaitMinutes,
      });
      setShowMoreOptions(false);
      Alert.alert(
        "Pedido publicado",
        "Quem está na fila pode ceder o lugar para você. Se alguém aceitar, você entra na fila naquela posição — acompanhe em Atendimentos.",
      );
      navigation.navigate("home");
    } catch (error: any) {
      Alert.alert(
        "Não foi possível publicar",
        outOfQueueOfferErrorMessage(
          error.response?.data?.code,
          error.response?.status,
        ),
      );
    } finally {
      setIsPublishingSwap(false);
    }
  }

  // Fila fechada agora: "Solicitar corte" (BUG5 C2) — pedido sob aprovação com
  // validade de 5min. Visitante loga e volta pra cá com a seleção intacta.
  async function handleRequestCut() {
    if (selectedIds.length === 0 || isRequestingCut) return;
    if (!isAuthenticated || !accessToken) {
      setShowMoreOptions(false);
      goToLoginAndComeBack();
      return;
    }
    setIsRequestingCut(true);
    try {
      const { data: pedido } = await cutRequestService.create(
        { professionalId, establishmentId, serviceItemIds: selectedIds },
        accessToken,
      );
      // Guarda o pedido: e o que deixa o app avisar a RESPOSTA (usePedidoDeCorte).
      // Sem isto o cliente nunca sabia se foi aceito (teste de 25/09).
      await guardarPedidoDeCorte(
        pedidoDaResposta(pedido, { professionalId, professionalName, establishmentId, establishmentName }, agora()),
      );
      setShowMoreOptions(false);
      Alert.alert(
        "Pedido enviado! ⏳",
        "O profissional tem 5 minutos para responder. A resposta aparece aqui no app — o pedido fica no Início enquanto isso.",
      );
      navigation.navigate("home");
    } catch (error: any) {
      const code = error.response?.data?.code;
      const msg =
        code === "PROFESSIONAL_AGENDA_ONLY"
          ? MENSAGEM_SO_AGENDA
          : code === "CUT_REQUEST_NOT_ALLOWED"
          ? profissionalFora
            ? // O servidor ainda recusa corte com a loja aberta (pedido de 07/09,
              // reforcado em 24/09). Dizer "entre na fila" aqui mandaria a
              // pessoa para a fila de quem nao esta atendendo.
              `${professionalName || "Este profissional"} está fora agora e ainda não recebe pedidos por aqui. Escolha alguém que está trabalhando, ou agende.`
            : "A loja está aberta agora — dá para entrar na fila normalmente."
          : error.response?.data?.message || "Erro ao enviar o pedido de corte";
      Alert.alert("Erro", msg);
    } finally {
      setIsRequestingCut(false);
    }
  }

  // Menu "Mais opções": tudo que não é a ação primária da tela. Com a loja
  // fechada a primária é agendar, então o corte entra aqui; com a fila aberta o
  // agendar é a segunda porta, na tela (C20). A troca vale nos dois.
  const todasAsOpcoes: Record<OpcaoDoMenu, MoreOption> = {
    schedule: {
      key: "schedule",
      icon: Calendar,
      title: "Agendar",
      description: "Escolha outro dia ou horário com este profissional.",
      onPress: () => {
        setShowMoreOptions(false);
        setShowSchedule(true);
      },
    },
    cut: {
      key: "cut",
      icon: Scissors,
      title: isRequestingCut ? "Enviando pedido..." : "Solicitar corte",
      description: "A loja está fechada — o profissional tem 5 minutos para responder.",
      disabled: isRequestingCut,
      onPress: handleRequestCut,
    },
    swap: {
      key: "swap",
      icon: Repeat2,
      title: isPublishingSwap ? "Publicando..." : "Entrar por troca",
      description: "Alguém que já está na fila pode ceder o lugar para você — sem custo.",
      disabled: isPublishingSwap,
      onPress: handleRequestSwap,
    },
  };
  // Com o profissional Fora, o corte e a acao principal: o menu leva o agendar.
  // "So agenda" nao tem menu — nao ha nada alem de agendar.
  const moreOptions: MoreOption[] = opcoesDoMenu(situacao).map((k) => todasAsOpcoes[k]);

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

  if (error) {
    // O esqueleto tem de comecar na MESMA altura da tela pronta, senao o
    // conteudo PULA quando carrega. `pt={60}` era chute; o cabecalho real usa
    // `safe-area + 12`.
    return (
      <VStack flex={1} px={16} style={{ paddingTop: insets.top + 12 }} pb={30} bg="$brandBackground">
        <Center flex={1}>
          <Text color="$brandDanger" textAlign="center">{error}</Text>
          <Button title="Voltar" mt="$4" onPress={() => navigation.goBack()} />
        </Center>
      </VStack>
    );
  }

  return (
    <VStack flex={1} pb={30} bg="$brandBackground">
      <Box px={16}>
        <ScreenHeader
          title="O QUE VOCÊ QUER?"
          subtitle={`Com ${professionalName} · ${establishmentName}`}
        />
      </Box>

      {services.length === 0 ? (
        <Center flex={1} px={16}>
          <Text color="$brandTextSecondary" textAlign="center">
            Nenhum serviço disponível para este profissional
          </Text>
          <Button title="Voltar" mt="$4" onPress={() => navigation.goBack()} />
        </Center>
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 200 }}
          >
            <VStack gap="$2.5">
              {services.map((service) => {
                const isSelected = selectedIds.includes(service.id);
                return (
                  <TouchableOpacity
                    key={service.id}
                    onPress={() => toggleService(service.id)}
                    testID={`service-${service.id}`}
                  >
                    <HStack
                      bg={isSelected ? "$greenTint" : "$brandSurface"}
                      p="$4"
                      borderRadius={16}
                      borderWidth={isSelected ? 1.5 : 0}
                      borderColor="$forest"
                      gap="$3"
                      alignItems="center"
                    >
                      {/* Caixa de selecao: cheia quando marcado, contorno quando
                          nao — o estado tem de ler sem depender so da cor. */}
                      <Center
                        width={22}
                        height={22}
                        borderRadius={6}
                        bg={isSelected ? "$forest" : "transparent"}
                        borderWidth={isSelected ? 0 : 1.5}
                        borderColor="$brandBorder"
                      >
                        {isSelected && <Check size={14} color="#FFFFFF" />}
                      </Center>
                      <VStack flex={1} gap="$0.5">
                        <Text fontFamily="$heading" fontSize="$sm" color="$forest">
                          {service.customName}
                        </Text>
                        <Text size="xs" color="$brandTextSecondary">
                          {service.weeklyAverageDurationInMinutes ?? 30} min
                        </Text>
                      </VStack>
                      <Text fontFamily="$heading" fontSize="$sm" color="$forest">
                        R$ {service.price.toFixed(2)}
                      </Text>
                    </HStack>
                  </TouchableOpacity>
                );
              })}
            </VStack>

            {/* Resumo (Pencil): o que a escolha significa em tempo e posicao,
                ANTES de confirmar. So aparece com servico marcado — sem selecao
                nao ha duracao nem preco a resumir. */}
            {selectedIds.length > 0 && (
              <VStack
                bg="$forest"
                borderRadius={18}
                gap="$2.5"
                p="$4.5"
                mt="$4"
                style={summaryShadow}
              >
                <HStack justifyContent="space-between" alignItems="center">
                  <Text size="sm" color="#FFFFFFB3">
                    Duração estimada
                  </Text>
                  <Text fontFamily="$heading" fontSize="$sm" color="$brandGreen">
                    {formatWaitTime(totalMinutes)}
                  </Text>
                </HStack>
                {/* Posicao so entra quando a tela sabe o tamanho da fila. Quem
                    chega aqui por outro caminho (volta do login) nao recebe o
                    dado — melhor omitir a linha do que chutar um numero. */}
                {queueCount != null && vaiPraFila && (
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text size="sm" color="#FFFFFFB3">
                      Sua posição
                    </Text>
                    <Text fontFamily="$heading" fontSize="$sm" color="$brandGreen">
                      {queueCount + 1}º da fila
                    </Text>
                  </HStack>
                )}
                {vaiPraFila && (
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text size="sm" color="#FFFFFFB3">
                      Começa por volta de
                    </Text>
                    <Text fontFamily="$heading" fontSize="$sm" color="$brandGreen">
                      {estimatedStartTime(openedAt, estimatedWaitMinutes)}
                    </Text>
                  </HStack>
                )}
                {/* DEC-1 (Andre, 01/10): a multa nao aparece na escolha — so no
                    total, numa linha somada ao valor, com o link para a explicacao
                    (cada multa: motivo, quem, quando). */}
                {multas.length > 0 && (
                  <HStack justifyContent="space-between" alignItems="center" testID="multas-pendentes">
                    <TouchableOpacity onPress={() => setShowMultas(true)} testID="ver-multas">
                      <Text size="sm" color="#FFFFFFB3" textDecorationLine="underline">
                        Multa pendente · entenda
                      </Text>
                    </TouchableOpacity>
                    <Text fontFamily="$heading" fontSize="$sm" color="$brandGreen">+ {reais(conta.totalMultas)}</Text>
                  </HStack>
                )}
                {/* A regra da multa ANTES do toque que coloca na fila (CDC).
                    Ate 25/09 o app so falava de multa na hora de sair. */}
                {vaiPraFila && (
                  <Text size="xs" color="#FFFFFFB3" testID="regra-da-multa">
                    {regraDaMulta()}
                  </Text>
                )}
              </VStack>
            )}
          </ScrollView>

          {selectedIds.length > 0 && (
            <VStack position="absolute" bottom={30} left={20} right={20} gap="$2">
              {/* Uma ação primária só (Andre 2026-08-01): loja aberta = entrar na
                  fila; fechada = agendar (badge AGENDAR). Com a fila aberta o
                  agendar vem logo abaixo, como segunda porta (C20). O resto —
                  solicitar corte, entrar por troca — vive no menu "Mais opções". */}
              {principal === "corte" ? (
                // Fora do expediente a fila esta fechada: nao ha "Entrar na fila"
                // a oferecer. O pedido de corte deixa o profissional decidir
                // (Andre, 07/09 e 24/09).
                <Button
                  title={isRequestingCut ? "Enviando pedido..." : `Solicitar corte · R$ ${conta.total.toFixed(2)}`}
                  testID="primary-cut"
                  isDisabled={isRequestingCut}
                  onPress={handleRequestCut}
                />
              ) : principal === "fila" ? (
                <Button
                  title={`Entrar na fila · R$ ${conta.total.toFixed(2)}`}
                  testID="primary-queue"
                  onPress={handleConfirm}
                />
              ) : (
                <Button
                  title={`Agendar · R$ ${conta.total.toFixed(2)}`}
                  testID="primary-schedule"
                  onPress={() => setShowSchedule(true)}
                />
              )}
              {/* Fim de fila hibrido (C20): com a fila aberta, a outra porta —
                  agendar um horario que a fila ainda nao alcancou. */}
              {temSegundaPorta(situacao) && (
                <Button
                  title="Agendar um horário"
                  variant="outline"
                  testID="second-door-schedule"
                  onPress={() => setShowSchedule(true)}
                />
              )}
              {soAgenda && (
                <Text size="xs" color="$brandTextSecondary" textAlign="center" testID="so-agenda">
                  {MENSAGEM_SO_AGENDA}
                </Text>
              )}
              {moreOptions.length > 0 && (
                <Button
                  title="Mais opções"
                  variant="outline"
                  testID="more-options"
                  onPress={() => setShowMoreOptions(true)}
                />
              )}
            </VStack>
          )}
        </>
      )}

      <MoreOptionsModal
        visible={showMoreOptions}
        subtitle={`${professionalName} · ${selectedIds.length} ${
          selectedIds.length === 1 ? "serviço selecionado" : "serviços selecionados"
        }`}
        options={moreOptions}
        onClose={() => setShowMoreOptions(false)}
      />

      {/* A explicacao das multas que entram no total (DEC-1). */}
      <Modal visible={showMultas} transparent animationType="fade" onRequestClose={() => setShowMultas(false)}>
        <Box flex={1} bg="rgba(0,0,0,0.45)" justifyContent="center" px={24}>
          <VStack bg="$white" borderRadius="$card" p="$6" gap="$3" testID="explicacao-multas">
            <Text fontFamily="$heading" fontSize="$lg" color="$forest">Multa pendente</Text>
            <Text size="sm" color="$brandTextSecondary">
              Entra no valor do seu próximo atendimento, separada do serviço.
            </Text>
            {multas.map((m) => (
              <HStack key={m.penaltyId} justifyContent="space-between" alignItems="flex-start" gap="$2">
                <Text size="sm" color="$brandTextPrimary" flex={1}>{origemDaMulta(m)}</Text>
                <Text fontFamily="$heading" fontSize="$sm" color="$forest">{reais(Number(m.amount) || 0)}</Text>
              </HStack>
            ))}
            <Button title="Entendi" mt="$2" onPress={() => setShowMultas(false)} />
          </VStack>
        </Box>
      </Modal>
      <ScheduleModal
        visible={showSchedule}
        onClose={() => setShowSchedule(false)}
        professionalId={professionalId}
        establishmentId={establishmentId}
        serviceItemIds={selectedIds}
        minutosDoServico={totalMinutes}
        onPrecisaLogin={goToLoginAndComeBack}
        onAgendado={() => navigation.navigate("home")}
      />
    </VStack>
  );
}
