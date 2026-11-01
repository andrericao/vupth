import { avisarLimiteDeMultas } from "@utils/limiteDeMultas";
import { useEffect, useState } from "react";
import { Alert, Modal, ScrollView, TouchableOpacity } from "react-native";
import { VStack, HStack, Box, Text, Heading, Spinner } from "@gluestack-ui/themed";

import { Button } from "@components/Button";
import { DaySelector } from "@components/DaySelector";
import { CaixaDeModal } from "@components/CaixaDeModal";
import { horariosDoDia, mensagemDoAgendamento, situacaoDoDia, AgendaPublica } from "@domain/schedule/encaixe";
import { formatClockTime } from "@domain/queue/types";
import { HorariosDaLoja, horarioDeHoje } from "@domain/establishment/horarios";
import { intentionsService } from "@services/intentionsService";
import { establishmentService } from "@services/establishmentService";
import { useAuthStore } from "@stores/authStore";
import { pendenciasDoErro } from "@domain/pagamento/pendencia";
import { usePendenciaStore } from "@stores/pendenciaStore";
import { useTema } from "@hooks/useTema";
import { avisoDeChegada } from "@domain/queue/avisoDeChegada";
import { alertaTipado } from "@utils/alertaTipado";
import { mensagemDoCupom } from "@domain/campanhas";
import { usePagamentoAdiantado, AVISO_DE_PAGAMENTO_ADIANTADO } from "@hooks/usePagamentoAdiantado";

type Props = {
  visible: boolean;
  onClose: () => void;
  professionalId?: string;
  establishmentId?: string;
  serviceItemIds?: string[];
  /** Duracao somada dos servicos escolhidos — o horario tem de caber inteiro. */
  minutosDoServico?: number;
  /** Visitante: o agendar passa pelo login (a selecao volta com ele). */
  onPrecisaLogin?: () => void;
  onAgendado?: () => void;
  /** Cupom escolhido (cupom-em-configuracoes) e o aviso quando ele nao vale mais. */
  couponCampaignId?: string | null;
  onCupomInvalido?: () => void;
  /**
   * Pedido de corte com dia e horario (S26, Backend 36c4359): a mesma barra de
   * encaixe, mas quem confirma e o dono da tela — o modal so devolve o horario.
   * Com ele, o modal tambem oferece "Assim que abrir" (sem horario).
   */
  corte?: { onEscolher: (horario: Date | null) => void };
  /**
   * agenda-da-semana-nao-liberada (24/10): dia em que a loja abre mas o profissional nao liberou a
   * agenda: em vez de agendar, o cliente SOLICITA (o dono da tela envia o pedido com dia e horario).
   */
  onSolicitar?: (horario: Date) => void;
};

// Relógio fora do componente (regra de pureza do React): o aviso de chegada lê o agora.
const relogio = () => Date.now();

// "Agendar" = INTENCAO (Item ②). Escolhe o dia, ve a BARRA DE ENCAIXE daquele
// dia — os horarios em que o servico cabe — e confirma (Andre, 26/09: "temos que
// incluir essa funcionalidade"). Os horarios vem da agenda publica do
// profissional (piso da fila e reservados, anonimos) e do horario da loja.
export function ScheduleModal({
  visible, onClose, professionalId, establishmentId, serviceItemIds = [], minutosDoServico = 30, onPrecisaLogin, onAgendado, corte, couponCampaignId, onCupomInvalido, onSolicitar,
}: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const adiantado = usePagamentoAdiantado(visible && !corte);
  const { cores } = useTema();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [horario, setHorario] = useState<Date | null>(null);
  const [agenda, setAgenda] = useState<AgendaPublica | null>(null);
  const [horariosDaLoja, setHorariosDaLoja] = useState<HorariosDaLoja | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [agora, setAgora] = useState(0);

  // A agenda e o horario da loja: uma leitura ao abrir.
  useEffect(() => {
    if (!visible || !professionalId || !establishmentId) return;
    let vivo = true;
    Promise.all([
      intentionsService.getPublicAgenda(professionalId).then((r) => r.data).catch(() => null),
      establishmentService.getHours(establishmentId).then((r) => r.data).catch(() => null),
    ]).then(([a, h]) => {
      if (!vivo) return;
      setAgenda(a);
      setHorariosDaLoja(h);
      setAgora(Date.now());
    });
    return () => {
      vivo = false;
    };
  }, [visible, professionalId, establishmentId]);

  function close() {
    setSelectedDate(null);
    setHorario(null);
    // Ao reabrir, le de novo: "agora" zerado = carregando.
    setAgora(0);
    onClose();
  }

  const doDia = selectedDate && agora
    ? horariosDoDia({ dia: selectedDate, agoraMs: agora, horarios: horariosDaLoja, agenda, minutosDoServico })
    : null;

  // agenda-da-semana-nao-liberada: a loja abre e o profissional nao liberou o dia = Solicitar.
  const solicitar = !corte && !!onSolicitar && selectedDate != null && situacaoDoDia(agenda, selectedDate) === "solicitar";

  async function confirmar() {
    if (!horario || !professionalId) return;
    if (solicitar) {
      if (!accessToken) {
        close();
        onPrecisaLogin?.();
        return;
      }
      close();
      onSolicitar?.(horario);
      return;
    }
    if (corte) {
      close();
      corte.onEscolher(horario);
      return;
    }
    if (!accessToken) {
      close();
      onPrecisaLogin?.();
      return;
    }
    // aviso-de-chegada-na-entrada (André, 22/10): agendando para daqui a menos de
    // 1 hora, o mesmo aviso diz até que horas estar na loja; Cancelar não agenda.
    const aviso = avisoDeChegada((horario.getTime() - relogio()) / 60000, relogio());
    if (aviso) {
      alertaTipado(aviso.titulo, aviso.mensagem, [
        { text: aviso.cancelar, style: "cancel" },
        { text: aviso.confirmar, onPress: () => { void enviar(horario); } },
      ], { tipo: "atencao" });
      return;
    }
    await enviar(horario);
  }

  async function enviar(horario: Date) {
    if (!accessToken || !professionalId) return;
    setEnviando(true);
    try {
      await intentionsService.create(
        {
          professionalId,
          serviceItemIds,
          desiredTime: horario.toISOString(),
          ...(couponCampaignId ? { coupon_campaign_id: couponCampaignId } : {}),
        },
        accessToken,
      );
      const quando = `${String(horario.getDate()).padStart(2, "0")}/${String(horario.getMonth() + 1).padStart(2, "0")} às ${formatClockTime(horario)}`;
      close();
      Alert.alert("Agendado", `Seu horário ficou para ${quando}. Ele aparece em Atendimentos.`);
      onAgendado?.();
    } catch (error: any) {
      // Pagamento pendente (CLI-30): fecha a agenda e mostra o aviso com o "Pagar".
      const pendencias = pendenciasDoErro(error);
      if (pendencias) {
        close();
        usePendenciaStore.getState().avisar(pendencias);
        return;
      }
      // multa-bloqueia-entrada (DEC-83): com duas multas pendentes, o aviso com o "Pagar multa".
      if (avisarLimiteDeMultas(error)) {
        close();
        return;
      }
      if (error?.response?.data?.code === "COUPON_NOT_ACTIVE") {
        close();
        onCupomInvalido?.();
        Alert.alert("Cupom", mensagemDoCupom(error));
        return;
      }
      Alert.alert("Não foi possível agendar", mensagemDoAgendamento(error?.response?.status, error?.response?.data?.code));
    } finally {
      setEnviando(false);
    }
  }

  const rodape = (
    <VStack gap="$3" testID="agenda-rodape">
      {/* O rotulo nao vira "Agendando..." (guia de texto, regra 6): o botao
          desabilitado com o spinner ja diz que esta enviando. */}
      <Button
        title={corte ? "Pedir" : solicitar ? "Solicitar agendamento" : "Agendar"}
        isLoading={enviando}
        isDisabled={horario == null || enviando}
        opacity={horario == null ? 0.5 : 1}
        onPress={confirmar}
        testID="confirmar-agendamento"
      />
      <Button title="Cancelar" variant="outline" onPress={close} />
    </VStack>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <CaixaDeModal testID="agenda-caixa" rolagemTestID="agenda-rolagem" rodapeTestID="agenda-rodape-caixa" rodape={rodape}>
        <Heading fontFamily="$heading" fontSize="$lg">
          {corte ? "Pedir corte" : solicitar ? "Solicitar agendamento" : "Agendar"}
        </Heading>
        <Text size="sm" color="$brandTextSecondary" mt="$1">
          {corte
            ? "O profissional responde em 5 min."
            : "Escolha o dia e o horário."}
        </Text>
        {/* agendar-com-pagamento-adiantado (DEC-105/115): 3 faltas — o motivo em uma linha; agendar segue livre. */}
        {!corte && adiantado && (
          <Text size="sm" color="$brandDanger" mt="$2" testID="pagamento-adiantado">
            {AVISO_DE_PAGAMENTO_ADIANTADO}
          </Text>
        )}

        {corte && (
          <Button
            title="Assim que abrir"
            variant="outline"
            mt="$4"
            onPress={() => {
              close();
              corte.onEscolher(null);
            }}
            testID="corte-assim-que-abrir"
          />
        )}

        <Box mt="$5">
          <DaySelector
            selectedDate={selectedDate}
            esconder={(d) => {
              // Com o campo do Backend (481c56c): store_open=false esconde; sem ele, o horario da loja.
              const situacao = situacaoDoDia(agenda, d);
              return situacao != null ? situacao === "fechado" : horarioDeHoje(horariosDaLoja, d)?.closed === true;
            }}
            onSelect={(d) => {
              setSelectedDate(d);
              setHorario(null);
            }}
          />
        </Box>

        {solicitar && (
          <Text size="sm" color="$brandTextSecondary" mt="$4" testID="agenda-nao-liberada">
            O profissional ainda não liberou este dia. Escolha um horário e solicite; ele responde por aqui.
          </Text>
        )}

        {selectedDate != null && (
          <Box mt="$4" testID="barra-de-encaixe">
            {!doDia ? (
              <HStack gap="$2" alignItems="center">
                <Spinner color={cores.textPrimary} />
                <Text size="sm" color="$brandTextSecondary">Buscando horários...</Text>
              </HStack>
            ) : doDia.tipo === "livres" ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {doDia.horarios.map((h) => {
                  const ativo = horario?.getTime() === h.getTime();
                  return (
                    <TouchableOpacity key={h.getTime()} onPress={() => setHorario(h)} testID={`horario-${formatClockTime(h)}`}>
                      <Box bg={ativo ? "$selecionado" : "$sobrePainel"} borderRadius="$full" px={14} py={8}>
                        <Text fontWeight="$bold" color={ativo ? "$onSelecionado" : "$brandTextPrimary"}>{formatClockTime(h)}</Text>
                      </Box>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <Text size="sm" color="$brandTextSecondary" testID="sem-horario">
                {doDia.tipo === "fechada"
                  ? "A loja não abre neste dia."
                  : doDia.tipo === "cheio"
                    ? "Não há horário livre para este serviço neste dia."
                    : "A loja ainda não informou o horário deste dia."}
              </Text>
            )}
          </Box>
        )}
      </CaixaDeModal>
    </Modal>
  );
}
