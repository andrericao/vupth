import { useState } from "react";
import { Linking, TouchableOpacity } from "react-native";
import { HStack, Text } from "@gluestack-ui/themed";

import { ehNavegador } from "@utils/ehNavegador";
import { APK_NO_AR, ehIOS, linkDeBaixar } from "@domain/divulgacao";
import { raizDoSite } from "@routes/linking";
import { API_ENV } from "@services/api";
import { fs } from "@stores/fonteStore";

const CHAVE = "vupth.faixaBaixarApp.fechada";

// O navegador pode negar o localStorage (aba anonima, dados bloqueados): ai a
// faixa so volta na proxima visita, sem quebrar nada.
function fechadaAntes(): boolean {
  try {
    return globalThis.localStorage?.getItem(CHAVE) === "1";
  } catch {
    return false;
  }
}

function lembrarFechada() {
  try {
    globalThis.localStorage?.setItem(CHAVE, "1");
  } catch {
    // sem armazenamento: so nesta visita
  }
}

/**
 * Faixa do link-de-divulgacao (Andre, 05/10): em toda visita na web, "Baixar o
 * app" ou "Continuar na web", como no mercado. "Continuar" fecha e nao volta.
 * No iPhone nao aparece (nao ha app para iOS); no app, nunca.
 */
export function FaixaBaixarApp({ apkNoAr = APK_NO_AR }: { apkNoAr?: boolean }) {
  const [fechada, setFechada] = useState(fechadaAntes);

  if (!ehNavegador() || !apkNoAr || fechada) return null;
  if (ehIOS(globalThis.navigator?.userAgent)) return null;

  function continuar() {
    lembrarFechada();
    setFechada(true);
  }

  // A faixa e uma peca de divulgacao da marca: forest com texto branco e o botao
  // green, os mesmos nos dois temas. Nao e a surface do escuro nem o textPrimary
  // dele: o texto branco sobre o forest nao troca com o tema.
  return (
    // tema-fixo: faixa forest da divulgacao, a mesma nos dois temas
    <HStack bg="$forest" px={16} py={10} gap="$3" alignItems="center" testID="faixa-baixar-app">
      {/* tema-fixo: branco sobre a faixa forest, nos dois temas */}
      <Text flex={1} color="$white" fontSize={fs(13)}>
        O VUPTH é melhor no app.
      </Text>
      <TouchableOpacity onPress={continuar} accessibilityRole="button" testID="continuar-na-web">
        {/* tema-fixo: branco sobre a faixa forest, nos dois temas */}
        <Text color="$white" fontSize={fs(13)}>
          Continuar na web
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => Linking.openURL(linkDeBaixar(raizDoSite(API_ENV)))}
        accessibilityRole="button"
        testID="baixar-o-app"
      >
        <HStack bg="$brandGreen" borderRadius="$full" px={14} py={6}>
          <Text color="$onGreen" fontFamily="$heading" fontSize={fs(13)}>
            Baixar o app
          </Text>
        </HStack>
      </TouchableOpacity>
    </HStack>
  );
}
