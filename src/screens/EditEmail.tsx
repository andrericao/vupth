import { useState } from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { VStack, Text, Heading } from "@gluestack-ui/themed";

import { Header } from "@components/Header";
import { Input2 } from "@components/Input2";
import { Button } from "@components/Button";
import { useAuthStore } from "@stores/authStore";
import { profileService } from "@services/profileService";

export function EditEmail() {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const updateTokensAndUser = useAuthStore((s) => s.updateTokensAndUser);

  const [email, setEmail] = useState(user?.email ?? "");
  const [isSaving, setIsSaving] = useState(false);

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
    <VStack flex={1} px={15} pt={60} pb={30} bg="$gray700">
      <Header showBackButton />

      <Heading fontFamily="$heading" fontSize="$2xl" mt="$4" mb="$6">
        Alterar E-mail
      </Heading>

      <VStack gap="$4">
        <VStack gap="$1">
          <Text size="sm" color="$gray300">E-mail atual</Text>
          <Text size="md" fontFamily="$heading">{user?.email}</Text>
        </VStack>

        <VStack gap="$1">
          <Text size="sm" color="$gray300">Novo e-mail</Text>
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
  );
}
