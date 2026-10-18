import * as Updates from "expo-updates";
import Constants from "expo-constants";
import { Text } from "@gluestack-ui/themed";

import { commitDoApp, rotuloDaVersao } from "@domain/versao";
import { API_ENV } from "@services/api";

// A versao com o commit do JS que roda (Andre, 03/10 — commit-sem-flag): sem
// login ele so a via no Perfil; agora ela tambem fica no rodape das telas de
// entrada (Boas-vindas e Entrar), sem toque nenhum.
//
// versao-so-nas-configuracoes (Andre, 17/10): o numero fica nos builds de teste
// (a trava da bateria o le aqui); no build de PRODUCAO ele sai das telas de
// entrada e a versao fica so nas configuracoes (Perfil → Versão do app).
export function VersaoDoApp({ testID }: { testID: string }) {
  if (API_ENV === "prod") return null;
  return (
    <Text size="2xs" color="$brandTextSecondary" textAlign="center" testID={testID}>
      {rotuloDaVersao(Updates.runtimeVersion, Updates.createdAt, commitDoApp(Constants.expoConfig?.extra))}
    </Text>
  );
}
