import { Modal } from "react-native";
import { VStack, Box, Text, Heading } from "@gluestack-ui/themed";

import { Button } from "@components/Button";
import { cardShadow } from "@utils/styles";
import { notifyComingSoon } from "@domain/comingSoon";

type Props = {
  visible: boolean;
  onClose: () => void;
};

// "Agendar atendimento" — UI pronta; os dois caminhos AGUARDAM backend:
// - hoje/mais tarde reusa a intenção de fila com horário-alvo (#40, já existe no
//   backend, só falta conectar aqui);
// - outro dia depende da agenda por dia (disponibilidade do profissional) que
//   ainda não existe. Por ora ambos mostram "em breve" e contabilizam o toque.
export function ScheduleModal({ visible, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Box flex={1} bg="rgba(0,0,0,0.45)" justifyContent="center" px={24}>
        <VStack bg="$white" borderRadius="$2xl" p="$6" style={cardShadow}>
          <Heading fontFamily="$heading" fontSize="$lg">
            Agendar atendimento
          </Heading>
          <Text size="sm" color="$gray300" mt="$1">
            Não vai dar para esperar na fila agora? Manifeste sua intenção para
            mais tarde ou para outro dia.
          </Text>

          <VStack gap="$3" mt="$5">
            <Button
              title="Para hoje, mais tarde"
              onPress={() => {
                notifyComingSoon("agendar_hoje");
                onClose();
              }}
            />
            <Button
              title="Para outro dia"
              variant="outline"
              onPress={() => {
                notifyComingSoon("agendar_outro_dia");
                onClose();
              }}
            />
          </VStack>

          <Button title="Cancelar" variant="outline" mt="$5" onPress={onClose} />
        </VStack>
      </Box>
    </Modal>
  );
}
