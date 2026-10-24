import { useState } from "react";
import { Alert, Modal } from "react-native";

import { Button } from "@components/Button";
import { CaixaDeModal } from "@components/CaixaDeModal";
import { Input2 } from "@components/Input2";
import { reportarProblema } from "@utils/sentry";
import { Heading, VStack } from "@gluestack-ui/themed";

// sentry-feedback-do-usuario (Andre, 24/10), como no Partner: "Reportar problema" em Configuracoes.
// Nome opcional e a mensagem; vai ao Sentry com o ultimo erro e a tela. Complementa o Suporte,
// nao o substitui. So aparece com o Sentry ligado (DSN no build e modulo nativo).
export function ReportarProblema({ visivel, onFechar }: { visivel: boolean; onFechar: () => void }) {
  const [nome, setNome] = useState("");
  const [mensagem, setMensagem] = useState("");

  const fechar = () => {
    setNome("");
    setMensagem("");
    onFechar();
  };

  const enviar = () => {
    const ok = reportarProblema({ mensagem, nome });
    fechar();
    if (ok) Alert.alert("Enviado", "Obrigado. Vamos olhar.");
    else Alert.alert("Não enviou", "Tente de novo ou fale com o Suporte.");
  };

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={fechar}>
      <CaixaDeModal
        gap={12}
        rodape={
          <VStack gap="$3">
            <Button title="Enviar" onPress={enviar} isDisabled={!mensagem.trim()} testID="reportar-enviar" />
            <Button title="Cancelar" variant="outline" onPress={fechar} testID="reportar-cancelar" />
          </VStack>
        }
      >
        <Heading fontFamily="$heading" fontSize="$lg">
          Reportar problema
        </Heading>
        <Input2 placeholder="Seu nome (opcional)" value={nome} onChangeText={setNome} testID="reportar-nome" />
        <Input2
          placeholder="O que aconteceu?"
          value={mensagem}
          onChangeText={setMensagem}
          multiline
          autoCapitalize="sentences"
          testID="reportar-mensagem"
        />
      </CaixaDeModal>
    </Modal>
  );
}
