import { Platform } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthRoutes } from "./auth.routes";
import { navigationRef, guardarEstadoDaNavegacao, estadoDaNavegacao } from "./navigationRef";
import { linkingWeb } from "./linking";
import { Onboarding } from "@screens/Onboarding";
import { PushPermission } from "@screens/PushPermission";
import { useFirstRunStore } from "@stores/firstRunStore";

import { gluestackUIConfig } from "config/gluestack-ui.config";
import { Box } from "@gluestack-ui/themed";
import { OfflineBanner } from "@components/OfflineBanner";
import { FaixaBaixarApp } from "@components/FaixaBaixarApp";

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
	const pushOferta = useFirstRunStore((s) => s.pushOferta);

	return(
		<SafeAreaProvider>
		<Box flex={1} bg="$white">
		{/* Na web: "Baixar o app" ou "Continuar na web" (link-de-divulgacao). */}
		<FaixaBaixarApp />
		{/* Na web a navegacao entra no historico do navegador — sem isto o voltar
		    do celular saia do site (ver linking.ts). No aparelho, nada muda. */}
		<NavigationContainer
			ref={navigationRef}
			theme={theme}
			linking={Platform.OS === "web" ? linkingWeb : undefined}
			// No aparelho, remontar (tamanho da fonte) volta a tela em que estava.
			// Na web quem manda e o endereco (linking).
			initialState={Platform.OS === "web" ? undefined : (estadoDaNavegacao() as never)}
			onStateChange={guardarEstadoDaNavegacao}
		>
			{restored && !onboardingSeen ? <Onboarding /> : <AuthRoutes />}
		</NavigationContainer>
		{/* Tela 10 (ligar-push-permission): por cima, sem desmontar a fila. */}
		{pushOferta && (
			<Box position="absolute" top={0} bottom={0} left={0} right={0} testID="oferta-de-push">
				<PushPermission />
			</Box>
		)}
		<OfflineBanner />
		</Box>
		</SafeAreaProvider>
	);
}