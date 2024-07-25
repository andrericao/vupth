import { ThemeProvider } from "styled-components/native";
import { StatusBar } from "react-native";
import { NativeBaseProvider } from "native-base";

import { useFonts, Roboto_400Regular, Roboto_700Bold } from "@expo-google-fonts/roboto";

import { THEME }from "@theme/index";

import { Services } from "@screens/Services";

import { Loading } from "@components/Loading";

export default function App() {

  const fontsLoaded = useFonts({ Roboto_400Regular, Roboto_700Bold });

  return (
    <NativeBaseProvider>
      <ThemeProvider theme={ THEME }>
        <StatusBar
          barStyle="dark-content" 
          backgroundColor="transparent"
          translucent
          />

          {fontsLoaded ? <Services /> : <Loading /> }
      </ThemeProvider>
    </NativeBaseProvider>
  );
}