import { Platform } from "react-native";
import * as Updates from "expo-updates";

// card-oscila (Andre, 10/10: "ora vejo a avaliacao no card somado a distancia,
// ora esses dois dados somem"): o expo-updates abre no bundle que ja tem e so
// aplica o OTA baixado na abertura SEGUINTE. Depois de instalar o APK ou de
// limpar os dados (o clearState da bateria, a cada etapa), a primeira abertura
// roda o bundle EMBUTIDO do APK — codigo velho, sem a nota e a distancia no
// card, e sem as correcoes da entrada (bateria 10/10 15:32, 01.01). Nessa
// abertura, se ha OTA novo, baixa e recomeca nele na hora.
//
// So no bundle embutido: quem ja roda um OTA recebe o proximo como sempre, sem
// o app reiniciar sozinho no meio do uso.
export async function aplicarOtaNaAbertura(): Promise<boolean> {
  if (Platform.OS === "web" || __DEV__) return false;
  if (!Updates.isEnabled || !Updates.isEmbeddedLaunch) return false;
  try {
    const { isAvailable } = await Updates.checkForUpdateAsync();
    if (!isAvailable) return false;
    const { isNew } = await Updates.fetchUpdateAsync();
    if (!isNew) return false;
    await Updates.reloadAsync();
    return true;
  } catch {
    // Sem rede ou servidor de updates fora: segue no embutido, como antes.
    return false;
  }
}
