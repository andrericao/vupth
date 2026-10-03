import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { ScreenHeader } from "@components/ScreenHeader";
import { Input2 } from "@components/Input2";
import { Button } from "@components/Button";
import { useAuthStore } from "@stores/authStore";
import { profileService } from "@services/profileService";
import { useLimparAoSair } from "@hooks/useLimparAoSair";

export function EditEmail() {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const updateTokensAndUser = useAuthStore((s) => s.updateTokensAndUser);

  const [email, setEmail] = useState(user?.email ?? "");
  const [isSaving, setIsSaving] = useState(false);
  // Restaura o e-mail ATUAL, nao vazio: esta tela nasce preenchida, e esvaziar
  // deixaria o campo em branco como se o usuario nao tivesse e-mail.
  useLimparAoSair(() => setEmail(user?.email ?? ""));

  async function handleSave() {
    if (!accessToken || !email.trim()) return;

    if (email === user?.email) {
      navigation.goBack();
      return;
    }

    setIsSaving(true);
    try {
      const { data } = await profileService.updateEmail(email.trim(), accessToken);

      await updateTokensAndUser(data.tokens, { email: data.user.email });

      Alert.alert("Sucesso", "E-mail atualizado!");
      navigation.goBack();
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || "Erro ao atualizar e-mail";
      Alert.alert("Erro", msg);
    } finally {
      setIsSaving(false);
    }
  }

  // NativeWind (DEC-5): primeira tela convertida — mesmas medidas do v1
  // (px 16, pb 30, pt 24; gap $4 = 16, $1 = 4; mt $8 = 32).
  return (
    <ScrollView
      className="flex-1 bg-vupth-background"
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-1 pb-[30px] px-4 bg-vupth-background">
        <ScreenHeader title="ALTERAR E-MAIL" />

        <View className="pt-6 flex-1">
          <View className="gap-4">
            <View className="gap-1">
              <Text className="font-body text-sm text-vupth-textSecondary">E-mail atual</Text>
              <Text className="font-heading text-md text-vupth-textPrimary">{user?.email}</Text>
            </View>

            <View className="gap-1">
              <Text className="font-body text-sm text-vupth-textSecondary">Novo e-mail</Text>
              <Input2
                placeholder="novo@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <Button
            title={isSaving ? "Salvando..." : "Salvar"}
            onPress={handleSave}
            isDisabled={isSaving}
            className="mt-8"
          />
        </View>
      </View>
    </ScrollView>
  );
}
