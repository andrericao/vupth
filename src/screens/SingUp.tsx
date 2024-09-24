import { useNavigation } from "@react-navigation/native";

import {Button, ScrollView, Text, Center, VStack, Link, LinkText } from "@gluestack-ui/themed";

import { Input2 } from "@components/Input2";
import { Button as Button2 } from "@components/Button";
import { Header } from "@components/Header";

import { AuthNavigatorRoutesProps } from "@routes/auth.routes";

export function SingUp() {
  const navigation = useNavigation<AuthNavigatorRoutesProps>();

  function handleLogin() {
    navigation.navigate("login");
  }

	function handleServices() {
    navigation.navigate("services");
  }

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <VStack flex={1} px={15} py={60}>
        <Header />

        <Button bg="$transparent" onPress={handleServices}>
					<Text color="$blue700">Serviços</Text>
				</Button>

        <Center gap="$6" mt={220}>
          <Text fontFamily="$heading" fontSize="$3xl">
            Criar Usuário
          </Text>

          <Input2
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="E-mail"
          />

          <Input2 secureTextEntry placeholder="Senha" />
          <Input2 secureTextEntry placeholder="Confirmar senha" />

          <Button2 title="Cadastrar" />
        </Center>

        <Center mt={220} flex={1} justifyContent="flex-end">
          <Text>Já é cadastrado?</Text>
          <Button2
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
