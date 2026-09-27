import { useState } from "react";
import { Modal } from "react-native";
import { VStack, HStack, Box, Text, Heading } from "@gluestack-ui/themed";
import { Calendar } from "lucide-react-native";

import { Button } from "@components/Button";
import { DaySelector } from "@components/DaySelector";
import { floatingShadow } from "@utils/styles";
import { notifyComingSoon } from "@domain/comingSoon";
import { isSameDay } from "@domain/schedule/days";

type Props = {
  visible: boolean;
  onClose: () => void;
};

// "Agendar atendimento" = INTENÇÃO (Item ②, decisão Andre 2026-07-15). UX: SEM o
// split "hoje/outro dia" — um único fluxo mostra o seletor de dia ("Hoje" + números
// dos dias) e, escolhido o dia, a barra de encaixe daquele dia.
// ⏳ A barra de encaixe AGUARDA o backend expor projectedQueueEnd/closing_time/blocos
// ocupados. Enquanto isso, ao confirmar o dia mostramos "em breve" e contamos o toque
// (comingSoon). Ao ligar: trocar o notifyComingSoon pela barra de encaixe → cria a
// INTENÇÃO via intentionsService.create({ professionalId, serviceItemIds, desiredTime }).
export function ScheduleModal({ visible, onClose }: Props) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  function close() {
    setSelectedDate(null);
    onClose();
  }

  function confirmDay() {
    if (!selectedDate) return;
    // Enquanto a barra de encaixe não existe, contabiliza a intenção do cliente
    // (hoje vs outro dia) pra priorização e avisa "em breve".
    notifyComingSoon(isSameDay(selectedDate, new Date()) ? "agendar_hoje" : "agendar_outro_dia");
    close();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Box flex={1} bg="rgba(0,0,0,0.45)" justifyContent="center" px={24}>
        <VStack bg="$white" borderRadius="$card" p="$6" style={floatingShadow}>
          <Heading fontFamily="$heading" fontSize="$lg">
            Agendar atendimento
          </Heading>
          <Text size="sm" color="$brandTextSecondary" mt="$1">
            Não vai dar para esperar na fila agora? Escolha o dia para manifestar
            sua intenção.
          </Text>

          <Box mt="$5">
            <DaySelector selectedDate={selectedDate} onSelect={setSelectedDate} />
          </Box>

          {selectedDate != null && (
            <Box
              bg="$greenTint"
              borderRadius="$xl"
              px="$4"
              py="$3"
              mt="$4"
            >
              <HStack alignItems="center" gap="$2">
                <Calendar size={18} color="#163300" />
                {/* [contraste] Era `$gray500` (#DDDEDF) sobre `$greenTint`
                    (#E2F6D5) — dois tons claríssimos, texto praticamente
                    invisível. Sobre greenTint o par da marca é `$forest`,
                    o mesmo do ícone ao lado. */}
                <Text size="sm" color="$forest" flex={1}>
                  A escolha do horário deste dia (barra de encaixe) chega em breve.
                </Text>
              </HStack>
            </Box>
          )}

          <Button
            title="Confirmar"
            mt="$5"
            isDisabled={selectedDate == null}
            opacity={selectedDate == null ? 0.5 : 1}
            onPress={confirmDay}
          />
          <Button title="Cancelar" variant="outline" mt="$3" onPress={close} />
        </VStack>
      </Box>
    </Modal>
  );
}
