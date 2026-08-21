import { useState } from "react";
import { Modal, TouchableOpacity } from "react-native";
import { VStack, HStack, Box, Text, Heading } from "@gluestack-ui/themed";
import { Clock } from "lucide-react-native";

import { Button } from "@components/Button";
import { floatingShadow } from "@utils/styles";
import { formatClockTime } from "@domain/queue/types";
import { SwapOfferDirection } from "@services/swapOfferService";

type Props = {
  visible: boolean;
  // ETA (ms) do fim da fila hoje (o último cliente), quando conhecido.
  tailEtaMs: number | null;
  // Cliente já é o último da fila? (não faz sentido "ir para o fim").
  isLast: boolean;
  swapBusy?: boolean; // publicando a oferta de troca
  onMoveToEnd: () => void; // ser o último da fila
  onReschedule: () => void; // agendar para depois
  onCreateSwapOffer: (direction: SwapOfferDirection) => void; // publica oferta de troca
  onClose: () => void;
};

type TurnOption = "earlier" | "later" | "end" | "schedule";

// Todas as saídas em UMA lista de escolha, em vez de telas encadeadas de botões
// (Andre 2026-08-05: "no menu de mudar minha vez, ir para o final etc, quero
// apenas as opções com a opção de select"). Ordem = do mais cedo ao mais tarde.
const OPTIONS: { value: TurnOption; title: string; description: string }[] = [
  {
    value: "earlier",
    title: "Adiantar minha vez",
    description:
      "Publicamos seu pedido para quem está à frente. Se alguém aceitar, vocês trocam de lugar — sem custo.",
  },
  {
    value: "later",
    title: "Trocar com alguém atrás",
    description:
      "Publicamos seu pedido para quem está atrás. A troca é entre vocês dois e você pode cancelar quando quiser.",
  },
  {
    value: "end",
    title: "Ir para o fim da fila",
    description: "Você passa a ser o último da fila de hoje.",
  },
  {
    value: "schedule",
    title: "Agendar para depois",
    description: "Escolha um horário e saia da fila de espera.",
  },
];

function Radio({ selected, disabled }: { selected: boolean; disabled?: boolean }) {
  // [contraste] `$gray400` (#B9BBBC, 1.93:1) fica AQUI de proposito: e a borda
  // de um radio DESABILITADO, e a WCAG isenta controle desabilitado do minimo
  // de contraste — baixo contraste e justamente o sinal de "indisponivel" (a
  // linha inteira ainda leva opacity 0.45). Nao trocar por token de texto: em
  // qualquer OUTRO lugar esse cinza reprova e ja foi substituido.
  const color = disabled ? "$gray400" : selected ? "$forest" : "$coolGray300";
  return (
    <Box
      w={22}
      h={22}
      rounded="$full"
      borderWidth="$2"
      borderColor={color}
      alignItems="center"
      justifyContent="center"
    >
      {selected && <Box w={10} h={10} rounded="$full" bg="$brandGreen" />}
    </Box>
  );
}

// "Mudar minha vez" (consolida remanejar + troca). O cliente MARCA uma opção e
// confirma. Troca = /swap-offers (backend fatia 1), nunca gera multa.
export function ChangeTurnModal({ visible, tailEtaMs, isLast, swapBusy, onMoveToEnd, onReschedule, onCreateSwapOffer, onClose }: Props) {
  const [selected, setSelected] = useState<TurnOption | null>(null);

  function close() {
    setSelected(null);
    onClose();
  }

  // Já é o último: "ir para o fim" não faz nada, então não pode nem ser marcado.
  function isDisabled(option: TurnOption) {
    return option === "end" && isLast;
  }

  function handleConfirm() {
    if (!selected) return;
    if (selected === "earlier" || selected === "later") {
      onCreateSwapOffer(selected === "earlier" ? "EARLIER" : "LATER");
      return;
    }
    setSelected(null);
    if (selected === "end") onMoveToEnd();
    else onReschedule();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Box flex={1} bg="rgba(0,0,0,0.45)" justifyContent="center" px={24}>
        <VStack bg="$white" borderRadius="$card" p="$6" style={floatingShadow}>
          <Heading fontFamily="$heading" fontSize="$lg">
            Mudar minha vez
          </Heading>
          <Text size="sm" color="$gray300" mt="$1">
            Escolha o que você quer fazer:
          </Text>

          {tailEtaMs != null && (
            <Box
              bg="$amber100"
              borderRadius="$xl"
              borderWidth="$1"
              borderColor="$amber500"
              px="$4"
              py="$3"
              mt="$3"
            >
              <HStack alignItems="center" gap="$2">
                <Clock size={18} color="#B45309" />
                <Text fontFamily="$heading" size="md" color="$amber800">
                  A fila hoje termina às {formatClockTime(new Date(tailEtaMs))}
                </Text>
              </HStack>
              <Text size="xs" color="$gray300" mt="$1">
                Use como referência: ir para o fim te deixa após esse horário; ou agende para depois dele.
              </Text>
            </Box>
          )}

          <VStack mt="$4">
            {OPTIONS.map((option) => {
              const disabled = isDisabled(option.value);
              const isSelected = selected === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  testID={`change-turn-${option.value}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected, disabled }}
                  disabled={disabled}
                  onPress={() => setSelected(option.value)}
                >
                  <HStack
                    alignItems="flex-start"
                    gap="$3"
                    py="$3"
                    px="$3"
                    borderRadius="$xl"
                    borderWidth="$1"
                    borderColor={isSelected ? "$forest" : "transparent"}
                    bg={isSelected ? "$greenTint" : "transparent"}
                    opacity={disabled ? 0.45 : 1}
                    mb="$2"
                  >
                    <Box mt="$1">
                      <Radio selected={isSelected} disabled={disabled} />
                    </Box>
                    <VStack flex={1}>
                      <Text fontFamily="$heading" size="sm">
                        {option.title}
                      </Text>
                      <Text size="xs" color="$gray300">
                        {disabled && option.value === "end"
                          ? "Você já é o último da fila."
                          : option.description}
                      </Text>
                    </VStack>
                  </HStack>
                </TouchableOpacity>
              );
            })}
          </VStack>

          <Button
            title={swapBusy ? "Publicando..." : "Confirmar"}
            mt="$3"
            isDisabled={!selected || swapBusy}
            testID="change-turn-confirm"
            onPress={handleConfirm}
          />
          <Button title="Cancelar" variant="outline" mt="$3" onPress={close} />
        </VStack>
      </Box>
    </Modal>
  );
}
