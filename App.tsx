import { ThemeProvider } from "styled-components/native";
import { NativeBaseProvider } from "native-base";

import { Services } from "@screens/Services";

import theme from "@theme/dark_theme";
import { StatusBar } from "react-native";
import { Loading } from "@components/Loading";

export default function App() {

  //const fontsLoaded = useFonts({ Robo })
  return (
    <NativeBaseProvider>
      <ThemeProvider theme={theme}>
        <StatusBar
          barStyle="light-content" 
          backgroundColor="transparent"
          translucent
          />

          <Loading />
        <Services />
      </ThemeProvider>
    </NativeBaseProvider>
  );
}