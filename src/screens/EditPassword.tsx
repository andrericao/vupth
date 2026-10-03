import { useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { ScreenHeader } from "@components/ScreenHeader";
import { Input2 } from "@components/Input2";
import { Button } from "@components/Button";
import { PasswordRules } from "@components/PasswordRules";
import { getPasswordRules } from "@domain/auth/validateAuth";
import { useAuthStore } from "@stores/authStore";
import { profileService } from "@services/profileService";
import { useLimparAoSair } from "@hooks/useLimparAoSair";

export function EditPassword() {
  const navigation = useNavigation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const updateTokensAndUser = useAuthStore((s) => s.updateTokensAndUser);

  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  // Senha digitada pela metade nao sobrevive a saida da tela. Aqui o estado
  // inicial e vazio mesmo — nao ha valor do usuario a restaurar.
  useLimparAoSair(() => {
    setCurrentPassword("");
    setPassword("");
    setConfirmPassword("");
  });

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

  // NativeWind (DEC-5): mesmas medidas do v1 (px 16, pb 30, pt 24, gaps
  // 16/4, botao a 32 dos campos).
  return (
    <ScrollView
      className="flex-1 bg-vupth-background"
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-1 pb-[30px] px-4 bg-vupth-background">
        <ScreenHeader title="ALTERAR SENHA" />

        <View className="pt-6 flex-1">
          <View className="gap-4">
            <Input2
              isPassword
              placeholder="Senha atual"
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />

            <View className="gap-1">
              <Input2
                isPassword
                placeholder="Nova senha"
                value={password}
                onChangeText={setPassword}
              />
              {password.length > 0 && <PasswordRules rules={rules} />}
            </View>

            <Input2
              isPassword
              placeholder="Confirmar nova senha"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>

          <Button
            title={isSaving ? "Salvando..." : "Salvar"}
            onPress={handleSave}
            isDisabled={!canSave}
            className="mt-8"
          />
        </View>
      </View>
    </ScrollView>
  );
}
