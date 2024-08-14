import { StatusBar } from "react-native";

import { useFonts } from "expo-font";
import { Roboto_400Regular, Roboto_700Bold } from "@expo-google-fonts/roboto";

import { GluestackUIProvider } from "@gluestack-ui/themed";
import { config } from "./config/gluestack-ui.config";

//import { Services } from "@screens/Services";
import { ListShops } from "@screens/ListShops";
import { InsideShop } from "@screens/InsideShop";

import { Loading } from "@components/Loading";

export default function App() {
  const [fontsLoaded] = useFonts({ Roboto_400Regular, Roboto_700Bold });

  return (
    <GluestackUIProvider config={config}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {fontsLoaded ? <InsideShop /> : <Loading />}
    </GluestackUIProvider>
  );
}
