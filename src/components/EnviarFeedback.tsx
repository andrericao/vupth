import { useState } from "react";
import { Alert, Modal, Platform, TextInput } from "react-native";
import Constants from "expo-constants";
import * as Updates from "expo-updates";

import { Button } from "@components/Button";
import { CaixaDeModal } from "@components/CaixaDeModal";
import { ALTURA_MINIMA_DO_CAMPO } from "@components/ReportarProblema";
import { Box, Heading, Text, VStack } from "@gluestack-ui/themed";
import { commitDoApp, rotuloDaVersao } from "@domain/versao";
import { useTema } from "@hooks/useTema";
import { feedbackAppService } from "@services/feedbackAppService";
import { useAuthStore } from "@stores/authStore";

const LIMITE = 1000;

/** A mensagem de cada falha do POST /feedback: o limite diario ganha frase gentil (BAK-14). */
export function mensagemDoFeedback(erro: unknown): string {
  const e = erro as { response?: { status?: number; data?: { code?: string } } } | null;
  if (e?.response?.status === 429 || e?.response?.data?.code === "FEEDBACK_LIMIT") {
    return "Você já mandou bastante feedback hoje. Obrigado! Amanhã você pode enviar mais.";
  }
  return "Não foi possível enviar agora. Tente de novo em instantes.";
}

// feedback-no-app (DEC-167): em Perfil, "Enviar feedback": caixa de texto e enviar, sem sair do app; confirma
// "Obrigado". Sem login, nao aparece (o Perfil so mostra o item logado; aqui o token e conferido de novo).
export function EnviarFeedback({ visivel, onFechar }: { visivel: boolean; onFechar: () => void }) {
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const { cores } = useTema();
  const accessToken = useAuthStore((s) => s.accessToken);

  const fechar = () => {
    setTexto("");
    onFechar();
  };

  const enviar = async () => {
    const text = texto.trim();
    if (!text || !accessToken || enviando) return;
    setEnviando(true);
    try {
      await feedbackAppService.enviar(
        {
          text,
          app: "CLIENT",
          app_version: rotuloDaVersao(Updates.runtimeVersion, null, commitDoApp(Constants.expoConfig?.extra)),
          device: `${Platform.OS} ${Platform.Version}`,
        },
        accessToken,
      );
      fechar();
      Alert.alert("Obrigado!", "Recebemos o seu feedback.");
    } catch (erro) {
      // O texto fica na caixa: quem escreveu nao perde o que digitou.
      Alert.alert("Não enviou", mensagemDoFeedback(erro));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={fechar}>
      <CaixaDeModal
        gap={12}
        rodape={
          <VStack gap="$3">
            <Button
              title="Enviar"
              onPress={enviar}
              isLoading={enviando}
              isDisabled={!texto.trim() || enviando}
              testID="feedback-enviar"
            />
            <Button title="Cancelar" variant="outline" onPress={fechar} isDisabled={enviando} testID="feedback-cancelar" />
          </VStack>
        }
      >
        <Heading fontFamily="$heading" fontSize="$lg">
          Enviar feedback
        </Heading>
        <Text size="sm" color="$brandTextSecondary">
          O app está em teste. Conte o que gostou, o que atrapalhou ou o que falta.
        </Text>
        <Box borderWidth="$1" borderColor="$brandBorder" borderRadius="$xl" px="$3" py="$2">
          <TextInput
            placeholder="Escreva aqui"
            placeholderTextColor={cores.textPlaceholder}
            value={texto}
            onChangeText={setTexto}
            multiline
            maxLength={LIMITE}
            autoCapitalize="sentences"
            style={{ minHeight: ALTURA_MINIMA_DO_CAMPO, textAlignVertical: "top", color: cores.textPrimary }}
            testID="feedback-texto"
          />
        </Box>
      </CaixaDeModal>
    </Modal>
  );
}
