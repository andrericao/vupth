import { useMemo } from "react";
import { Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";

import { AuthRoutes } from "./auth.routes";
import { navigationRef, guardarEstadoDaNavegacao, estadoDaNavegacao } from "./navigationRef";
import { linkingWeb } from "./linking";
import { Onboarding } from "@screens/Onboarding";
import { PushPermission } from "@screens/PushPermission";
import { useFirstRunStore } from "@stores/firstRunStore";

import { Box } from "@gluestack-ui/themed";
import { OfflineBanner } from "@components/OfflineBanner";
import { AvisoPreparandoServidor } from "@components/AvisoPreparandoServidor";
import { FaixaBaixarApp } from "@components/FaixaBaixarApp";
import { useTema } from "@hooks/useTema";
import { temaDeNavegacao } from "@utils/temaDeNavegacao";

// A tela de entrada num navegador proprio (bateria 10/10 08:06, 01.01): solta
// direto no NavigationContainer, no Android de ponta a ponta ela media mais que
// a tela e o "Entrar" caia atras da barra do celular — com rodape fixo e com as
// insets, o layout nao mudava um pixel. As telas dentro de um navegador (abas,
// Entrar) medem certo: cada uma e uma tela nativa do tamanho da janela.
const EntradaStack = createNativeStackNavigator();

function Entrada() {
	return (
		<EntradaStack.Navigator screenOptions={{ headerShown: false }}>
			<EntradaStack.Screen name="entrada" component={Onboarding} />
		</EntradaStack.Navigator>
	);
}

export function Routes(){
	// O fundo atras das telas (o tema do navegador) e o `background` do tema:
	// branco no claro, o de antes; no escuro, o do tokens.json.
	const { escuro, cores } = useTema();
	const theme = useMemo(() => temaDeNavegacao(escuro, cores), [escuro, cores]);
	// A abertura vem ACIMA da navegacao de abas de proposito: onboarding com a
	// barra de abas embaixo entrega o app antes de apresenta-lo, e a pessoa
	// simplesmente toca numa aba e pula a conversa. `restored` evita o
	// piscar — sem ele o onboarding apareceria por um frame a cada abertura,
	// ate o SecureStore responder.
	const onboardingSeen = useFirstRunStore((s) => s.onboardingSeen);
	const restored = useFirstRunStore((s) => s.restored);
	const pushOferta = useFirstRunStore((s) => s.pushOferta);

	// As insets ja na primeira pintura (entrar-atras-da-barra): sem as metricas
	// iniciais, o primeiro quadro vinha com inset 0 e o rodape da entrada
	// nascia atras da barra do celular.
	return(
		<SafeAreaProvider initialMetrics={initialWindowMetrics}>
		<Box flex={1} bg="$brandBackground">
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
			{restored && !onboardingSeen ? <Entrada /> : <AuthRoutes />}
		</NavigationContainer>
		{/* Tela 10 (ligar-push-permission): por cima, sem desmontar a fila. */}
		{pushOferta && (
			<Box position="absolute" top={0} bottom={0} left={0} right={0} testID="oferta-de-push">
				<PushPermission />
			</Box>
		)}
		<OfflineBanner />
		<AvisoPreparandoServidor />
		</Box>
		</SafeAreaProvider>
	);
}