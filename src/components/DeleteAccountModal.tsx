import { useState } from "react";
import { Modal } from "react-native";
import { VStack, Text, Heading } from "@gluestack-ui/themed";

import { Button } from "@components/Button";
import { Input2 } from "@components/Input2";
import { SaibaMais } from "@components/SaibaMais";
import { CaixaDeModal } from "@components/CaixaDeModal";

type Props = {
  visible: boolean;
  isDeleting?: boolean;
  /** Erro vindo do backend (senha errada, bloqueio 409). */
  error?: string | null;
  onConfirm: (currentPassword: string) => void;
  onClose: () => void;
  /** desativar-conta: mesma caixa, outro verbo (reversivel). */
  modo?: "excluir" | "desativar";
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
export function DeleteAccountModal({ visible, isDeleting, error, onConfirm, onClose, modo = "excluir" }: Props) {
  const desativar = modo === "desativar";
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

  const rodape = (
    <VStack gap="$3">
      <Button
        title={desativar ? "Desativar" : "Excluir"}
        variant="outline"
        borderColor="$brandDanger"
        $active-bg="$brandDangerTint"
        isLoading={isDeleting}
        isDisabled={password.length === 0 || isDeleting}
        testID="delete-account-confirm"
        onPress={confirm}
      />
      <Button title="Cancelar" onPress={close} isDisabled={isDeleting} />
    </VStack>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <CaixaDeModal raio="card" gap={12} rodape={rodape}>
        <Heading fontFamily="$heading" fontSize="$lg">
          {desativar ? "Desativar conta" : "Excluir conta"}
        </Heading>

        <Text size="sm" color="$brandTextSecondary">
          {desativar
            ? "Sua conta fica desativada e dá para reativar depois. Para confirmar, digite a senha."
            : "Seus dados são apagados. Para confirmar, digite a senha."}
        </Text>
        {!desativar && <SaibaMais artigo="excluirConta" testID="excluir-conta-saiba-mais" />}

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
      </CaixaDeModal>
    </Modal>
  );
}
