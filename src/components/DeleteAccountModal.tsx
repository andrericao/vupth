import { useState } from "react";
import { Modal } from "react-native";
import { VStack, Box, Text, Heading } from "@gluestack-ui/themed";

import { Button } from "@components/Button";
import { Input2 } from "@components/Input2";
import { SaibaMais } from "@components/SaibaMais";
import { floatingShadow } from "@utils/styles";

type Props = {
  visible: boolean;
  isDeleting?: boolean;
  /** Erro vindo do backend (senha errada, bloqueio 409). */
  error?: string | null;
  onConfirm: (currentPassword: string) => void;
  onClose: () => void;
};

/**
 * Confirmação para excluir a conta. Pede a **senha atual** porque o backend
 * passou a exigi-la (2026-08-07): o app fica logado por muito tempo e excluir a
 * conta é irreversível — o token de acesso sozinho não prova que quem pediu é o
 * titular.
 *
 * Corpo de uma linha e "Saiba mais" para o resto (guia de texto, §4.7): o que
 * fica no histórico do profissional e o que não dá para desfazer moram no
 * artigo. A palavra é "Excluir": "Deletar" é a do banco de dados, não a da
 * pessoa.
 *
 * Não dá para usar `Alert.prompt`: ele só existe no iOS.
 *
 * O texto diz o que REALMENTE acontece. O backend anonimiza em vez de destruir:
 * o dado pessoal do titular é apagado e o atendimento sobrevive, porque ele
 * pertence também ao profissional e ao estabelecimento. Prometer "todos os seus
 * dados serão perdidos" (o texto antigo) seria mentira.
 */
export function DeleteAccountModal({ visible, isDeleting, error, onConfirm, onClose }: Props) {
  const [password, setPassword] = useState("");

  function close() {
    setPassword("");
    onClose();
  }

  // Guarda no handler, além do botão desabilitado: é o padrão do projeto e evita
  // depender de o `isDisabled` bloquear o toque de verdade.
  function confirm() {
    if (password.length === 0 || isDeleting) return;
    onConfirm(password);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Box flex={1} bg="rgba(0,0,0,0.45)" justifyContent="center" px={24}>
        <VStack bg="$white" borderRadius="$card" p="$6" gap="$3" style={floatingShadow}>
          <Heading fontFamily="$heading" fontSize="$lg">
            Excluir conta
          </Heading>

          <Text size="sm" color="$brandTextSecondary">
            Seus dados são apagados. Para confirmar, digite a senha.
          </Text>
          <SaibaMais artigo="excluirConta" testID="excluir-conta-saiba-mais" />

          <Input2
            isPassword
            mostrarLimites={false}
            placeholder="Senha atual"
            value={password}
            onChangeText={setPassword}
            testID="delete-account-password"
          />

          {error && (
            <Text size="xs" color="$brandDanger" testID="delete-account-error">
              {error}
            </Text>
          )}

          <Button
            title="Excluir"
            variant="outline"
            borderColor="$brandDanger"
            $active-bg="$brandDangerTint"
            isLoading={isDeleting}
            isDisabled={password.length === 0 || isDeleting}
            testID="delete-account-confirm"
            onPress={confirm}
          />
          <Button title="Cancelar" mt="$1" onPress={close} isDisabled={isDeleting} />
        </VStack>
      </Box>
    </Modal>
  );
}
