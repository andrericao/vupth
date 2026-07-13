import { useState } from "react";
import { Alert, TouchableOpacity } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Text, Center, VStack, ScrollView } from "@gluestack-ui/themed";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { Input2 } from "@components/Input2";
import { Button } from "@components/Button";
import { Header } from "@components/Header";
import { validateLogin } from "@domain/auth/validateAuth";
import { notifyComingSoon } from "@domain/comingSoon";
import { useAuthStore } from "@stores/authStore";

type RouteParams = {
  redirectTo?: string;
  establishmentId?: string;
  professionalId?: string;
  professionalName?: string;
  establishmentName?: string;
  estimatedWaitMinutes?: number;
  serviceItemIds?: string[];
  targetTime?: string;
};

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigation = useNavigation<AppNavigatorRoutesProps>();
  const route = useRoute();
  const params = (route.params as RouteParams) ?? {};
  const login = useAuthStore((s) => s.login);

  async function handleLogin() {
    const result = validateLogin(email, password);

    if (!result.isValid) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      await login(email, password);

      if (params.redirectTo === "queueStatus" && params.establishmentId && params.professionalId) {
        navigation.replace("queueStatus", {
          establishmentId: params.establishmentId,
          professionalId: params.professionalId,
          professionalName: params.professionalName,
          establishmentName: params.establishmentName,
          estimatedWaitMinutes: params.estimatedWaitMinutes,
          serviceItemIds: params.serviceItemIds,
          targetTime: params.targetTime,
        });
      } else {
        navigation.reset({ index: 0, routes: [{ name: "home" }] });
      }
    } catch (error: any) {
      const message = error.response?.data?.message || "Erro ao fazer login";
      Alert.alert("Erro", message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSignUp() {
    navigation.navigate("signUp", {
      redirectTo: params.redirectTo,
      establishmentId: params.establishmentId,
      professionalId: params.professionalId,
      professionalName: params.professionalName,
      establishmentName: params.establishmentName,
      estimatedWaitMinutes: params.estimatedWaitMinutes,
      serviceItemIds: params.serviceItemIds,
      targetTime: params.targetTime,
    });
  }

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <VStack flex={1} px={15} py={60}>
        <Header showBackButton />

        <Center gap="$6" mt={200}>
          <Text fontFamily="$heading" fontSize="$3xl">
            Acessar a conta
          </Text>

          <VStack w="$full" gap="$1">
            <Input2
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="E-mail"
              value={email}
              onChangeText={(text: string) => { setEmail(text); setErrors({}); }}
            />
            {errors.email && <Text color="$red500" size="xs">{errors.email}</Text>}
          </VStack>

          <VStack w="$full" gap="$1">
            <Input2
              isPassword
              placeholder="Senha"
              value={password}
              onChangeText={(text: string) => { setPassword(text); setErrors({}); }}
            />
            {errors.password && <Text color="$red500" size="xs">{errors.password}</Text>}
          </VStack>

          <Button title={isSubmitting ? "Entrando..." : "Entrar"} onPress={handleLogin} />

          <TouchableOpacity onPress={() => notifyComingSoon("esqueci_senha")}>
            <Text size="sm" color="$green500" fontFamily="$heading">
              Esqueci minha senha
            </Text>
          </TouchableOpacity>
        </Center>

        <Center mt={200} flex={1} justifyContent="flex-end">
          <Text>Criar conta</Text>
          <Button
            variant="outline"
            mt="$3"
            title="Cadastrar"
            onPress={handleSignUp}
          />
        </Center>
      </VStack>
    </ScrollView>
  );
}
