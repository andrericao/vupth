import { useState } from "react";
import { Modal, TouchableOpacity } from "react-native";
import { VStack, HStack, Box, Text, Center } from "@gluestack-ui/themed";
import { Info, Check } from "lucide-react-native";

import { Button } from "@components/Button";
import { floatingShadow } from "@utils/styles";
import { useTema } from "@hooks/useTema";
import { fs } from "@stores/fonteStore";

export const QUEUE_DISCLAIMER_TITLE = "Sobre o tempo estimado";
// [marca-vupth] Texto do Pencil (CLIENT · 08), duas linhas. O anterior tinha
// cinco e listava as CAUSAS da variacao ("desistencias de clientes e
// imprevistos") — quem esta na fila nao precisa do porque, precisa saber que o
// numero move e que vale acompanhar. Aviso que ninguem le nao avisa nada.
export const QUEUE_DISCLAIMER_TEXT =
  "É uma estimativa e pode mudar. Fique de olho no app para não perder a vez.";

type Props = {
  visible: boolean;
  onClose: (dontShowAgain: boolean) => void;
};

// Modal informativo exibido ao entrar na fila (dismissível, com "não mostrar
// novamente"). O mesmo texto fica disponível sob demanda no ícone "i" da fila.
export function QueueDisclaimerModal({ visible, onClose }: Props) {
  const [dontShow, setDontShow] = useState(false);
  const { cores, veu } = useTema();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => onClose(dontShow)}
    >
      <Box flex={1} bg={veu} justifyContent="center" px={24}>
        <VStack bg="$painel" borderRadius="$hero" p="$6" style={floatingShadow}>
          <HStack alignItems="center" gap="$2.5" mb="$3">
            <Info size={24} color={cores.textPrimary} />
            {/* Titulo em `forest`, nao no preto padrao do Heading: o Pencil
                nao usa preto em lugar nenhum. */}
            <Text
              fontFamily="$display"
              fontSize={fs(19)}
              lineHeight={fs(23)}
              letterSpacing={-0.4}
              color="$brandTextPrimary"
              flex={1}
            >
              {QUEUE_DISCLAIMER_TITLE}
            </Text>
          </HStack>

          <Text size="sm" lineHeight={fs(22)} color="$brandTextSecondary">
            {QUEUE_DISCLAIMER_TEXT}
          </Text>

          <TouchableOpacity
            onPress={() => setDontShow((v) => !v)}
            hitSlop={8}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: dontShow }}
            accessibilityLabel="Não mostrar novamente"
            testID="dont-show-again"
          >
            <HStack alignItems="center" gap="$2.5" mt="$4">
              {/* Marcado = quadrado CHEIO de brand-green com o check em
                  forest. Era forest com check branco: branco sobre
                  verde-escuro e a paleta anterior, e o par da marca sobre
                  qualquer verde e sempre forest/brand-green. */}
              <Center
                w={26}
                h={26}
                borderRadius="$sm"
                borderWidth={dontShow ? 0 : 2}
                borderColor="$brandBorder"
                bg={dontShow ? "$brandGreen" : "transparent"}
              >
                {dontShow && <Check size={16} color={cores.onGreen} strokeWidth={3} />}
              </Center>
              <Text
                size="sm"
                fontWeight={dontShow ? "$semibold" : "$normal"}
                color={dontShow ? "$brandTextPrimary" : "$brandTextSecondary"}
              >
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
