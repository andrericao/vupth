import { Linking, TouchableOpacity } from "react-native";
import { HStack, Text } from "@gluestack-ui/themed";

import { raizDoSite } from "@routes/linking";
import { API_ENV } from "@services/api";

// termos-no-rodape (CLI-5, Andre 15/10): "falta o link de Termos de uso e
// Politica de privacidade no rodape (tela de entrada e Perfil)". As paginas
// legais ja estao no ar no web do Client (/termos e /privacidade) e valem para
// os dois apps — o mesmo par de links do Partner.

export function linkLegal(pagina: "termos" | "privacidade", env: string = API_ENV): string {
  return `${raizDoSite(env)}/${pagina}`;
}

async function abrir(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    // sem navegador: nada a fazer na tela
  }
}

export function LinksLegais() {
  return (
    <HStack justifyContent="center" alignItems="center" gap="$2" testID="links-legais">
      <TouchableOpacity onPress={() => abrir(linkLegal("termos"))} hitSlop={8} accessibilityRole="link" testID="link-termos">
        <Text size="xs" color="$brandTextSecondary" underline>
          Termos de uso
        </Text>
      </TouchableOpacity>
      <Text size="xs" color="$brandTextSecondary">
        ·
      </Text>
      <TouchableOpacity
        onPress={() => abrir(linkLegal("privacidade"))}
        hitSlop={8}
        accessibilityRole="link"
        testID="link-privacidade"
      >
        <Text size="xs" color="$brandTextSecondary" underline>
          Política de privacidade
        </Text>
      </TouchableOpacity>
    </HStack>
  );
}
