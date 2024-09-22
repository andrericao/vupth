import { useNavigation } from "@react-navigation/native";
import { Button, Text, Center, VStack } from "@gluestack-ui/themed";

import { AuthNavigatorRoutesProps } from "@routes/auth.routes";

import { Input2 } from "@components/Input2";
import { Button as Button2 } from "@components/Button";

export function Login() {
  const navigation = useNavigation<AuthNavigatorRoutesProps>();

  function handleSingUp() {
    navigation.navigate("singUp");
  }

  return (
    <VStack px={15}>
      <Center gap="$6" mt={300}>
        <Input2
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="E-mail"
        />

        <Input2 secureTextEntry placeholder="Senha" />

        <Button2 title="Acessar" />
        <Button2 title="Login" onPress={handleSingUp} />

      </Center>
    </VStack>
  );
}
