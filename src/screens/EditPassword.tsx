import { useState } from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { VStack, Heading } from "@gluestack-ui/themed";

import { Header } from "@components/Header";
import { Input2 } from "@components/Input2";
import { Button } from "@components/Button";
import { PasswordRules } from "@components/PasswordRules";
import { getPasswordRules } from "@domain/auth/validateAuth";
import { useAuthStore } from "@stores/authStore";
import { profileService } from "@services/profileService";

export function EditPassword() {
  const navigation = useNavigation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const updateTokensAndUser = useAuthStore((s) => s.updateTokensAndUser);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const rules = getPasswordRules(password);
  const allRulesPass = rules.every((r) => r.valid);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canSave = allRulesPass && passwordsMatch && !isSaving;

  async function handleSave() {
    if (!accessToken || !canSave) return;

    setIsSaving(true);
    try {
      const { data } = await profileService.updatePassword(password, accessToken);

      await updateTokensAndUser(data.tokens, {});

      Alert.alert("Sucesso", "Senha atualizada!");
      navigation.goBack();
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || "Erro ao atualizar senha";
      Alert.alert("Erro", msg);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <VStack flex={1} px={15} pt={60} pb={30} bg="$gray700">
      <Header showBackButton />

      <Heading fontFamily="$heading" fontSize="$2xl" mt="$4" mb="$6">
        Alterar Senha
      </Heading>

      <VStack gap="$4">
        <VStack gap="$1">
          <Input2
            isPassword
            placeholder="Nova senha"
            value={password}
            onChangeText={setPassword}
          />
          {password.length > 0 && <PasswordRules rules={rules} />}
        </VStack>

        <VStack gap="$1">
          <Input2
            isPassword
            placeholder="Confirmar nova senha"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        </VStack>
      </VStack>

      <VStack mt="$8">
        <Button
          title={isSaving ? "Salvando..." : "Salvar"}
          onPress={handleSave}
          isDisabled={!canSave}
        />
      </VStack>
    </VStack>
  );
}
