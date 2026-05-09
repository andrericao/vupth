import { useState } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ScrollView, Text, Center, VStack } from "@gluestack-ui/themed";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { Input2 } from "@components/Input2";
import { Button } from "@components/Button";
import { Header } from "@components/Header";
import { validateSignUp } from "@domain/auth/validateAuth";
import { setAuthenticated } from "@domain/auth/authState";

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

  const navigation = useNavigation<AppNavigatorRoutesProps>();
  const route = useRoute();
  const params = (route.params as RouteParams) ?? {};

  function handleSignUp() {
    const result = validateSignUp(email, password, confirmPassword);

    if (!result.isValid) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    // TODO: integrar com backend POST /auth/register + auto-login
    setAuthenticated(true);

    if (params.redirectTo === "queueStatus" && params.establishmentId && params.professionalId) {
      navigation.navigate("queueStatus", {
        establishmentId: params.establishmentId,
        professionalId: params.professionalId,
      });
    } else {
      navigation.navigate("home");
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
              secureTextEntry
              placeholder="Senha"
              value={password}
              onChangeText={(text: string) => { setPassword(text); setErrors({}); }}
            />
            {errors.password && <Text color="$red500" size="xs">{errors.password}</Text>}
          </VStack>

          <VStack w="$full" gap="$1">
            <Input2
              secureTextEntry
              placeholder="Confirmar senha"
              value={confirmPassword}
              onChangeText={(text: string) => { setConfirmPassword(text); setErrors({}); }}
            />
            {errors.confirmPassword && <Text color="$red500" size="xs">{errors.confirmPassword}</Text>}
          </VStack>

          <Button title="Cadastrar" onPress={handleSignUp} />
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
