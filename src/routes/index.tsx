import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthRoutes } from "./auth.routes";

import { gluestackUIConfig } from "config/gluestack-ui.config";
import { Box } from "@gluestack-ui/themed";
import { OfflineBanner } from "@components/OfflineBanner";

const theme = {
	...DefaultTheme,
	colors: {
		...DefaultTheme.colors,
		background: gluestackUIConfig.tokens.colors.white,
	},
};

export function Routes(){
	return(
		<SafeAreaProvider>
		<Box flex={1} bg="$white">
		<NavigationContainer theme={theme}>
			<AuthRoutes />
		</NavigationContainer>
		<OfflineBanner />
		</Box>
		</SafeAreaProvider>
	);
}