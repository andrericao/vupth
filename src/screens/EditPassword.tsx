import { useState } from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { VStack, ScrollView } from "@gluestack-ui/themed";

import { ScreenHeader } from "@components/ScreenHeader";
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

  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const rules = getPasswordRules(password);
  const allRulesPass = rules.every((r) => r.passed);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canSave = currentPassword.length > 0 && allRulesPass && passwordsMatch && !isSaving;

  async function handleSave() {
    if (!accessToken || !canSave) return;

    setIsSaving(true);
    try {
      const { data } = await profileService.updatePassword(currentPassword, password, accessToken);

      await updateTokensAndUser(data.tokens, {});

      Alert.alert("Sucesso", "Senha atualizada!");
      navigation.goBack();
    } catch (error: any) {
      // 401 CURRENT_PASSWORD_INVALID = senha atual errada (erro de campo; o
      // interceptor deixa passar sem deslogar).
      const code = error.response?.data?.code;
      const msg =
        code === "CURRENT_PASSWORD_INVALID"
          ? "Senha atual incorreta."
          : error.response?.data?.message || error.message || "Erro ao atualizar senha";
      Alert.alert("Erro", msg);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScrollView
      flex={1}
      bg="$brandBackground"
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <VStack flex={1} pb={30} bg="$brandBackground">
        <ScreenHeader title="ALTERAR SENHA" />

        <VStack px={20} pt={24} flex={1}>

        <VStack gap="$4">
          <VStack gap="$1">
            <Input2
              isPassword
              placeholder="Senha atual"
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
          </VStack>

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
      </VStack>
    </ScrollView>
  );
}
