import { useEffect } from "react";
import { StatusBar } from "react-native";

import { useFonts } from "expo-font";
import { Roboto_400Regular, Roboto_700Bold } from "@expo-google-fonts/roboto";
import { GluestackUIProvider } from "@gluestack-ui/themed";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { config } from "./config/gluestack-ui.config";

import { Routes } from "@routes/index";

import { Loading } from "@components/Loading";
import { useAuthStore } from "@stores/authStore";

const queryClient = new QueryClient();

export default function App() {
  const [fontsLoaded] = useFonts({ Roboto_400Regular, Roboto_700Bold });
  const restoreSession = useAuthStore((s) => s.restoreSession);

  useEffect(() => {
    restoreSession();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GluestackUIProvider config={config}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />

        {fontsLoaded ? <Routes /> : <Loading />}
      </GluestackUIProvider>
    </QueryClientProvider>
  );
}
