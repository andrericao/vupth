import { Button, Text } from "@gluestack-ui/themed";

import { useNavigation } from "@react-navigation/native";

import { AuthNavigatorRoutesProps } from "@routes/auth.routes";

export function SingUp(){

	const navigation = useNavigation<AuthNavigatorRoutesProps>();

	function handleLogin() {
    navigation.navigate("login");
  }

	return (
		<Button mt={300}
		onPress={handleLogin}
		>
			<Text>Cadastrar</Text>
		</Button>
	);
}