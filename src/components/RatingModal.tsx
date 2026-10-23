import { useState } from "react";
import { Modal, TouchableOpacity, TextInput, Alert } from "react-native";
import { VStack, HStack, Box, Text, Heading } from "@gluestack-ui/themed";
import { Star } from "lucide-react-native";

import { Button } from "@components/Button";
import { floatingShadow } from "@utils/styles";
import { ratingService } from "@services/ratingService";
import { useAuthStore } from "@stores/authStore";
import { useFeedbackStore } from "@stores/feedbackStore";
import { useRatedStore } from "@stores/ratedStore";
import { mensagemDoErro } from "@domain/erros/mensagemDoErro";
import { useTema } from "@hooks/useTema";

type Props = {
  visible: boolean;
  attendanceId: string | null;
  professionalName?: string;
  onClose: (rated: boolean) => void;
};

// Campo de comentário desativado por ora (Andre 2026-07-11): não precisa agora,
// mas o código fica (só escondido) pra reativar sem retrabalho. Flip para true
// pra mostrar de novo. O submit continua enviando comment (vazio => undefined).
const SHOW_COMMENT = false;

// Avaliação do atendimento (Item 6): 1–5 estrelas + comentário (hoje oculto).
// POST /attendances/{id}/rating. Trata 409 (já avaliado) como concluído.
export function RatingModal({ visible, attendanceId, professionalName, onClose }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { cores, veu } = useTema();
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setScore(0);
    setComment("");
  }

  async function handleSubmit() {
    if (score < 1) {
      Alert.alert("Avaliação", "Escolha de 1 a 5 estrelas.");
      return;
    }
    if (!accessToken || !attendanceId) return;

    setSubmitting(true);
    try {
      await ratingService.submit(
        attendanceId,
        { score, comment: comment.trim() || undefined },
        accessToken,
      );
      await useRatedStore.getState().markRated(attendanceId);
      Alert.alert("Obrigado", "Sua avaliação foi registrada.");
      reset();
      onClose(true);
      // pedido-de-feedback (CLI-34): depois de avaliar, se o intervalo permitir.
      useFeedbackStore.getState().pedir();
    } catch (e: any) {
      const status = e.response?.status;
      const msg =
        status === 409
          ? "Você já avaliou este atendimento."
          : mensagemDoErro(e, "Não foi possível enviar a avaliação. Tente mais tarde.");
      Alert.alert("Avaliação", msg);
      if (status === 409) {
        // 409 = backend confirma que já foi avaliado → marca pra esconder também.
        await useRatedStore.getState().markRated(attendanceId);
        reset();
        onClose(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => onClose(false)}>
      <Box flex={1} bg={veu} justifyContent="center" px={24}>
        <VStack bg="$painel" borderRadius="$card" p="$6" style={floatingShadow}>
          <Heading fontFamily="$heading" fontSize="$lg">
            Como foi seu atendimento?
          </Heading>
          {professionalName ? (
            <Text size="sm" color="$brandTextSecondary" mt="$1">
              {professionalName}
            </Text>
          ) : null}

          <HStack justifyContent="center" gap="$2" mt="$5" mb="$2">
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity key={n} testID={`star-${n}`} onPress={() => setScore(n)} hitSlop={6}>
                {/* [marca-vupth] A marca nao tem dourado, e o pessego
                    ($brandWarning) so existe como FUNDO — sobre branco da
                    1,59:1. A estrela CHEIA carrega a nota, entao vai no texto
                    do tema (forest no claro, 13,93:1); a vazia e so o contorno
                    do que falta escolher e fica no border. */}
                <Star
                  size={36}
                  color={n <= score ? cores.textPrimary : cores.border}
                  fill={n <= score ? cores.textPrimary : "none"}
                />
              </TouchableOpacity>
            ))}
          </HStack>

          {SHOW_COMMENT && (
            <Box borderWidth="$1" borderColor="$brandBorder" borderRadius="$xl" px="$3" py="$2" mt="$4">
              <TextInput
                placeholder="Comentário (opcional)"
                placeholderTextColor={cores.textPlaceholder}
                value={comment}
                onChangeText={setComment}
                multiline
                maxLength={300}
                style={{ minHeight: 60, textAlignVertical: "top", color: cores.textPrimary }}
              />
            </Box>
          )}

          <Button
            title="Enviar avaliação"
            mt="$5"
            isLoading={submitting}
            onPress={handleSubmit}
          />
          <Button title="Agora não" variant="outline" mt="$3" onPress={() => onClose(false)} />
        </VStack>
      </Box>
    </Modal>
  );
}
