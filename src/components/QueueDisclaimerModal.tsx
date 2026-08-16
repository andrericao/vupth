import { useState } from "react";
import { Modal, TouchableOpacity } from "react-native";
import { VStack, HStack, Box, Text, Heading } from "@gluestack-ui/themed";
import { Info, Check } from "phosphor-react-native";

import { Button } from "@components/Button";
import { cardShadow } from "@utils/styles";

export const QUEUE_DISCLAIMER_TITLE = "Sobre o tempo estimado";
export const QUEUE_DISCLAIMER_TEXT =
  "O tempo mostrado é apenas uma estimativa e pode mudar: o atendimento pode ser " +
  "antecipado ou adiado. Há desistências de clientes e imprevistos. Recomendamos " +
  "acompanhar o app para não perder a sua vez.";

type Props = {
  visible: boolean;
  onClose: (dontShowAgain: boolean) => void;
};

// Modal informativo exibido ao entrar na fila (dismissível, com "não mostrar
// novamente"). O mesmo texto fica disponível sob demanda no ícone "i" da fila.
export function QueueDisclaimerModal({ visible, onClose }: Props) {
  const [dontShow, setDontShow] = useState(false);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => onClose(dontShow)}
    >
      <Box flex={1} bg="rgba(0,0,0,0.45)" justifyContent="center" px={24}>
        <VStack bg="$white" borderRadius="$2xl" p="$6" style={cardShadow}>
          <HStack alignItems="center" gap="$2" mb="$3">
            <Info size={24} color="#163300" weight="fill" />
            <Heading fontFamily="$heading" fontSize="$lg" flex={1}>
              {QUEUE_DISCLAIMER_TITLE}
            </Heading>
          </HStack>

          <Text size="sm" color="$gray300">
            {QUEUE_DISCLAIMER_TEXT}
          </Text>

          <TouchableOpacity onPress={() => setDontShow((v) => !v)} hitSlop={8}>
            <HStack alignItems="center" gap="$2" mt="$4">
              <Box
                w={22}
                h={22}
                borderRadius="$sm"
                borderWidth="$2"
                borderColor={dontShow ? "$forest" : "$coolGray300"}
                bg={dontShow ? "$forest" : "transparent"}
                alignItems="center"
                justifyContent="center"
              >
                {dontShow && <Check size={14} color="#FFFFFF" weight="bold" />}
              </Box>
              <Text size="sm" color="$gray300">
                Não mostrar novamente
              </Text>
            </HStack>
          </TouchableOpacity>

          <Button title="Entendi" mt="$5" onPress={() => onClose(dontShow)} />
        </VStack>
      </Box>
    </Modal>
  );
}
