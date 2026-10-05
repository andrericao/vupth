import { TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { VStack, HStack, Text, Box, Center, ScrollView } from "@gluestack-ui/themed";
import { Users } from "lucide-react-native";

import { goToLoginAfterOnboarding } from "@routes/navigationRef";
import { Button } from "@components/Button";
import { BrandMark } from "@components/BrandMark";
import { VersaoDoApp } from "@components/VersaoDoApp";
import { useFirstRunStore } from "@stores/firstRunStore";
import { useEstablishments } from "@hooks/useEstablishments";
import { isEffectivelyOpen } from "@domain/establishment/types";
import { fs } from "@stores/fonteStore";

/**
 * Abertura do app na PRIMEIRA vez (Pencil CLIENT · 02 Onboarding).
 *
 * Uma tela so, nao um carrossel: o que a pessoa precisa saber pra decidir cabe
 * em uma frase, e cada passo a mais e uma chance de desistir antes de ver o
 * produto.
 */
export function Onboarding() {
  const markOnboardingSeen = useFirstRunStore((s) => s.markOnboardingSeen);
  const insets = useSafeAreaInsets();
  const { data: establishments = [] } = useEstablishments();

  // Prova social com dado REAL: quantas lojas estao abertas agora. O Pencil
  // desenha "1.284 pessoas na fila agora", mas o backend nao expoe contagem
  // global de gente em fila — inventar um numero desses e o tipo de coisa que
  // destroi confianca quando alguem percebe. Se nem isso houver, a linha some.
  const openNow = establishments.filter(isEffectivelyOpen).length;

  // Marcar como visto DESMONTA esta tela e monta o navegador (routes/index).
  // Quem escolheu "entrar" segue pro login assim que ele existir.
  async function go(to: "home" | "login") {
    await markOnboardingSeen();
    if (to === "login") goToLoginAfterOnboarding();
  }

  return (
    // Rolagem obrigatoria (regra do projeto, nasceu de bug em device): a arte
    // tem 330px fixos e num telefone pequeno o texto + os botoes passam da
    // altura util. Sem isso o "Ver filas perto de mim" ficaria inalcancavel.
    <ScrollView
      flex={1}
      bg="$brandBackground"
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <VStack flex={1} bg="$brandBackground">
      {/* O Pencil usa uma foto de barbearia aqui. Nao entrou porque nao ha
          arte de onboarding no projeto — e ir buscar uma foto de banco de
          imagem por conta propria seria escolher a cara da marca sem combinar.
          No lugar, o painel usa o "V" sobre o verde-claro: e material que ja
          e nosso. Quando a arte existir, ela entra neste Box. */}
      <Box px={16} style={{ paddingTop: insets.top + 8 }}>
        <Center height={330} borderRadius={28} overflow="hidden" bg="$greenTint">
          <BrandMark size={104} />
        </Center>
      </Box>

      <VStack flex={1} px={16} pt="$7" gap="$3">
        <Text
          fontFamily="$display"
          fontSize={fs(38)}
          lineHeight={fs(39)}
          letterSpacing={-1.7}
          color="$forest"
        >
          CHEGA DE FILA
        </Text>
        <Text size="md" color="$brandTextSecondary" lineHeight={fs(23)}>
          Veja quem está livre perto de você e entre na fila.
        </Text>
        {openNow > 0 && (
          <HStack gap="$2" alignItems="center" mt="$1">
            <Users size={16} color="#163300" />
            <Text size="sm" fontWeight="$semibold" color="$brandTextPrimary">
              {openNow === 1
                ? "1 lugar aberto agora perto de você"
                : `${openNow} lugares abertos agora perto de você`}
            </Text>
          </HStack>
        )}
      </VStack>

      {/* Esta tela fica FORA do navegador (routes/index): nao ha tab bar nem
          cabecalho reservando as bordas. Sem as insets, no Android de ponta a
          ponta o "Entrar" nascia atras da barra de navegacao do celular e o
          toque nao chegava (Andre, 05/10, no aparelho). */}
      <VStack px={16} gap="$3.5" alignItems="center" style={{ paddingBottom: insets.bottom + 32 }} testID="onboarding-rodape">
        <Button title="Ver filas perto de mim" onPress={() => go("home")} testID="onboarding-start" />
        <HStack gap="$1.5" alignItems="center">
          <Text size="sm" color="$brandTextSecondary">
            Já tem conta?
          </Text>
          <TouchableOpacity onPress={() => go("login")} testID="onboarding-login">
            <Text fontFamily="$heading" fontSize="$sm" color="$forest">
              Entrar
            </Text>
          </TouchableOpacity>
        </HStack>
        <VersaoDoApp testID="versao-entrada" />
      </VStack>
      </VStack>
    </ScrollView>
  );
}
