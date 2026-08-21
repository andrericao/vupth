import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthRoutes } from "./auth.routes";
import { navigationRef } from "./navigationRef";
import { Onboarding } from "@screens/Onboarding";
import { useFirstRunStore } from "@stores/firstRunStore";

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
	// A abertura vem ACIMA da navegacao de abas de proposito: onboarding com a
	// barra de abas embaixo entrega o app antes de apresenta-lo, e a pessoa
	// simplesmente toca numa aba e pula a conversa. `restored` evita o
	// piscar — sem ele o onboarding apareceria por um frame a cada abertura,
	// ate o SecureStore responder.
	const onboardingSeen = useFirstRunStore((s) => s.onboardingSeen);
	const restored = useFirstRunStore((s) => s.restored);

	return(
		<SafeAreaProvider>
		<Box flex={1} bg="$white">
		<NavigationContainer ref={navigationRef} theme={theme}>
			{restored && !onboardingSeen ? <Onboarding /> : <AuthRoutes />}
		</NavigationContainer>
		<OfflineBanner />
		</Box>
		</SafeAreaProvider>
	);
}