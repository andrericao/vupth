import { useState } from "react";
import { Alert, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { VStack, Text } from "@gluestack-ui/themed";

import { ScreenHeader } from "@components/ScreenHeader";
import { Input2 } from "@components/Input2";
import { Button } from "@components/Button";
import { useAuthStore } from "@stores/authStore";
import { profileService } from "@services/profileService";

const GENDER_OPTIONS = ["MALE", "FEMALE", "NON_BINARY", "OTHERS"] as const;
const GENDER_LABELS: Record<string, string> = {
  MALE: "Masculino",
  FEMALE: "Feminino",
  NON_BINARY: "Não-binário",
  OTHERS: "Outro",
};

export function EditProfile() {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName, setLastName] = useState(user?.last_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [birthDate, setBirthDate] = useState(user?.birth_date ?? "");
  const [gender, setGender] = useState(user?.gender ?? "");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!accessToken) return;
    setIsSaving(true);
    try {
      const payload: Record<string, string> = {};
      if (firstName) payload.first_name = firstName;
      if (lastName) payload.last_name = lastName;
      if (phone) payload.phone = phone;
      if (birthDate) payload.birth_date = birthDate;
      if (gender) payload.gender = gender;

      const { data } = await profileService.updateGeneralInfos(payload, accessToken);

      await updateUser({
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        birth_date: data.birth_date,
        gender: data.gender,
        profile_image_url: data.profile_image_url,
      });

      Alert.alert("Sucesso", "Dados atualizados!");
      navigation.goBack();
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || "Erro ao atualizar";
      Alert.alert("Erro", msg);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
      <VStack flex={1} pb={30} px={16} bg="$brandBackground">
        <ScreenHeader title="DADOS PESSOAIS" />

        <VStack pt={24} flex={1}>

        <VStack gap="$4">
          <VStack gap="$1">
            <Text size="sm" color="$gray300">Nome</Text>
            <Input2 placeholder="Nome" value={firstName} onChangeText={setFirstName} />
          </VStack>

          <VStack gap="$1">
            <Text size="sm" color="$gray300">Sobrenome</Text>
            <Input2 placeholder="Sobrenome" value={lastName} onChangeText={setLastName} />
          </VStack>

          <VStack gap="$1">
            <Text size="sm" color="$gray300">Telefone</Text>
            <Input2
              placeholder="11999998888"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </VStack>

          <VStack gap="$1">
            <Text size="sm" color="$gray300">Data de nascimento</Text>
            <Input2
              placeholder="1990-01-15"
              value={birthDate}
              onChangeText={setBirthDate}
            />
          </VStack>

          <VStack gap="$1">
            <Text size="sm" color="$gray300">Gênero</Text>
            <VStack gap="$2">
              {GENDER_OPTIONS.map((g) => (
                <Button
                  key={g}
                  title={GENDER_LABELS[g]}
                  variant={gender === g ? "solid" : "outline"}
                  onPress={() => setGender(g)}
                  h="$10"
                />
              ))}
            </VStack>
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
