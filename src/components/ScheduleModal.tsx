import { useEffect, useState } from "react";
import { Alert, Modal, ScrollView, TouchableOpacity } from "react-native";
import { VStack, HStack, Box, Text, Heading, Spinner } from "@gluestack-ui/themed";

import { Button } from "@components/Button";
import { DaySelector } from "@components/DaySelector";
import { floatingShadow } from "@utils/styles";
import { horariosDoDia, mensagemDoAgendamento, AgendaPublica } from "@domain/schedule/encaixe";
import { formatClockTime } from "@domain/queue/types";
import { HorariosDaLoja } from "@domain/establishment/horarios";
import { intentionsService } from "@services/intentionsService";
import { establishmentService } from "@services/establishmentService";
import { useAuthStore } from "@stores/authStore";

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
};

// "Agendar" = INTENCAO (Item ②). Escolhe o dia, ve a BARRA DE ENCAIXE daquele
// dia — os horarios em que o servico cabe — e confirma (Andre, 26/09: "temos que
// incluir essa funcionalidade"). Os horarios vem da agenda publica do
// profissional (piso da fila e reservados, anonimos) e do horario da loja.
export function ScheduleModal({
  visible, onClose, professionalId, establishmentId, serviceItemIds = [], minutosDoServico = 30, onPrecisaLogin, onAgendado,
}: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
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

  async function confirmar() {
    if (!horario || !professionalId) return;
    if (!accessToken) {
      close();
      onPrecisaLogin?.();
      return;
    }
    setEnviando(true);
    try {
      await intentionsService.create(
        { professionalId, serviceItemIds, desiredTime: horario.toISOString() },
        accessToken,
      );
      const quando = `${String(horario.getDate()).padStart(2, "0")}/${String(horario.getMonth() + 1).padStart(2, "0")} às ${formatClockTime(horario)}`;
      close();
      Alert.alert("Agendado", `Seu horário ficou para ${quando}. Ele aparece em Atendimentos.`);
      onAgendado?.();
    } catch (error: any) {
      Alert.alert("Não foi possível agendar", mensagemDoAgendamento(error?.response?.status, error?.response?.data?.code));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Box flex={1} bg="rgba(0,0,0,0.45)" justifyContent="center" px={24}>
        <VStack bg="$white" borderRadius="$card" p="$6" style={floatingShadow}>
          <Heading fontFamily="$heading" fontSize="$lg">
            Agendar
          </Heading>
          <Text size="sm" color="$brandTextSecondary" mt="$1">
            Escolha o dia e o horário.
          </Text>

          <Box mt="$5">
            <DaySelector
              selectedDate={selectedDate}
              onSelect={(d) => {
                setSelectedDate(d);
                setHorario(null);
              }}
            />
          </Box>

          {selectedDate != null && (
            <Box mt="$4" testID="barra-de-encaixe">
              {!doDia ? (
                <HStack gap="$2" alignItems="center">
                  <Spinner color="$forest" />
                  <Text size="sm" color="$brandTextSecondary">Buscando horários...</Text>
                </HStack>
              ) : doDia.tipo === "livres" ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {doDia.horarios.map((h) => {
                    const ativo = horario?.getTime() === h.getTime();
                    return (
                      <TouchableOpacity key={h.getTime()} onPress={() => setHorario(h)} testID={`horario-${formatClockTime(h)}`}>
                        <Box bg={ativo ? "$forest" : "$brandSurface"} borderRadius="$full" px={14} py={8}>
                          <Text fontWeight="$bold" color={ativo ? "$brandGreen" : "$forest"}>{formatClockTime(h)}</Text>
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

          <Button
            title={enviando ? "Agendando..." : "Confirmar"}
            mt="$5"
            isDisabled={horario == null || enviando}
            opacity={horario == null ? 0.5 : 1}
            onPress={confirmar}
            testID="confirmar-agendamento"
          />
          <Button title="Cancelar" variant="outline" mt="$3" onPress={close} />
        </VStack>
      </Box>
    </Modal>
  );
}
