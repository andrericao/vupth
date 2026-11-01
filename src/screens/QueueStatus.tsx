import { useEffect, useRef, useState } from "react";
import { Alert, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { VStack, Box, Text, Heading, Center, HStack } from "@gluestack-ui/themed";
import { Info, Repeat2, Check, ChevronRight, ChevronsDown, LogOut } from "lucide-react-native";
import * as SecureStore from "expo-secure-store";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { ScreenHeader, HeaderIconButton } from "@components/ScreenHeader";
import { Button } from "@components/Button";
import { PlaceAvatar } from "@components/PlaceAvatar";
import {
  QueueDisclaimerModal,
} from "@components/QueueDisclaimerModal";
import { RatingModal } from "@components/RatingModal";
import { RescheduleModal } from "@components/RescheduleModal";
import { MoreOptionsModal } from "@components/MoreOptionsModal";
import { avisarLimiteDeMultas } from "@utils/limiteDeMultas";
import { SuaVezChegou } from "@components/SuaVezChegou";
import { CarrosselDeCampanhas } from "@components/CarrosselDeCampanhas";
import { useCampanhasAtivas } from "@hooks/useCampanhasAtivas";
import { useTema } from "@hooks/useTema";
import { saidaDaFila, ehToqueDuplo, avisoDaMultaDoServidor, AVISO_DO_SEGUNDO_TOQUE } from "@domain/queue/saidaDaFila";
import { FaixaDaTolerancia } from "@components/FaixaDaTolerancia";
import { pedidoDaResposta, avisoDoPedidoEnviado } from "@domain/queue/pedidoDeCorte";
import { usePedidoDeCorteStore } from "@stores/pedidoDeCorteStore";
import { recusaAoEntrar, atendimentoNaFilaDoProfissional, avisoDeFilaExistente } from "@domain/queue/entrarNaFila";
import { filaDoAtendimento } from "@domain/queue/reconciliar";
import { avisoDepoisDoIntervalo, avisoDoReagendamento } from "@domain/queue/horarioPedido";
import { AtualizarNoNavegador } from "@components/AtualizarNoNavegador";
import { ehNavegador } from "@utils/ehNavegador";
import { formatarReais } from "@utils/formatarReais";
import { podeOferecerPush, TELA_DO_PUSH_VISIVEL } from "@hooks/ofertaDePush";
import { useCronometroDaVez } from "@hooks/useCronometroDaVez";
import { useFirstRunStore } from "@stores/firstRunStore";
import { ChangeTurnModal } from "@components/ChangeTurnModal";
import { SwapOffersModal } from "@components/SwapOffersModal";
import { useSwapOffers } from "@hooks/useSwapOffers";
import {
  canCancelAttendance,
  formatWaitTime,
  formatElapsed,
  shouldCreateAttendance,
  estimatedStartTime,
  canReshuffleQueue,
  incursLatePenalty,
  rescheduleErrorMessage,
  moveToEndErrorMessage,
  CANCELLATION_PENALTY_VALUE,
  STATUS_DESCONHECIDO,
  filaEncerrada,
} from "@domain/queue/types";
import { jaSaiuDaFila, mensagemDeFalhaAoSair, multaSemCiencia } from "@domain/queue/leave";
import { useAuthStore } from "@stores/authStore";
import { useQueueStore } from "@stores/queueStore";
import { useRatedStore } from "@stores/ratedStore";
import { attendanceService } from "@services/attendanceService";
import { cutRequestService } from "@services/cutRequestService";
import { swapOfferService, SwapOfferDirection } from "@services/swapOfferService";
import { queueService } from "@services/queueService";
import { waitForBackend } from "@services/healthService";
import { useQueueCountdown } from "@hooks/useQueueCountdown";
import { useMostraPosicao } from "@hooks/useMostraPosicao";
import { NumeroComSalto } from "@components/NumeroComSalto";
import { alertaTipado } from "@utils/alertaTipado";
import { posicaoVisivel } from "@domain/queue/posicao";
import { fs } from "@stores/fonteStore";
import { pendenciasDoErro, podeAvisarQuePagou, reais } from "@domain/pagamento/pendencia";
import { usePendenciaStore } from "@stores/pendenciaStore";
import { paymentService } from "@services/paymentService";
import { mensagemDoErro } from "@domain/erros/mensagemDoErro";
import { mensagemDoCupom } from "@domain/campanhas";

type RouteParams = {
  professionalId: string;
  establishmentId: string;
  professionalName?: string;
  establishmentName?: string;
  estimatedWaitMinutes?: number;
  serviceItemIds?: string[];
  targetTime?: string;
  // Cupom escolhido na selecao (cupom-em-configuracoes).
  couponCampaignId?: string;
  // Veio do "Adiar minha vez" do aviso de atraso: abre o "Mudar minha vez".
  abrirMudarVez?: boolean;
};

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Aguardando",
  LATE: "Atrasado",
  IN_PROGRESS: "Em atendimento",
  PAUSED: "Pausado",
  FINISHED: "Concluído",
  CANCELLED: "Cancelado",
  REMOVED: "Retirado pela loja",
};

export function QueueStatus() {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation<AppNavigatorRoutesProps>();
  const oferecerPush = useFirstRunStore((s) => s.oferecerPush);
  const markPushAsked = useFirstRunStore((s) => s.markPushAsked);

  // ligar-push-permission (Andre, 05/10): a primeira vez na fila e quando o
  // aviso faz sentido — a tela 10 explica antes da caixa do sistema.
  useEffect(() => {
    let vivo = true;
    podeOferecerPush().then((pode) => {
      if (!pode || !vivo) return;
      // Tela 10 oculta (DEC-149): marca como perguntado e a caixa do sistema vem direto.
      if (TELA_DO_PUSH_VISIVEL) oferecerPush();
      else markPushAsked();
    });
    return () => {
      vivo = false;
    };
  }, [oferecerPush, markPushAsked]);

  const {
    professionalId,
    professionalName: paramProfName,
    establishmentId,
    establishmentName: paramEstName,
    serviceItemIds,
    estimatedWaitMinutes,
    targetTime,
    couponCampaignId,
    abrirMudarVez,
  } = route.params as RouteParams;

  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const ratedIds = useRatedStore((s) => s.ids);
  const leaveQueue = useQueueStore((s) => s.leaveQueue);
  const updateQueue = useQueueStore((s) => s.updateQueue);
  const { remaining, semPrevisao, elapsedSeconds, color, isInQueue, isBeingAttended, isPaused, isFinished, activeQueue, refresh } = useQueueCountdown();
  // O cronômetro da tela Aguardando conta os segundos (DEC-149); `null` enquanto o servidor não deu a previsão.
  const segundosAteAVez = useCronometroDaVez(activeQueue, isInQueue);
  const mostraPosicao = useMostraPosicao(activeQueue?.establishmentId, activeQueue?.professionalId);

  const [isCreating, setIsCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState("Entrando na fila...");
  const [createError, setCreateError] = useState<string | null>(null);
  // Loja fechada p/ novos (409 ESTABLISHMENT_NOT_OPEN) → oferece "solicitar corte".
  const [canRequestCut, setCanRequestCut] = useState(false);
  const [isRequestingCut, setIsRequestingCut] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isRemanejando, setIsRemanejando] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [tailEtaMs, setTailEtaMs] = useState<number | null>(null);
  const [rescheduleBaseMs, setRescheduleBaseMs] = useState(0);
  const [showChangeTurn, setShowChangeTurn] = useState(false);
  // fila-aguardando-do-mockup (CLI-32): o menu Opções da tela Aguardando.
  const [showOpcoes, setShowOpcoes] = useState(false);
  const campanhasAtivas = useCampanhasAtivas();
  const { cores } = useTema();
  const [isLastInQueue, setIsLastInQueue] = useState(false);
  const [isPublishingSwap, setIsPublishingSwap] = useState(false);
  const [showSwapOffers, setShowSwapOffers] = useState(false);
  const didCreate = useRef(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }
  const mountedRef = useRef(true);

  const DISCLAIMER_KEY = "vupth_hide_queue_disclaimer";

  // Mostra o aviso de "tempo é estimativa" ao entrar na fila, salvo se o cliente
  // marcou "não mostrar novamente".
  useEffect(() => {
    let active = true;
    (async () => {
      const hidden = await SecureStore.getItemAsync(DISCLAIMER_KEY);
      if (active && hidden !== "1") setShowDisclaimer(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleCloseDisclaimer(dontShowAgain: boolean) {
    setShowDisclaimer(false);
    if (dontShowAgain) await SecureStore.setItemAsync(DISCLAIMER_KEY, "1");
  }

  // mountedRef só vira false no UNMOUNT real — não em re-execuções benignas do
  // effect de criação. Sem isso, um re-render durante o create deixava o spinner
  // preso (a flag de cancelamento era flipada e o finally não limpava isCreating).
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Tentou entrar (veio com servicos escolhidos) numa fila, mas o aparelho JA
  // tem uma fila viva: a tela mostra a existente — e agora diz por que. Roda
  // uma vez, com o estado da ABERTURA da tela: depois dela, a fila que aparece
  // pode ser a que esta propria tela acabou de criar.
  const avisouFilaExistente = useRef(false);
  useEffect(() => {
    if (avisouFilaExistente.current) return;
    avisouFilaExistente.current = true;
    const atual = useQueueStore.getState().activeQueue;
    if (!serviceItemIds?.length || !atual?.attendanceId || filaEncerrada(atual.status)) return;
    const aviso = avisoDeFilaExistente(atual, professionalId);
    alertaTipado(aviso.titulo, aviso.mensagem, [{ text: "Ver minha fila" }], { tipo: "atencao" });
    // So na abertura, de proposito — ver o comentario acima.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      !shouldCreateAttendance({
        alreadyCreated: didCreate.current,
        hasAttendanceId: !!activeQueue?.attendanceId,
        hasToken: !!accessToken,
        serviceItemIds,
        localStatus: activeQueue?.status,
      })
    ) {
      return;
    }
    didCreate.current = true;

    useQueueStore.getState().joinQueue({
      professionalId,
      professionalName: paramProfName ?? "",
      establishmentId,
      establishmentName: paramEstName ?? "",
      enteredAt: Date.now(),
      estimatedMinutes: estimatedWaitMinutes ?? 0,
      status: "SCHEDULED",
    });

    async function createAttendance() {
      setIsCreating(true);
      try {
        // Cold start do Render: acorda a instancia antes de criar, evitando spinner
        // "infinito" enquanto o backend (hibernado) demora ~50s a responder.
        setCreateMsg(targetTime ? "Agendando..." : "Entrando na fila...");
        const ready = await waitForBackend({ isCancelled: () => !mountedRef.current });
        if (!mountedRef.current) return;
        if (!ready) {
          await leaveQueue();
          if (mountedRef.current) {
            setCreateError("Não conseguimos conectar agora. Tente novamente em instantes.");
          }
          return;
        }

        const { data } = await attendanceService.create(
          {
            professionalId,
            establishmentId,
            serviceItemIds: serviceItemIds ?? [],
            ...(targetTime ? { targetTime } : { scheduledTime: new Date().toISOString() }),
            ...(couponCampaignId ? { coupon_campaign_id: couponCampaignId } : {}),
          },
          accessToken!,
        );
        if (mountedRef.current) {
          await updateQueue({ attendanceId: data.id });
          const aviso = avisoDepoisDoIntervalo(data);
          if (aviso) alertaTipado(aviso.titulo, aviso.mensagem, undefined, { tipo: "informacao" });
        }
      } catch (error: any) {
        // Limpa a fila otimista para não deixar tarja/banner residual sem atendimento real.
        await leaveQueue();
        if (mountedRef.current) {
          const status = error.response?.status;
          const code = error.response?.data?.code;
          const recusa = recusaAoEntrar(error);

          // Pagamento pendente (409 PAYMENT_PENDING, CLI-30): o aviso com o
          // "Pagar" e um MODAL; a pessoa volta para onde estava.
          const pendencias = pendenciasDoErro(error);
          if (pendencias) {
            usePendenciaStore.getState().avisar(pendencias);
            navigation.goBack();
            return;
          }
          // multa-bloqueia-entrada (DEC-83): com duas multas pendentes, o aviso com o "Pagar multa".
          if (avisarLimiteDeMultas(error)) {
            navigation.goBack();
            return;
          }

          // Cupom que nao vale mais (422 COUPON_NOT_ACTIVE): nada foi criado; o
          // aviso diz o que fazer e a pessoa volta a escolha, sem o cupom.
          if (code === "COUPON_NOT_ACTIVE") {
            Alert.alert("Cupom", mensagemDoCupom(error));
            navigation.goBack();
            return;
          }

          // Loja fechada p/ novos (gate C1): oferece "solicitar corte" (BUG5 C2).
          // Este fica em TELA: tem uma ação propria para oferecer.
          if (recusa.tipo === "loja-fechada") {
            setCanRequestCut(true);
            setCreateError(recusa.mensagem);
            return;
          }

          // Ja esta na fila daquele profissional (409 CLIENT_ALREADY_IN_QUEUE):
          // o Andre viu isso como tela cheia com a mensagem crua do servidor
          // (18/09). E um AVISO sobre o toque que ele acabou de dar, entao e
          // dialogo — e ele sai dele para a fila que ja tem.
          //
          // O 409 nao traz o id do atendimento existente (decisao do backend:
          // "a mensagem ao usuario nao carrega id"), entao o achamos pelo
          // profissional no historico.
          if (recusa.tipo === "ja-na-fila") {
            Alert.alert("Você já está na fila", recusa.mensagem, [
              { text: "Voltar", style: "cancel", onPress: () => navigation.goBack() },
              {
                text: "Ver minha fila",
                onPress: async () => {
                  try {
                    const { data } = await attendanceService.listClientHistory(accessToken!);
                    const existente = atendimentoNaFilaDoProfissional(data ?? [], professionalId);
                    if (existente) {
                      await useQueueStore
                        .getState()
                        .joinQueue(filaDoAtendimento(existente, paramEstName));
                      if (mountedRef.current) setCreateError(null);
                      return;
                    }
                  } catch {
                    // Sem rede: melhor voltar do que ficar numa tela morta.
                  }
                  navigation.goBack();
                },
              },
            ]);
            return;
          }

          // Profissional sem aceitar novos: aviso, e o caminho continua sendo o
          // pedido de corte, na tela anterior.
          if (recusa.tipo === "nao-aceita") {
            Alert.alert("Fila fechada", recusa.mensagem, [
              { text: "Entendi", onPress: () => navigation.goBack() },
            ]);
            return;
          }
          // Agendamento (#40): 422 alvo inviável / 400 passado -> mensagem amigável
          // sugerindo outro horário; senão, mensagem genérica de entrada na fila.
          const msg = targetTime
            ? rescheduleErrorMessage(status, code)
            : mensagemDoErro(error, "Erro ao entrar na fila");
          setCreateError(msg);
        }
      } finally {
        if (mountedRef.current) setIsCreating(false);
      }
    }

    createAttendance();
  }, [activeQueue?.attendanceId, activeQueue?.status, accessToken, professionalId, establishmentId, updateQueue, leaveQueue, navigation, paramProfName, paramEstName, serviceItemIds, estimatedWaitMinutes, targetTime, couponCampaignId]);

  const attendanceId = activeQueue?.attendanceId ?? null;
  const status = activeQueue?.status ?? "SCHEDULED";
  const canCancel = canCancelAttendance(status);
  // Item 16 — remanejar a vez (trocar horário / ir pro fim) é sempre livre e sem
  // multa enquanto aguardando. Só SAIR da fila com espera curta gera multa.
  const canReshuffle = canReshuffleQueue(status);

  // Troca aberta (C13): ofertas que EU posso aceitar → dot + modal. Só enquanto
  // aguardando na fila.
  const { data: acceptableOffers = [] } = useSwapOffers(professionalId, canReshuffle);
  const acceptableCount = acceptableOffers.length;

  const borderColor = isInQueue ? color : "#163300";
  const timeColor = isInQueue ? color : "#163300";
  // Finalizado: "Finalizado". Em atendimento: tempo decorrido rolando (m:ss).
  // Na fila: countdown ("Aguardando" quando zera).
  const timeLabel = isFinished
    ? "Finalizado"
    : isPaused
      ? "Pausado"
      : isBeingAttended
        ? formatElapsed(elapsedSeconds)
        : semPrevisao
          // Entrou por aceite de corte (ou a fila foi reconciliada) e o servidor
          // ainda nao respondeu: "ainda nao sei" NAO e "agora".
          ? "Calculando..."
          : remaining! <= 0 && isInQueue
            ? "Aguardando"
            : formatWaitTime(remaining!).replace('~', '');
  // Previsão fixa = entrada na fila + estimativa (atualiza quando o poll re-sincroniza).
  // Evita Date.now() no render (react-hooks/purity).
  const startTimeLabel =
    activeQueue && activeQueue.estimatedMinutes != null
      ? estimatedStartTime(activeQueue.enteredAt, activeQueue.estimatedMinutes)
      : "";
  // Término estimado do atendimento em curso = início + duração estimada.
  const endTimeLabel =
    isBeingAttended && activeQueue?.startedAt && activeQueue?.serviceMinutes != null
      ? estimatedStartTime(activeQueue.startedAt, activeQueue.serviceMinutes)
      : null;

  // Multa é pelo TEMPO estimado (não pelo status): vagar um lugar com < 1h para
  // ser atendido prejudica quem se segue. Vale para sair, reagendar e ir pro fim.
  // A TROCA por consentimento mútuo (#42) é que nunca terá multa.
  // Sem previsao nao da para AFIRMAR que falta menos de 1h — nem o contrario.
  // O aviso de saida diz isso com todas as letras (ver `avisoDeSaida`).
  const penalty = remaining != null && incursLatePenalty(remaining);
  // A faixa da saida (D15): so depois do primeiro toque em "Sair da fila", e
  // some sozinha. O texto e sempre o da regra de AGORA — nao o do momento do toque.
  const ultimoToqueEmSair = useRef<number | null>(null);
  // Quanto sair custa AGORA. Com o valor do servidor (D4: R$ 3 / R$ 5, zero na
  // tolerancia), ele manda — inclusive para dizer que nao ha multa. Sem ele, a
  // regra que o servidor aplica hoje: R$ 3 com menos de 1h.
  function regraDaSaida(naTolerancia = false) {
    // Os minutos que faltam: a frase de retencao sem multa (sair-da-fila-texto).
    const minutos = semPrevisao ? null : remaining;
    const doServidor = activeQueue?.exitPenaltyValue;
    // saida-sem-multa-no-primeiro (DEC-104): isento, a saida nao fala de multa.
    if (activeQueue?.penaltyExempt) {
      return { multa: false, isento: true, semPrevisao: false, minutos };
    }
    if (typeof doServidor === "number") {
      return { multa: doServidor > 0, valor: doServidor, semPrevisao: false, minutos };
    }
    return { multa: penalty && !naTolerancia, semPrevisao: semPrevisao && !naTolerancia, minutos };
  }

  // Tira da fila. `valorConfirmado` e a ciencia da multa (null = sem multa).
  const sair = async (valorConfirmado: number | null) => {
    // A ORDEM AQUI IMPORTA, e os dois motivos vieram do teste de device
    // de 2026-09-07 ("sai da fila e o app fecha sozinho").
    //
    // 1. O `catch {}` era VAZIO. Se o cancelamento falhasse, o cliente
    //    saia da tela sem ter saido da fila: a vez e a multa seguiam de
    //    pe e ninguem ficava sabendo — nem ele, nem quem fosse
    //    investigar depois. Engolir o erro nao e "nao atrapalhar o
    //    usuario"; e mentir pra ele sobre o que aconteceu.
    //
    // 2. Limpar o store ANTES de navegar re-renderiza esta tela com
    //    `activeQueue` nulo. Navegar primeiro tira a tela do caminho.
    try {
      if (attendanceId && accessToken) {
        await attendanceService.cancel(attendanceId, accessToken, valorConfirmado ?? undefined);
      }
    } catch (error) {
      // Ciencia da multa: o servidor so tira da fila com o "Sim" ao valor que
      // ELE cobra. Sem o valor (ou com um menor), 409 — e o cliente continua
      // na fila. Mostra o aviso com o valor dele e repete no "Sim".
      const valorDoServidor = multaSemCiencia(error);
      if (valorDoServidor != null) {
        const aviso = avisoDaMultaDoServidor(valorDoServidor);
        alertaTipado(aviso.titulo, aviso.mensagem, [
          { text: aviso.nao, style: "cancel" },
          { text: aviso.sim, style: "destructive", onPress: () => sair(valorDoServidor) },
        ], { tipo: "dinheiro", selo: "Multa" });
        return;
      }
      // Ja nao esta na fila (o profissional removeu, ou um toque duplo
      // cancelou antes): o objetivo do usuario esta cumprido. Segue pra
      // limpeza, senao ele fica preso numa tela de fila que nao existe.
      if (!jaSaiuDaFila(error)) {
        Alert.alert("Não deu para sair", mensagemDeFalhaAoSair(error));
        return;
      }
    }
    navigation.navigate("home", undefined, { pop: true });
    await leaveQueue();
  };

  // pagamento-no-concluido (CLI-34, DEC-78): o corte concluiu e o pagamento
  // segue pendente — o modal do Pix (QR e "Copiar código Pix") abre uma vez.
  const pagamentoAberto = useRef<string | null>(null);
  useEffect(() => {
    if (!isFinished || !attendanceId || !accessToken || pagamentoAberto.current === attendanceId) return;
    pagamentoAberto.current = attendanceId;
    // pagar-ao-finalizar-corte (André, 24/10): o modal abre SOZINHO quando o corte e finalizado (antes so
    // aparecia depois de sair da tela). O Pix pode estar no `gateway` (Asaas), nao so no topo; e o pagamento
    // pode nascer um instante depois do FINISHED, entao tenta de novo uma vez.
    let vivo = true;
    let nova: ReturnType<typeof setTimeout> | undefined;
    const abrir = (tentativa: number) =>
      paymentService
        .get(attendanceId, accessToken)
        .then(({ data }) => {
          if (!vivo) return;
          // pagar-sempre-disponivel (André, 25/10): a opcao de pagar nunca some; pendente = o modal abre, com Pix
          // do gateway, chave do profissional ou o texto de pagamento combinado (dinheiro), e sempre o Ja paguei.
          if (podeAvisarQuePagou(data.status)) {
            usePendenciaStore.getState().pagar(attendanceId);
          } else if (tentativa === 0 && data.status !== "PAID") {
            nova = setTimeout(() => void abrir(1), 4000);
          }
        })
        .catch(() => {
          if (vivo && tentativa === 0) nova = setTimeout(() => void abrir(1), 4000);
        });
    void abrir(0);
    return () => {
      vivo = false;
      if (nova) clearTimeout(nova);
    };
  }, [isFinished, attendanceId, accessToken]);

  // D15 (Andre, 24/09): "Sair da fila" pede DOIS toques seguidos. O primeiro so
  // mostra a faixa — o que acontece se sair, e a instrucao. Com multa (ou sem
  // saber), os dois toques abrem "Sim / Nao"; sem multa, tiram direto.
  function handleCancel() {
    // Dentro da tolerancia informada pelo servidor, sair nao tem multa (D13).
    const naTolerancia = !!activeQueue?.toleranceUntil && Date.now() < activeQueue.toleranceUntil;
    const saida = saidaDaFila(regraDaSaida(naTolerancia));
    const agora = Date.now();
    if (!ehToqueDuplo(ultimoToqueEmSair.current, agora)) {
      ultimoToqueEmSair.current = agora;
      return;
    }
    ultimoToqueEmSair.current = null;

    if (!saida.confirmacao) {
      sair(null);
      return;
    }
    // Dinheiro, e a acao GERA a multa: o primario e o vermelho (`destructive`).
    alertaTipado(saida.confirmacao.titulo, saida.confirmacao.mensagem, [
      { text: saida.confirmacao.nao, style: "cancel" },
      { text: saida.confirmacao.sim, style: "destructive", onPress: () => sair(saida.valorConfirmado) },
    ], activeQueue?.penaltyExempt ? { tipo: "atencao" } : { tipo: "dinheiro", selo: "Multa" });
  }

  // "Mudar minha vez": busca o ETA do fim da fila (piso de agendamento) e abre o
  // menu de direção (adiantar/atrasar). Sem bloquear se a fila não responder.
  // "Adiar minha vez" no aviso de atraso: chega aqui com o pedido de abrir o
  // "Mudar minha vez" — uma vez, quando a fila ja esta no aparelho.
  const abriuMudarVez = useRef(false);
  useEffect(() => {
    if (!abrirMudarVez || abriuMudarVez.current || !activeQueue?.attendanceId) return;
    abriuMudarVez.current = true;
    handleOpenChangeTurn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abrirMudarVez, activeQueue?.attendanceId]);

  async function handleOpenChangeTurn() {
    let tail: number | null = null;
    let last = false;
    if (activeQueue && accessToken) {
      try {
        const { data } = await queueService.getQueue(
          activeQueue.professionalId,
          activeQueue.establishmentId,
          accessToken,
        );
        tail = Date.now() + data.totalRemainingMinutes * 60000;
        // Já é o último da espera? (para bloquear "ir para o fim").
        const waiting = (data.attendancesInQueue ?? []).filter((a) => a.status === "SCHEDULED");
        last = waiting.length > 0 && waiting[waiting.length - 1].id === attendanceId;
      } catch {
        tail = null;
      }
    }
    setTailEtaMs(tail);
    setIsLastInQueue(last);
    // Base estável do formulário de reagendamento (evita Date.now() no render do modal).
    setRescheduleBaseMs(tail ?? Date.now());
    setShowChangeTurn(true);
  }

  // Item 16 — reagenda para o horário escolhido (vira intenção de fila).
  async function submitReschedule(targetIso: string) {
    if (!attendanceId || !accessToken) return;
    setIsRemanejando(true);
    try {
      const { data } = await attendanceService.reschedule(attendanceId, targetIso, accessToken);
      // Re-ancora pela previsão real devolvida (scheduledTime), lembrando que oscila.
      const targetMs = Date.parse(data.scheduledTime ?? targetIso);
      await updateQueue({
        enteredAt: Date.now(),
        estimatedMinutes: Math.max(0, Math.round((targetMs - Date.now()) / 60000)),
      });
      setShowReschedule(false);
      const aviso = avisoDoReagendamento(data);
      Alert.alert(aviso.titulo, aviso.mensagem);
      refresh();
    } catch (error: any) {
      Alert.alert(
        "Não foi possível reagendar",
        rescheduleErrorMessage(error.response?.status, error.response?.data?.code),
      );
    } finally {
      if (mountedRef.current) setIsRemanejando(false);
    }
  }

  // Item 16 — descer a vez para o fim da fila (sem sair, sem perder o atendimento).
  async function submitMoveToEnd() {
    if (!attendanceId || !accessToken) return;
    setIsRemanejando(true);
    try {
      await attendanceService.moveToEnd(attendanceId, accessToken);
      // Ação explícita que AUMENTA a espera: re-ancora direto pelo servidor, pois
      // o guard monotônico do poll ignoraria um estimado maior.
      if (user?.id) {
        try {
          const { data } = await queueService.getWaitTime(attendanceId, user.id, accessToken);
          await useQueueStore.getState().reanchorQueue(data.estimatedWaitingTime);
        } catch {}
      }
      Alert.alert("Pronto", "Você foi para o fim da fila.");
      refresh();
    } catch (error: any) {
      Alert.alert(
        "Não foi possível",
        moveToEndErrorMessage(error.response?.status),
      );
    } finally {
      if (mountedRef.current) setIsRemanejando(false);
    }
  }

  // Troca aberta (C13): publica a oferta (Adiantar=EARLIER / Atrasar=LATER).
  // Se alguém à frente/atrás aceitar, o backend troca as posições e avisa por WS.
  async function handleCreateSwapOffer(direction: SwapOfferDirection) {
    if (!attendanceId || !accessToken || isPublishingSwap) return;
    setIsPublishingSwap(true);
    try {
      await swapOfferService.create({ attendanceId, direction }, accessToken);
      setShowChangeTurn(false);
      Alert.alert(
        "Pedido publicado",
        direction === "EARLIER"
          ? "Se alguém à sua frente aceitar, vocês trocam de lugar. Você será avisado aqui."
          : "Se alguém atrás de você aceitar, vocês trocam de lugar. Você será avisado aqui.",
      );
    } catch (error: any) {
      const code = error.response?.data?.code;
      Alert.alert(
        "Não foi possível publicar",
        code === "QUEUE_SWAP_OFFER_NOT_ALLOWED"
          ? "A troca só vale enquanto você está aguardando na fila."
          : mensagemDoErro(error, "Tente novamente em instantes."),
      );
    } finally {
      if (mountedRef.current) setIsPublishingSwap(false);
    }
  }

  function handleMoveToEnd() {
    // Ir pro fim com < 1h também vaga um lugar perto do início → avisa multa.
    const base = "Sua vez passa para depois de quem está esperando. Você continua na fila, sem perder o atendimento.";
    const message = penalty
      ? `${base}\n\nComo falta menos de 1h, isso gera multa de ${formatarReais(CANCELLATION_PENALTY_VALUE)} no seu próximo atendimento.`
      : base;
    // Com multa e dinheiro e a acao GERA a multa (`destructive`); sem multa e um
    // aviso comum, como sempre foi.
    if (penalty) {
      alertaTipado("Ir para o fim da fila", message, [
        { text: "Cancelar", style: "cancel" },
        { text: "Ir para o fim", style: "destructive", onPress: submitMoveToEnd },
      ], { tipo: "dinheiro", selo: "Multa" });
      return;
    }
    Alert.alert(
      "Ir para o fim da fila",
      message,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Ir para o fim", onPress: submitMoveToEnd },
      ],
    );
  }

  if (isCreating) {
    return (
      <Center flex={1} bg="$brandBackground" px={16}>
        <ActivityIndicator size="large" color="#163300" />
        <Text mt="$2" color="$brandTextSecondary">{createMsg}</Text>
      </Center>
    );
  }

  if (createError) {
    return (
      <VStack flex={1} px={16} pb={30} bg="$brandBackground">
        <ScreenHeader title="NÃO DEU CERTO" onBack={() => navigation.goBack()} />
        <Center flex={1}>
          <Text
            // [contraste] Era `$gray500` (#DDDEDF, 1,35:1 no branco) — a mensagem
            // sumia justo no caso NAO-erro. O neutro da marca e brandTextSecondary.
            color={canRequestCut ? "$brandTextSecondary" : "$brandDanger"}
            fontSize="$lg"
            fontFamily="$heading"
            textAlign="center"
          >
            {createError}
          </Text>
          {canRequestCut && (
            <Button
              title="Pedir corte"
              mt="$4"
              isLoading={isRequestingCut}
              onPress={async () => {
                if (!accessToken || isRequestingCut) return;
                setIsRequestingCut(true);
                try {
                  const { data: pedido } = await cutRequestService.create(
                    { professionalId, establishmentId, serviceItemIds: serviceItemIds ?? [] },
                    accessToken,
                  );
                  // Guarda o pedido para o app avisar a resposta (usePedidoDeCorte).
                  const guardado = pedidoDaResposta(
                    pedido,
                    {
                      professionalId,
                      professionalName: paramProfName ?? "",
                      establishmentId,
                      establishmentName: paramEstName ?? "",
                    },
                    Date.now(),
                  );
                  await usePedidoDeCorteStore.getState().adicionar(guardado);
                  const enviado = avisoDoPedidoEnviado(guardado);
                  Alert.alert(enviado.titulo, enviado.mensagem, [{ text: "Ok" }]);
                  navigation.goBack();
                } catch (error: any) {
                  const code = error.response?.data?.code;
                  const msg =
                    code === "CUT_REQUEST_NOT_ALLOWED"
                      ? "A loja está aberta agora — tente entrar na fila normalmente."
                      : mensagemDoErro(error, "Erro ao enviar o pedido de corte");
                  Alert.alert("Erro", msg);
                } finally {
                  setIsRequestingCut(false);
                }
              }}
            />
          )}
          <Button
            title="Voltar"
            variant={canRequestCut ? "outline" : "solid"}
            mt="$4"
            onPress={() => {
              leaveQueue();
              navigation.goBack();
            }}
          />
        </Center>
      </VStack>
    );
  }

  // Estado ESPERANDO = tela cheia no verde da marca (Pencil CLIENT · 11). Os
  // outros estados (em atendimento, pausado, concluido) ficam no fundo claro:
  // o verde cheio e o sinal de "voce esta esperando a sua vez" e perde o
  // sentido se valer para tudo.
  const waitingInQueue = isInQueue && !isBeingAttended && !isPaused && !isFinished;
  // Fonte unica da posicao (decisao de 05/09): escondida pelo profissional,
  // o numero grande e as bolinhas somem e o tempo assume o lugar.
  const position = posicaoVisivel(activeQueue?.position, mostraPosicao);
  const peopleAhead = position != null ? Math.max(0, position - 1) : null;
  const initial = activeQueue?.initialPosition;
  // Progresso feito. So existe depois de andar na fila — no primeiro poll
  // `initial` e igual a posicao atual e nao ha nada a comemorar ainda.
  const passed = initial != null && position != null ? Math.max(0, initial - position) : 0;

  // Estado CONCLUIDO em tela cheia (Pencil CLIENT · 13 Fim do atendimento).
  // Nao virou rota nova: o Pencil desenha uma "tela" separada, mas isso e o
  // desfecho DESTE fluxo — criar uma rota orfa significaria alguem ter de
  // navegar ate ela, e o app ja esta aqui quando o atendimento termina.
  if (isFinished) {
    const servicos = activeQueue?.serviceMinutes;
    const jaAvaliou = !!attendanceId && ratedIds.includes(attendanceId);

    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: "#FFFFFF" }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <VStack flex={1} bg="$brandBackground">
          {/* Sem cabecalho: e um heroi de sucesso, sem voltar. Mas o topo vem
              do safe-area, nao de um 56 chutado. */}
          <VStack style={{ paddingTop: insets.top + 12 }} px={16} gap="$4" alignItems="center">
            <Center width={96} height={96} borderRadius={48} bg="$brandGreen">
              <Check size={48} color="#163300" />
            </Center>
            <Text
              fontFamily="$display"
              fontSize={fs(32)}
              letterSpacing={-1.4}
              color="$forest"
              textAlign="center"
            >
              PRONTO!
            </Text>
            <Text size="sm" color="$brandTextSecondary" textAlign="center">
              {activeQueue?.professionalName ?? paramProfName ?? "Atendimento"}
              {servicos != null ? ` · ${formatWaitTime(servicos)}` : ""}
            </Text>
          </VStack>

          <VStack flex={1} px={16} pt="$8" gap="$4">
            {/* O convite pra avaliar so aparece se ainda nao avaliou — depois
                de enviar, insistir e so ruido. */}
            {attendanceId && !jaAvaliou && (
              <VStack bg="$brandSurface" borderRadius={20} p={20} gap="$4" alignItems="center">
                <Text
                  fontFamily="$display"
                  fontSize={fs(17)}
                  letterSpacing={-0.3}
                  color="$brandTextPrimary"
                  textAlign="center"
                >
                  Como foi o atendimento?
                </Text>
                <Button title="Avaliar atendimento" onPress={() => setShowRating(true)} />
                <Text size="xs" color="$brandTextSecondary" textAlign="center">
                  Sua nota aparece para outros clientes
                </Text>
              </VStack>
            )}

            {/* "Marcar de novo": o caminho de volta pro mesmo profissional, que
                e o desfecho util de um atendimento bom. */}
            {activeQueue?.establishmentId && (
              <TouchableOpacity
                onPress={() => {
                  const establishmentId = activeQueue.establishmentId;
                  leaveQueue();
                  navigation.navigate("establishmentDetail", { establishmentId }, { pop: true });
                }}
                testID="book-again"
              >
                <HStack bg="$greenTint" borderRadius={18} p={16} gap="$3.5" alignItems="center">
                  <PlaceAvatar
                    name={activeQueue.professionalName ?? "?"}
                    size={52}
                    bg="$brandGreen"
                  />
                  <VStack flex={1} gap="$0.5">
                    <Text fontFamily="$heading" fontSize={fs(15)} color="$forest">
                      Marcar de novo com {activeQueue.professionalName ?? "o profissional"}
                    </Text>
                    <Text size="xs" color="$forest">
                      {activeQueue.establishmentName ?? ""}
                    </Text>
                  </VStack>
                  <ChevronRight size={20} color="#163300" />
                </HStack>
              </TouchableOpacity>
            )}
          </VStack>

          <VStack px={16} pt="$6" gap="$3" alignItems="center">
            <Button
              title="Voltar ao início"
              variant="outline"
              onPress={() => {
                leaveQueue();
                navigation.navigate("home", undefined, { pop: true });
              }}
              testID="finish-home"
            />
          </VStack>
        </VStack>

        <RatingModal
          visible={showRating}
          attendanceId={attendanceId}
          professionalName={activeQueue?.professionalName ?? paramProfName}
          onClose={() => setShowRating(false)}
        />
      </ScrollView>
    );
  }

  if (waitingInQueue) {
    return (
      <VStack flex={1} bg="$brandGreen">
        {/* `ground="marca"` porque o hero e brand-green: os botoes vao de
            forest translucido. O verde-claro padrao sumiria sobre o verde. */}
        <Box px={16}>
          <ScreenHeader
            ground="marca"
            onBack={() => navigation.navigate("home", undefined, { pop: true })}
            action={
              <HeaderIconButton
                onPress={() => setShowDisclaimer(true)}
                ground="marca"
                testID="queue-info"
                accessibilityLabel="Sobre o tempo estimado"
              >
                <Info size={20} color="#163300" />
              </HeaderIconButton>
            }
          />
        </Box>

        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#163300" colors={["#163300"]} />
          }
        >
          {/* fila-aguardando-do-mockup (André, 29/10, mockup 2): o carrossel em cima, no card padrão; o aviso
              "clique em Opções" é um slide dele. */}
          <CarrosselDeCampanhas
            campanhas={campanhasAtivas}
            avisos={[{ id: "opcoes", valor: "Opções", nome: "Clique em Opções caso não consiga chegar no horário" }]}
          />

          {/* nome-e-informacoes-sobem-como-no-mockup (André, 30/10): o nome e a loja logo abaixo do carrossel, o vão do mockup (14 px). */}
          <VStack flex={1} px={16} pt="$3.5" gap="$3.5" testID="aguardando-faixas">
            <VStack>
              <Text fontFamily="$display" fontSize={fs(20)} letterSpacing={-0.5} color={cores.onGreen} testID="queue-professional">
                {activeQueue?.professionalName ?? paramProfName ?? "Atendimento"}
              </Text>
              <Text fontFamily="$body" fontSize={fs(13)} color="#163300CC">
                {activeQueue?.establishmentName ?? ""}
                {activeQueue?.serviceMinutes != null ? ` · ${formatWaitTime(activeQueue.serviceMinutes)}` : ""}
              </Text>
            </VStack>

            {/* aguardando-distribuir-faixas (print do André, 01/11): o espaço livre se divide acima e abaixo do
                cronômetro (margin-top:auto do mockup); carrossel e nome ficam no topo e as informações descem. */}
            <VStack flex={1} justifyContent="center" gap="$3.5" testID="faixa-do-cronometro">
              {/* Faixa do meio: o cronômetro mm:ss com "tempo estimado" (DEC-149, mockup 2). Conta os segundos também com o
                  número de pessoas oculto. No 0:00, "Sua vez chegou!" ocupa o lugar do rótulo. */}
              <VStack alignItems="center" py="$1.5" testID="cronometro-da-vez">
                <Text
                  fontFamily="$display"
                  fontSize={fs(segundosAteAVez == null ? 30 : 84)}
                  lineHeight={fs(segundosAteAVez == null ? 34 : 88)}
                  letterSpacing={-3}
                  color={cores.onGreen}
                  testID="queue-time"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.5}
                >
                  {segundosAteAVez == null ? "Calculando..." : formatElapsed(segundosAteAVez)}
                </Text>
                {segundosAteAVez === 0 ? (
                  <SuaVezChegou cor={cores.onGreen} />
                ) : (
                  <Text fontFamily="$body" fontSize={fs(13)} color={cores.onGreen} textAlign="center">
                    {semPrevisao ? "calculando a espera" : "tempo estimado"}
                  </Text>
                )}
              </VStack>

              {passed > 0 && initial != null && (
                <Text fontFamily="$body" fontSize={fs(13)} fontWeight="$semibold" color="#163300CC" textAlign="center">
                  Você já passou {passed} {passed === 1 ? "pessoa" : "pessoas"}
                </Text>
              )}

            </VStack>

            {/* Informações embaixo, nesta ordem: pessoas à frente (some se o profissional ocultar), início estimado
                (hora do cálculo, sem segundos) e valor do serviço. A ~44 px do botão Opções. */}
            <VStack gap="$2.5" style={{ marginBottom: 44 }} testID="faixa-das-informacoes">
              {peopleAhead != null && (
                <HStack justifyContent="space-between" alignItems="baseline">
                  <Text fontFamily="$body" fontSize={fs(13)} color={cores.onGreen}>Pessoas à frente</Text>
                  <NumeroComSalto valor={peopleAhead}>
                    <Text fontFamily="$display" fontSize={fs(18)} color={cores.onGreen} testID="queue-position">{peopleAhead}</Text>
                  </NumeroComSalto>
                </HStack>
              )}
              <HStack justifyContent="space-between" alignItems="baseline" testID="inicio-estimado">
                <Text fontFamily="$body" fontSize={fs(13)} color={cores.onGreen}>Início estimado</Text>
                <Text fontFamily="$display" fontSize={fs(18)} color={cores.onGreen}>
                  {semPrevisao ? "Calculando..." : startTimeLabel}
                </Text>
              </HStack>
              {activeQueue?.totalValue != null && (
                <HStack justifyContent="space-between" alignItems="baseline" testID="valor-do-servico">
                  <Text fontFamily="$body" fontSize={fs(13)} color={cores.onGreen}>Valor do serviço</Text>
                  <Text fontFamily="$display" fontSize={fs(18)} color={cores.onGreen}>{formatarReais(activeQueue.totalValue)}</Text>
                </HStack>
              )}
            </VStack>
          </VStack>
          <Box mt="$3.5" alignItems="center">
            <AtualizarNoNavegador atualizando={refreshing} onPress={handleRefresh} />
          </Box>
        </ScrollView>

        {/* A faixa fixa de 20/09 saiu (teste de 25/09): ela empurrava "Sair da
            fila" para fora da tela e mostrava o VALOR da multa na entrada. Pela
            D15, enquanto a pessoa so espera nao ha faixa — ela so aparece ao
            tentar sair.

            O respiro de baixo soma a barra do sistema: com um valor fixo, no
            Android com navegacao por gestos/botoes o ultimo botao ficava por
            baixo dela. */}
        {/* D13/D15: a tolerancia, sem preco — so com o horario do servidor. A
            `key` recomeca a faixa quando o horario muda. */}
        <FaixaDaTolerancia key={activeQueue?.toleranceUntil ?? 0} ate={activeQueue?.toleranceUntil} />

        {/* aviso-de-atraso-e-saida-da-fila (24/10): a contagem "n de 3"; no 3º o cliente já saiu da fila. */}
        {typeof activeQueue?.lateCount === "number" && activeQueue.lateCount > 0 && activeQueue.lateCount < 3 && (
          <Box px={16} pb="$2">
            <Text size="xs" color="$brandTextSecondary" textAlign="center" testID="contagem-de-atrasos">
              {`Atrasos: ${activeQueue.lateCount} de 3`}
            </Text>
          </Box>
        )}

        <VStack px={16} style={{ paddingBottom: Math.max(28, insets.bottom + 16) }} gap="$3.5" alignItems="center">
          {/* fila-aguardando-do-mockup (CLI-32): um botão só; trocar de lugar, ir para o final e sair moram em Opções. */}
          {(canReshuffle || canCancel) && (
            <TouchableOpacity onPress={() => setShowOpcoes(true)} disabled={isRemanejando} style={{ width: "100%" }} testID="queue-options">
              <HStack bg={cores.forest} borderRadius="$full" px={24} py={15} justifyContent="center" alignItems="center" opacity={isRemanejando ? 0.6 : 1}>
                <Text fontFamily="$heading" fontSize={fs(15)} color="$brandGreen">
                  {isRemanejando ? "Um instante..." : "Opções"}
                </Text>
              </HStack>
            </TouchableOpacity>
          )}
        </VStack>

        <MoreOptionsModal
          visible={showOpcoes}
          title="Opções"
          subtitle={activeQueue?.professionalName}
          options={[
            ...(canReshuffle
              ? [
                  {
                    key: "change-turn",
                    title: "Trocar de lugar",
                    description: "Escolha outro horário na fila",
                    icon: Repeat2,
                    onPress: () => {
                      setShowOpcoes(false);
                      handleOpenChangeTurn();
                    },
                  },
                  {
                    key: "ver-trocas",
                    title: acceptableCount > 0 ? `Pedidos de troca (${acceptableCount})` : "Pedidos de troca",
                    description: "Os que você pode aceitar e os seus",
                    icon: Repeat2,
                    onPress: () => {
                      setShowOpcoes(false);
                      setShowSwapOffers(true);
                    },
                  },
                  {
                    key: "move-to-end",
                    title: "Ir para o final da fila",
                    description: "Você entra de novo, no último lugar",
                    icon: ChevronsDown,
                    onPress: () => {
                      setShowOpcoes(false);
                      handleMoveToEnd();
                    },
                  },
                ]
              : []),
            ...(canCancel
              ? [
                  {
                    key: "leave-queue",
                    title: "Sair da fila",
                    // sair-da-fila-toque-duplo-vermelho (30/10): o pedido do duplo toque mora só aqui, em vermelho;
                    // o 1º toque não mostra nada e o menu fica aberto até o 2º, que precisa vir em 500 ms.
                    description: AVISO_DO_SEGUNDO_TOQUE,
                    perigo: true,
                    icon: LogOut,
                    onPress: () => {
                      if (ehToqueDuplo(ultimoToqueEmSair.current, Date.now())) setShowOpcoes(false);
                      handleCancel();
                    },
                  },
                ]
              : []),
          ]}
          onClose={() => setShowOpcoes(false)}
        />

        <RescheduleModal
          visible={showReschedule}
          baseMs={rescheduleBaseMs}
          tailEtaMs={tailEtaMs}
          penalty={penalty}
          loading={isRemanejando}
          onConfirm={submitReschedule}
          onClose={() => setShowReschedule(false)}
        />
        <ChangeTurnModal
          visible={showChangeTurn}
          tailEtaMs={tailEtaMs}
          isLast={isLastInQueue}
          swapBusy={isPublishingSwap}
          onMoveToEnd={() => {
            setShowChangeTurn(false);
            handleMoveToEnd();
          }}
          onReschedule={() => {
            setShowChangeTurn(false);
            setShowReschedule(true);
          }}
          onCreateSwapOffer={handleCreateSwapOffer}
          onClose={() => setShowChangeTurn(false)}
        />
        <SwapOffersModal
          visible={showSwapOffers}
          professionalId={professionalId}
          establishmentId={establishmentId}
          onClose={() => setShowSwapOffers(false)}
          onChanged={refresh}
        />
        <QueueDisclaimerModal visible={showDisclaimer} onClose={handleCloseDisclaimer} />
      </VStack>
    );
  }

  return (
    <VStack flex={1} px={16} pb={30} bg="$brandBackground">
      <ScreenHeader title="SUA VEZ" onBack={() => navigation.navigate("home", undefined, { pop: true })} />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#163300" colors={["#163300"]} />
        }
      >
      <Center flex={1}>
        <Heading fontFamily="$heading" fontSize="$2xl" textAlign="center">
          {isFinished
            ? "Atendimento concluído ✅"
            : isPaused
              ? "Atendimento pausado"
              : isBeingAttended
                ? "Em atendimento!"
                : "Você está na fila!"}
        </Heading>

        <Box
          bg="$brandSurface"
          p="$6"
          mt="$6"
          borderRadius="$card"
          borderWidth="$2"
          borderColor={borderColor}
          w="$full"
          alignItems="center"
        >
          {!isFinished && (
            <HStack alignItems="center" gap="$1">
              <Text size="sm" color="$brandTextSecondary">
                {isBeingAttended ? "Tempo de atendimento" : "Duração estimada"}
              </Text>
              {!isBeingAttended && (
                <TouchableOpacity
                  onPress={() => setShowDisclaimer(true)}
                  testID="queue-info-inline"
                  accessibilityRole="button"
                  accessibilityLabel="Sobre o tempo estimado"
                  // 16px de icone e alvo pequeno demais pra dedo; o hitSlop
                  // leva a area de toque pros 32.
                  hitSlop={8}
                >
                  {/* #9CA3AF da 2,85:1 no claro e reprova no AA. */}
                  <Info size={16} color="#454745" />
                </TouchableOpacity>
              )}
            </HStack>
          )}
          <Heading
            fontFamily="$heading"
            fontSize="$4xl"
            color={timeColor}
            testID="queue-time"
          >
            {timeLabel}
          </Heading>

          <Box w="$full" h="$px" bg="$brandBorder" my="$4" />

          {isInQueue && (
            <HStack w="$full" justifyContent="space-between" mb="$3">
              <Text size="sm" color="$brandTextSecondary">Previsão de início</Text>
              <Text size="sm" fontFamily="$heading">
                {semPrevisao ? "Calculando..." : remaining! <= 0 ? "A qualquer momento" : startTimeLabel}
              </Text>
            </HStack>
          )}

          {isBeingAttended && activeQueue?.serviceMinutes != null && (
            <HStack w="$full" justifyContent="space-between" mb="$3">
              <Text size="sm" color="$brandTextSecondary">Duração estimada</Text>
              <Text size="sm" fontFamily="$heading">
                {formatWaitTime(activeQueue.serviceMinutes)}
              </Text>
            </HStack>
          )}

          {/* valor-no-em-atendimento (André, 22/10): o cliente vê o valor do serviço. */}
          {isBeingAttended && typeof activeQueue?.totalValue === "number" && (
            <HStack w="$full" justifyContent="space-between" mb="$3" testID="em-atendimento-valor">
              <Text size="sm" color="$brandTextSecondary">Valor</Text>
              <Text size="sm" fontFamily="$heading">{reais(activeQueue.totalValue)}</Text>
            </HStack>
          )}

          {endTimeLabel && (
            <HStack w="$full" justifyContent="space-between" mb="$3">
              <Text size="sm" color="$brandTextSecondary">Horário de término</Text>
              <Text size="sm" fontFamily="$heading">{endTimeLabel}</Text>
            </HStack>
          )}

          <HStack w="$full" justifyContent="space-between" mb="$3">
            <Text size="sm" color="$brandTextSecondary">Estabelecimento</Text>
            <Text size="sm" fontFamily="$heading">
              {activeQueue?.establishmentName ?? paramEstName ?? "..."}
            </Text>
          </HStack>

          <HStack w="$full" justifyContent="space-between" mb="$3">
            <Text size="sm" color="$brandTextSecondary">Profissional</Text>
            <Text size="sm" fontFamily="$heading">
              {activeQueue?.professionalName ?? paramProfName ?? "..."}
            </Text>
          </HStack>

          <HStack w="$full" justifyContent="space-between">
            <Text size="sm" color="$brandTextSecondary">Status</Text>
            <Text size="sm" fontFamily="$heading">
              {STATUS_LABELS[status] ?? STATUS_DESCONHECIDO}
            </Text>
          </HStack>
        </Box>

        {/* No navegador nao ha "arrastar para baixo": a dica vira o botao. */}
        {ehNavegador() ? (
          <Box mt="$4">
            <AtualizarNoNavegador atualizando={refreshing} onPress={handleRefresh} />
          </Box>
        ) : (
          <Text size="xs" color="$brandTextSecondary" mt="$4" textAlign="center">
            A fila atualiza sozinha — arraste para baixo para atualizar agora
          </Text>
        )}
      </Center>
      </ScrollView>

      <VStack gap="$3" mt="$4">
        {canReshuffle && (
          <>
            <Text size="xs" color="$brandTextSecondary" textAlign="center">
              Não pode esperar agora? Você pode adiantar ou atrasar a sua vez.
            </Text>
            <Button
              title="Mudar minha vez"
              isLoading={isRemanejando}
              onPress={handleOpenChangeTurn}
            />
            <Button
              title={acceptableCount > 0 ? `Trocar de lugar (${acceptableCount})` : "Trocar de lugar"}
              variant="outline"
              onPress={() => setShowSwapOffers(true)}
            />
          </>
        )}
        {/* Concluido nao chega aqui: a tela de concluido (com o Avaliar) volta antes. */}
        <Button title="Voltar ao início" onPress={() => navigation.navigate("home", undefined, { pop: true })} />
        {/* Sair da fila: vermelho e SEMPRE a última opção (pedido do Andre). */}
        {canCancel && (
          <Button
            title="Sair da fila"
            variant="destructive"
            isDisabled={isRemanejando}
            onPress={handleCancel}
          />
        )}
      </VStack>

      <RescheduleModal
        visible={showReschedule}
        baseMs={rescheduleBaseMs}
        tailEtaMs={tailEtaMs}
        penalty={penalty}
        loading={isRemanejando}
        onConfirm={submitReschedule}
        onClose={() => setShowReschedule(false)}
      />
      <ChangeTurnModal
        visible={showChangeTurn}
        tailEtaMs={tailEtaMs}
        isLast={isLastInQueue}
        swapBusy={isPublishingSwap}
        onMoveToEnd={() => {
          setShowChangeTurn(false);
          handleMoveToEnd();
        }}
        onReschedule={() => {
          setShowChangeTurn(false);
          setShowReschedule(true);
        }}
        onCreateSwapOffer={handleCreateSwapOffer}
        onClose={() => setShowChangeTurn(false)}
      />

      <SwapOffersModal
        visible={showSwapOffers}
        professionalId={professionalId}
        establishmentId={establishmentId}
        onClose={() => setShowSwapOffers(false)}
        onChanged={refresh}
      />
      <QueueDisclaimerModal visible={showDisclaimer} onClose={handleCloseDisclaimer} />
    </VStack>
  );
}
