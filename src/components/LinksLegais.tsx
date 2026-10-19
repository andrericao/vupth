import { Linking, TouchableOpacity } from "react-native";
import { HStack, Text } from "@gluestack-ui/themed";

import { raizDoSite } from "@routes/linking";
import { API_ENV } from "@services/api";

// termos-no-rodape (CLI-5, Andre 15/10): "falta o link de Termos de uso e
// Politica de privacidade no rodape (tela de entrada e Perfil)". As paginas
// legais ja estao no ar no web do Client (/termos e /privacidade) e valem para
// os dois apps — o mesmo par de links do Partner.
//
// Fora do navegador (a entrada, o Entrar, o Criar conta) o link abre a pagina da
// web no navegador do sistema. Dentro dele (o Perfil) ja ha as duas telas
// (`terms` e `privacy`), e abrir o site tiraria a pessoa do app para ler o
// mesmo texto: ali quem chama passa `aoAbrir` e navega.

type Pagina = "termos" | "privacidade";

export function linkLegal(pagina: Pagina, env: string = API_ENV): string {
  return `${raizDoSite(env)}/${pagina}`;
}

async function abrir(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    // sem navegador: nada a fazer na tela
  }
}

export function LinksLegais({ aoAbrir }: { aoAbrir?: (pagina: Pagina) => void } = {}) {
  const ir = (pagina: Pagina) => (aoAbrir ? aoAbrir(pagina) : abrir(linkLegal(pagina)));
  return (
    <HStack justifyContent="center" alignItems="center" gap="$2" testID="links-legais">
      <TouchableOpacity onPress={() => ir("termos")} hitSlop={8} accessibilityRole="link" testID="link-termos">
        <Text size="xs" color="$brandTextSecondary" underline>
          Termos de uso
        </Text>
      </TouchableOpacity>
      <Text size="xs" color="$brandTextSecondary">
        ·
      </Text>
      <TouchableOpacity
        onPress={() => ir("privacidade")}
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
