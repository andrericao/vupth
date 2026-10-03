import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { ScreenHeader } from "@components/ScreenHeader";
import { Input2 } from "@components/Input2";
import { Button } from "@components/Button";
import { useAuthStore } from "@stores/authStore";
import { profileService } from "@services/profileService";
import { useLimparAoSair } from "@hooks/useLimparAoSair";

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
  // Volta aos dados do usuario, nao a campos vazios — a tela nasce preenchida.
  useLimparAoSair(() => {
    setFirstName(user?.first_name ?? "");
    setLastName(user?.last_name ?? "");
    setPhone(user?.phone ?? "");
    setBirthDate(user?.birth_date ?? "");
    setGender(user?.gender ?? "");
  });

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

  // NativeWind (DEC-5): mesmas medidas do v1 (px 16, pb 30, pt 24, gaps
  // 16/4/8, botao a 32 dos campos).
  return (
    <ScrollView
      className="flex-1 bg-vupth-background"
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-1 pb-[30px] px-4 bg-vupth-background">
        <ScreenHeader title="DADOS PESSOAIS" />

        <View className="pt-6 flex-1">
          <View className="gap-4">
            <View className="gap-1">
              <Text className="font-body text-sm text-vupth-textSecondary">Nome</Text>
              <Input2 placeholder="Nome" value={firstName} onChangeText={setFirstName} />
            </View>

            <View className="gap-1">
              <Text className="font-body text-sm text-vupth-textSecondary">Sobrenome</Text>
              <Input2 placeholder="Sobrenome" value={lastName} onChangeText={setLastName} />
            </View>

            <View className="gap-1">
              <Text className="font-body text-sm text-vupth-textSecondary">Telefone</Text>
              <Input2
                placeholder="11999998888"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View className="gap-1">
              <Text className="font-body text-sm text-vupth-textSecondary">Data de nascimento</Text>
              <Input2
                placeholder="1990-01-15"
                value={birthDate}
                onChangeText={setBirthDate}
              />
            </View>

            <View className="gap-1">
              <Text className="font-body text-sm text-vupth-textSecondary">Gênero</Text>
              <View className="gap-2">
                {GENDER_OPTIONS.map((g) => (
                  // Sem altura fixa: a de 40 brigava com a minima de 54 do
                  // Button e o "Salvar" subia por cima do "Outro" (print do
                  // Andre, 26/09).
                  <Button
                    key={g}
                    title={GENDER_LABELS[g]}
                    variant={gender === g ? "solid" : "outline"}
                    onPress={() => setGender(g)}
                  />
                ))}
              </View>
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
