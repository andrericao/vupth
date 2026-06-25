import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";

import { useFonts } from "expo-font";
import { Roboto_400Regular, Roboto_700Bold } from "@expo-google-fonts/roboto";
import { GluestackUIProvider } from "@gluestack-ui/themed";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { config } from "./config/gluestack-ui.config";

import { Routes } from "@routes/index";

import { Loading } from "@components/Loading";
import { useAuthStore } from "@stores/authStore";
import { useQueueStore } from "@stores/queueStore";
import { useQueueNotifications } from "@hooks/useQueueNotifications";

const queryClient = new QueryClient();

export default function App() {
  const [fontsLoaded] = useFonts({ Roboto_400Regular, Roboto_700Bold });
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const restoreQueue = useQueueStore((s) => s.restoreQueue);
  const activeQueue = useQueueStore((s) => s.activeQueue);

  useEffect(() => {
    restoreSession();
    restoreQueue();
  }, [restoreSession, restoreQueue]);

  // Notificacao pessoal "é a sua vez" (WebSocket) app-wide: vale em qualquer
  // tela enquanto houver fila ativa, nao so na QueueStatus (item #5, fatia 2).
  useQueueNotifications(!!activeQueue);

  return (
    <QueryClientProvider client={queryClient}>
      <GluestackUIProvider config={config}>
        <StatusBar style="dark" backgroundColor="#FFFFFF" translucent={false} />

        {fontsLoaded ? <Routes /> : <Loading />}
      </GluestackUIProvider>
    </QueryClientProvider>
  );
}
