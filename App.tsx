import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";

import { useFonts } from "expo-font";
import { Poppins_600SemiBold, Poppins_700Bold } from "@expo-google-fonts/poppins";
import { Inter_400Regular, Inter_500Medium, Inter_700Bold } from "@expo-google-fonts/inter";
import { GluestackUIProvider } from "@gluestack-ui/themed";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { config } from "./config/gluestack-ui.config";

import { Routes } from "@routes/index";

import { Loading } from "@components/Loading";
import { PreparingServer } from "@components/PreparingServer";
import { useAuthStore } from "@stores/authStore";
import { useQueueStore } from "@stores/queueStore";
import { useRatedStore } from "@stores/ratedStore";
import { useComingSoonStore } from "@stores/comingSoonStore";
import { useLocationStore } from "@stores/locationStore";
import { useQueueNotifications } from "@hooks/useQueueNotifications";
import { usePushRegistration } from "@hooks/usePushRegistration";
import { setupOnlineManager } from "@hooks/useNetwork";
import { waitForBackend } from "@services/healthService";

// Pausa/retoma as queries conforme a conexao real (netinfo). 1x no boot.
setupOnlineManager();

const queryClient = new QueryClient();

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const restoreQueue = useQueueStore((s) => s.restoreQueue);
  const restoreRated = useRatedStore((s) => s.restoreRated);
  const restoreComingSoon = useComingSoonStore((s) => s.restore);
  const restoreLocation = useLocationStore((s) => s.restoreLocation);
  const activeQueue = useQueueStore((s) => s.activeQueue);
  const [backendReady, setBackendReady] = useState(false);

  useEffect(() => {
    restoreSession();
    restoreQueue();
    restoreRated();
    restoreComingSoon();
    restoreLocation();
    // Portao de readiness (cold start do Render): acorda o backend ANTES de liberar
    // login/cadastro/listagem. A 1a cutucada acorda a instancia; segue mesmo se
    // estourar o teto (chamadas seguintes ja pegam a instancia quente). CLAUDE.md 18c.
    let active = true;
    waitForBackend().finally(() => {
      if (active) setBackendReady(true);
    });
    return () => {
      active = false;
    };
  }, [restoreSession, restoreQueue, restoreRated, restoreComingSoon, restoreLocation]);

  // Notificacao pessoal "é a sua vez" (WebSocket) app-wide: vale em qualquer
  // tela enquanto houver fila ativa, nao so na QueueStatus (item #5, fatia 2).
  useQueueNotifications(!!activeQueue);

  // Push (background/fechado): registra o device (POST /devices) quando autentica
  // e trata o toque. Best-effort/guardado — inerte ate um build COM o modulo
  // nativo de push (expo-notifications).
  usePushRegistration();

  return (
    <QueryClientProvider client={queryClient}>
      <GluestackUIProvider config={config}>
        <StatusBar style="dark" backgroundColor="#FFFFFF" translucent={false} />

        {!fontsLoaded ? <Loading /> : !backendReady ? <PreparingServer /> : <Routes />}
      </GluestackUIProvider>
    </QueryClientProvider>
  );
}
