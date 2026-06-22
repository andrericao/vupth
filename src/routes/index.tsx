import { NavigationContainer, DefaultTheme } from "@react-navigation/native";

import { AuthRoutes } from "./auth.routes";

import { gluestackUIConfig } from "config/gluestack-ui.config";
import { Box } from "@gluestack-ui/themed";

const theme = {
	...DefaultTheme,
	colors: {
		...DefaultTheme.colors,
		background: gluestackUIConfig.tokens.colors.white,
	},
};

export function Routes(){
	return(
		<Box flex={1} bg="$white">
		<NavigationContainer theme={theme}>
			<AuthRoutes />
		</NavigationContainer>
		</Box>
	);
}