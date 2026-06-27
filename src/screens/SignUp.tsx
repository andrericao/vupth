import { useState } from "react";
import { Alert } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ScrollView, Text, Center, VStack, HStack } from "@gluestack-ui/themed";
import { Check, X } from "phosphor-react-native";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { Input2 } from "@components/Input2";
import { Button } from "@components/Button";
import { Header } from "@components/Header";
import { PasswordRules } from "@components/PasswordRules";
import { validateSignUp, getPasswordRules } from "@domain/auth/validateAuth";
import { useAuthStore } from "@stores/authStore";

type RouteParams = {
  redirectTo?: string;
  establishmentId?: string;
  professionalId?: string;
};

export function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigation = useNavigation<AppNavigatorRoutesProps>();
  const route = useRoute();
  const params = (route.params as RouteParams) ?? {};
  const register = useAuthStore((s) => s.register);
  const login = useAuthStore((s) => s.login);

  const passwordRules = getPasswordRules(password);
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  async function handleSignUp() {
    const result = validateSignUp(email, password, confirmPassword);

    if (!result.isValid) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      await register(email, password);
      await login(email, password);

      if (params.redirectTo === "queueStatus" && params.establishmentId && params.professionalId) {
        navigation.replace("queueStatus", {
          establishmentId: params.establishmentId,
          professionalId: params.professionalId,
        });
      } else {
        navigation.reset({ index: 0, routes: [{ name: "home" }] });
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || "Erro ao cadastrar";
      Alert.alert("Erro", message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleLogin() {
    navigation.navigate("login", {
      redirectTo: params.redirectTo,
      establishmentId: params.establishmentId,
      professionalId: params.professionalId,
    });
  }

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <VStack flex={1} px={15} py={60}>
        <Header showBackButton />

        <Center gap="$6" mt={180}>
          <Text fontFamily="$heading" fontSize="$3xl">
            Criar Conta
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
            {password.length > 0 && <PasswordRules rules={passwordRules} />}
            {errors.password && <Text color="$red500" size="xs">{errors.password}</Text>}
          </VStack>

          <VStack w="$full" gap="$1">
            <Input2
              isPassword
              placeholder="Confirmar senha"
              value={confirmPassword}
              onChangeText={(text: string) => { setConfirmPassword(text); setErrors({}); }}
            />
            {passwordsMatch && (
              <HStack alignItems="center" gap="$1" mt="$1">
                <Check size={14} color="#00B37E" weight="bold" />
                <Text size="xs" color="$green500">Senhas conferem</Text>
              </HStack>
            )}
            {passwordsMismatch && (
              <HStack alignItems="center" gap="$1" mt="$1">
                <X size={14} color="#EF4444" weight="bold" />
                <Text size="xs" color="$red500">Senhas não conferem</Text>
              </HStack>
            )}
          </VStack>

          <Button title={isSubmitting ? "Cadastrando..." : "Cadastrar"} onPress={handleSignUp} />
        </Center>

        <Center mt={180} flex={1} justifyContent="flex-end">
          <Text>Já é cadastrado?</Text>
          <Button
            variant="outline"
            mt="$3"
            title="Login"
            onPress={handleLogin}
          />
        </Center>
      </VStack>
    </ScrollView>
  );
}
