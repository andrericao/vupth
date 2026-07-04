import { Modal, TouchableOpacity, ScrollView } from "react-native";
import { VStack, HStack, Box, Text, Heading } from "@gluestack-ui/themed";
import { ArrowsLeftRight } from "phosphor-react-native";

import { Button } from "@components/Button";
import { cardShadow } from "@utils/styles";
import { SwapCandidate } from "@domain/queue/swap";

type Props = {
  visible: boolean;
  candidates: SwapCandidate[];
  myPosition: number | null;
  loading: boolean;
  onPropose: (targetAttendanceId: string) => void;
  onClose: () => void;
};

// Item #42 — "Trocar de posição": lista os OUTROS clientes que aguardam na fila
// (anônimos, só a posição). O cliente escolhe um; a troca só efetiva se o outro
// aceitar. Sem multa — a troca não muda o tempo total da fila.
export function SwapProposeModal({ visible, candidates, myPosition, loading, onPropose, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Box flex={1} bg="rgba(0,0,0,0.45)" justifyContent="center" px={24}>
        <VStack bg="$white" borderRadius="$2xl" p="$6" style={cardShadow}>
          <Heading fontFamily="$heading" fontSize="$lg">
            Trocar de posição
          </Heading>
          <Text size="sm" color="$gray300" mt="$1">
            {myPosition != null ? `Você está na posição ${myPosition}. ` : ""}
            Escolha com quem quer trocar. A troca só acontece se o outro cliente aceitar — sem multa.
          </Text>

          {candidates.length === 0 ? (
            <Text size="sm" color="$gray300" mt="$5" textAlign="center">
              Não há outros clientes aguardando na fila agora.
            </Text>
          ) : (
            <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
              <VStack gap="$2" mt="$4">
                {candidates.map((c) => (
                  <TouchableOpacity
                    key={c.attendanceId}
                    disabled={loading}
                    onPress={() => onPropose(c.attendanceId)}
                  >
                    <HStack
                      alignItems="center"
                      gap="$2"
                      borderWidth="$1"
                      borderColor="$green500"
                      borderRadius="$xl"
                      px="$4"
                      py="$3"
                    >
                      <ArrowsLeftRight size={18} color="#009E6F" />
                      <Text fontFamily="$heading" fontSize="$md" color="$green600" flex={1}>
                        Posição {c.position}
                      </Text>
                    </HStack>
                  </TouchableOpacity>
                ))}
              </VStack>
            </ScrollView>
          )}

          <Button title="Cancelar" variant="outline" mt="$5" isDisabled={loading} onPress={onClose} />
        </VStack>
      </Box>
    </Modal>
  );
}
