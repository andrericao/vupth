import { useState } from "react";
import { Modal } from "react-native";
import { VStack, Box, Text, Heading } from "@gluestack-ui/themed";

import { Button } from "@components/Button";
import { Input2 } from "@components/Input2";
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
 * Confirmação para apagar a conta. Pede a **senha atual** porque o backend
 * passou a exigi-la (2026-08-07): o app fica logado por muito tempo e apagar a
 * conta é irreversível — o token de acesso sozinho não prova que quem pediu é o
 * titular.
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
            Deletar conta
          </Heading>

          <Text size="sm" color="$gray300">
            Seus dados pessoais serão apagados e você sairá do app. Os atendimentos
            que você já fez continuam no histórico do profissional, sem o seu nome.
          </Text>
          <Text size="sm" color="$gray300">
            Para confirmar que é você, digite sua senha atual.
          </Text>

          <Input2
            isPassword
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
            title={isDeleting ? "Deletando..." : "Deletar minha conta"}
            variant="outline"
            borderColor="$brandDanger"
            $active-bg="$red500"
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
