import { useState } from "react";
import { Modal, TouchableOpacity } from "react-native";
import { VStack, HStack, Box, Text, Center } from "@gluestack-ui/themed";

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
// apenas as opções com a opção de select").
//
// [marca-vupth] As opções vêm AGRUPADAS por intenção (Pencil CLIENT · 09) —
// quem abre este modal já sabe se quer ser atendido mais cedo ou mais tarde, e
// a pergunta some quando cada grupo é rotulado. As descrições encurtaram para
// UMA linha: no desenho elas são a legenda da escolha, não o contrato.
//
// ⚠️ Divergência DELIBERADA do Pencil: lá "Trocar com alguém atrás" aparece em
// "quero ser atendido mais cedo". A mecânica é o contrário — ceder seu lugar a
// quem está atrás te joga para DEPOIS —, então ela mora no grupo de mais
// tempo. Agrupar pela intenção errada é pior do que não agrupar.
const GRUPOS: {
  titulo: string;
  opcoes: { value: TurnOption; title: string; description: string }[];
}[] = [
  {
    titulo: "QUERO SER ATENDIDO MAIS CEDO",
    opcoes: [
      {
        value: "earlier",
        title: "Adiantar minha vez",
        description: "Publicamos seu pedido para quem está à frente",
      },
    ],
  },
  {
    titulo: "PRECISO DE MAIS TEMPO",
    opcoes: [
      {
        value: "later",
        title: "Trocar com alguém atrás",
        description: "A troca é entre vocês dois e dá para cancelar",
      },
      {
        value: "end",
        title: "Ir para o fim da fila",
        description: "Sua vez passa para depois de quem espera",
      },
      {
        value: "schedule",
        title: "Agendar para depois",
        description: "Escolha um horário fora da fila de espera",
      },
    ],
  },
];

function Radio({ selected, disabled }: { selected: boolean; disabled?: boolean }) {
  // [contraste] `$gray400` (#B9BBBC, 1.93:1) fica AQUI de proposito: e a borda
  // de um radio DESABILITADO, e a WCAG isenta controle desabilitado do minimo
  // de contraste — baixo contraste e justamente o sinal de "indisponivel" (a
  // linha inteira ainda leva opacity 0.45). Nao trocar por token de texto: em
  // qualquer OUTRO lugar esse cinza reprova e ja foi substituido.
  const color = disabled ? "$gray400" : selected ? "$forest" : "$brandBorder";
  return (
    <Center w={22} h={22} rounded="$full" borderWidth="$2" borderColor={color}>
      {selected && <Box w={10} h={10} rounded="$full" bg="$forest" />}
    </Center>
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
        <VStack bg="$brandBackground" borderRadius="$hero" p="$6" gap="$4" style={floatingShadow}>
          <VStack gap="$1">
            <Text
              fontFamily="$display"
              fontSize={26}
              lineHeight={30}
              letterSpacing={-0.6}
              color="$forest"
            >
              Mudar minha vez
            </Text>
            <Text size="sm" color="$brandTextSecondary">
              Escolha o que você quer fazer:
            </Text>
          </VStack>

          {GRUPOS.map((grupo) => (
            <VStack key={grupo.titulo} gap="$2">
              <Text
                fontFamily="$body"
                fontSize={15}
                fontWeight="$bold"
                letterSpacing={0.8}
                color="$brandTextSecondary"
              >
                {grupo.titulo}
              </Text>

              {/* O fim da fila de hoje só importa para quem quer ADIAR — era
                  uma caixa amarela do tamanho de meio modal, na paleta
                  anterior, acima de tudo. Vira a legenda do grupo a que ela
                  se refere. */}
              {grupo.titulo === "PRECISO DE MAIS TEMPO" && tailEtaMs != null && (
                <Text size="xs" color="$brandTextSecondary" mt={-4}>
                  A fila de hoje termina às {formatClockTime(new Date(tailEtaMs))}.
                </Text>
              )}

              {grupo.opcoes.map((option) => {
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
                    {/* A borda existe SEMPRE: no desenho a opção é um cartão,
                        e cartão que só ganha contorno ao ser marcado faz a
                        lista inteira pular. Marcado muda o FUNDO. */}
                    <HStack
                      alignItems="center"
                      gap="$3"
                      py="$3"
                      px="$3.5"
                      borderRadius="$card"
                      borderWidth="$1"
                      borderColor={isSelected ? "$forest" : "$brandBorder"}
                      bg={isSelected ? "$greenTint" : "$brandBackground"}
                      opacity={disabled ? 0.45 : 1}
                    >
                      <Radio selected={isSelected} disabled={disabled} />
                      <VStack flex={1} gap="$0.5">
                        <Text fontFamily="$heading" fontSize={18} color="$forest">
                          {option.title}
                        </Text>
                        <Text size="xs" color="$brandTextSecondary">
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
          ))}

          <VStack gap="$3" alignItems="center">
            <Button
              title={swapBusy ? "Publicando..." : "Confirmar"}
              isDisabled={!selected || swapBusy}
              testID="change-turn-confirm"
              onPress={handleConfirm}
            />
            {/* Cancelar vira LINK: era um botão contornado do mesmo tamanho do
                Confirmar, e dois pesos iguais fazem hesitar na saída errada. */}
            <TouchableOpacity onPress={close} testID="change-turn-cancel">
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
