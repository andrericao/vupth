import { Text } from "react-native";
import * as Updates from "expo-updates";
import Constants from "expo-constants";

import { commitDoApp, rotuloDaVersao } from "@domain/versao";

// A versao com o commit do JS que roda (Andre, 03/10 — commit-sem-flag): sem
// login ele so a via no Perfil; agora ela tambem fica no rodape das telas de
// entrada (Boas-vindas e Entrar), sem toque nenhum.
export function VersaoDoApp({ testID }: { testID: string }) {
  return (
    <Text className="font-body text-f10 text-vupth-textSecondary text-center" testID={testID}>
      {rotuloDaVersao(Updates.runtimeVersion, Updates.createdAt, commitDoApp(Constants.expoConfig?.extra))}
    </Text>
  );
}
