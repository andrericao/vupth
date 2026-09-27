import { useState } from "react";
import { Modal, TextInput, TouchableOpacity } from "react-native";
import { VStack, HStack, Box, Text, Center } from "@gluestack-ui/themed";
import { Clock, TriangleAlert } from "lucide-react-native";

import { Button } from "@components/Button";
import { floatingShadow } from "@utils/styles";
import {
  buildTargetFromTime,
  validateRescheduleTime,
  formatClockTime,
  CANCELLATION_PENALTY_VALUE,
} from "@domain/queue/types";
import { COR_DO_PLACEHOLDER } from "@utils/corDoPlaceholder";

type Props = {
  visible: boolean;
  // Piso/dia de referência (ms) — estável, calculado fora do render (fim da fila hoje).
  baseMs: number;
  // ETA (ms) do último da fila hoje, quando conhecido, só para exibir a dica.
  tailEtaMs: number | null;
  // Se o cliente vaga o lugar com < 1h, avisa a multa antes de confirmar.
  penalty: boolean;
  loading: boolean;
  onConfirm: (targetIso: string) => void;
  onClose: () => void;
};

const onlyDigits = (s: string) => s.replace(/\D/g, "").slice(0, 2);

// Campo de hora: quadrado de `brandSurface`, sem borda. Antes era um Box com
// borda `$coolGray300` em volta de um TextInput de largura minima — no
// navegador ele nao encolhia e as bordas VAZAVAM pra fora do cartao branco do
// modal (visivel no print). Sem borda o problema nao existe, e o quadrado
// chapado e o mesmo tratamento dos outros campos do app.
function CampoHora({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
}) {
  return (
    <Center bg="$brandSurface" borderRadius="$card" px={14} py={10}>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={COR_DO_PLACEHOLDER}
        keyboardType="number-pad"
        value={value}
        onChangeText={onChangeText}
        // DM Mono: e numero, e o token `mono` existe justamente pra hora.
        style={{
          fontFamily: "DMMono_500Medium",
          fontSize: 26,
          width: 46,
          textAlign: "center",
          color: "#163300",
          padding: 0,
        }}
      />
    </Center>
  );
}

// Item 16 — "Agendar": o cliente DIGITA o horário desejado (sem sugestões). A
// validação de fechamento/refeição é autoritativa no backend; aqui cobrimos o
// básico (formato + após o fim da fila). Seletor em JS puro (OTA-safe).
export function RescheduleModal({ visible, baseMs, tailEtaMs, penalty, loading, onConfirm, onClose }: Props) {
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setHour("");
    setMinute("");
    setError(null);
  }
  function close() {
    reset();
    onClose();
  }
  function handleConfirm() {
    const h = parseInt(hour, 10);
    const m = parseInt(minute, 10);
    const target = buildTargetFromTime(baseMs, h, m);
    const err = validateRescheduleTime(h, m, target, baseMs);
    if (err) {
      setError(err);
      return;
    }
    reset();
    onConfirm(new Date(target).toISOString());
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Box flex={1} bg="rgba(0,0,0,0.45)" justifyContent="center" px={24}>
        <VStack bg="$brandBackground" borderRadius="$hero" p="$6" gap="$4" style={floatingShadow}>
          <VStack gap="$1.5">
            <Text
              fontFamily="$display"
              fontSize={22}
              lineHeight={26}
              letterSpacing={-0.6}
              color="$forest"
            >
              Agendar minha vez
            </Text>

            {tailEtaMs != null && (
              <HStack alignItems="center" gap="$1.5">
                <Clock size={15} color="#454745" />
                <Text size="sm" color="$brandTextSecondary">
                  A fila hoje deve ir até {formatClockTime(new Date(tailEtaMs))}
                </Text>
              </HStack>
            )}

            {/* Quatro linhas viraram uma. O que saiu: "e uma estimativa e pode
                variar" (a linha do relogio acima ja diz "deve ir ate") e o
                caso do intervalo, que so importa quando acontece — e ai quem
                avisa e a mensagem de erro, com o horario real. */}
            <Text size="sm" lineHeight={20} color="$brandTextSecondary">
              Escolha o horário — precisa estar dentro do funcionamento da loja.
            </Text>
          </VStack>

          {penalty && (
            <HStack
              alignItems="center"
              gap="$2"
              bg="$brandDangerTint"
              borderRadius="$card"
              px="$3.5"
              py="$2.5"
            >
              <TriangleAlert size={16} color="#B3261E" />
              <Text fontFamily="$heading" fontSize={13} lineHeight={18} color="$brandDanger" flex={1}>
                Perto de ser atendido: reagendar agora gera multa de R${" "}
                {CANCELLATION_PENALTY_VALUE},00.
              </Text>
            </HStack>
          )}

          <HStack alignItems="center" justifyContent="center" gap="$2">
            <CampoHora placeholder="HH" value={hour} onChangeText={(t) => setHour(onlyDigits(t))} />
            <Text fontFamily="$display" fontSize={22} color="$forest">
              :
            </Text>
            <CampoHora placeholder="MM" value={minute} onChangeText={(t) => setMinute(onlyDigits(t))} />
          </HStack>

          {error && (
            <Text size="xs" color="$brandDanger" textAlign="center" mt={-8}>
              {error}
            </Text>
          )}

          <VStack gap="$3" alignItems="center">
            <Button title="Agendar" isLoading={loading} onPress={handleConfirm} />
            {/* Cancelar vira LINK: era um botao contornado do mesmo tamanho do
                "Agendar", e dois pesos iguais fazem hesitar na saida errada. */}
            <TouchableOpacity onPress={close} disabled={loading} testID="reschedule-cancel">
              <Text size="sm" fontWeight="$semibold" color="$brandTextSecondary">
                Cancelar
              </Text>
            </TouchableOpacity>
          </VStack>
        </VStack>
      </Box>
    </Modal>
  );
}
