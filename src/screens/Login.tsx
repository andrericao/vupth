import { useNavigation } from "@react-navigation/native";
import { Text, Center, VStack, ScrollView } from "@gluestack-ui/themed";

import { AuthNavigatorRoutesProps } from "@routes/auth.routes";

import { Input2 } from "@components/Input2";
import { Button as Button2 } from "@components/Button";
import { Header } from "@components/Header";

export function Login() {
  const navigation = useNavigation<AuthNavigatorRoutesProps>();

  function handleSingUp() {
    navigation.navigate("singUp");
  }

  return (
    <ScrollView 
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >

      <VStack flex={1} px={15} py={60}>
        <Header />

        <Center gap="$6" mt={250}>
          <Text fontFamily="$heading" fontSize="$3xl">
            Acessar a conta
          </Text>

          <Input2
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="E-mail"
          />

          <Input2 secureTextEntry placeholder="Senha" />
          <Button2 title="Entrar" />
        </Center>

        <Center mt={250} flex={1} justifyContent="flex-end">
          <Text>Criar conta</Text>
          <Button2
            variant="outline"
            mt="$3"
            title="Cadastrar"
            onPress={handleSingUp}
          />
        </Center>
      </VStack>
    </ScrollView>
  );
}
