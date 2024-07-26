import { StatusBar } from "react-native";

import {
  useFonts,
  Roboto_400Regular,
  Roboto_700Bold,
} from "@expo-google-fonts/roboto";

import { GluestackUIProvider, Center } from "@gluestack-ui/themed";
import { config } from "./config/gluestack-ui.config";

import { Services } from "@screens/Services";

import { Loading } from "@components/Loading";

export default function App() {
  const fontsLoaded = useFonts({ Roboto_400Regular, Roboto_700Bold });

  return (
    <GluestackUIProvider config={config}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {fontsLoaded ? (
        <Center flex={1} bg="$light100">
          <Services />
        </Center>
      ) : (
        <Loading />
      )}
    </GluestackUIProvider>
  );
}
