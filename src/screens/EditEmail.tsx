import { useState } from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { VStack, Text, ScrollView } from "@gluestack-ui/themed";

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

  return (
    <ScrollView
      flex={1}
      bg="$brandBackground"
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <VStack flex={1} pb={30} px={16} bg="$brandBackground">
        <ScreenHeader title="ALTERAR E-MAIL" />

        <VStack pt={24} flex={1}>

        <VStack gap="$4">
          <VStack gap="$1">
            <Text size="sm" color="$brandTextSecondary">E-mail atual</Text>
            <Text size="md" fontFamily="$heading">{user?.email}</Text>
          </VStack>

          <VStack gap="$1">
            <Text size="sm" color="$brandTextSecondary">Novo e-mail</Text>
            <Input2
              placeholder="novo@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </VStack>
        </VStack>

        <VStack mt="$8">
          <Button
            title={isSaving ? "Salvando..." : "Salvar"}
            onPress={handleSave}
            isDisabled={isSaving}
          />
        </VStack>
        </VStack>
      </VStack>
    </ScrollView>
  );
}
