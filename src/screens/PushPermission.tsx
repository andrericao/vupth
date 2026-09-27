import { TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { VStack, HStack, Text, Center, ScrollView } from "@gluestack-ui/themed";
import { BellRing, Check } from "lucide-react-native";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { Button } from "@components/Button";
import { useFirstRunStore } from "@stores/firstRunStore";

const PROMESSAS = [
  "Avisamos faltando 2 pessoas",
  "Avisamos quando for sua vez",
  "Nada além disso",
];

/**
 * Contexto ANTES do alerta do sistema (Pencil CLIENT · 10 Permissao).
 *
 * O alerta nativo aparece UMA vez: quem nega ali nao pode mais ser perguntado
 * pelo app — teria de ir nas configuracoes do celular. Por isso a explicacao
 * vem antes, enquanto ainda da pra convencer, e o titulo diz o BENEFICIO
 * ("pode fechar o app") em vez do mecanismo ("ative as notificacoes").
 *
 * A terceira promessa — "nada alem disso" — e o que responde a desconfianca
 * real de quem ja levou spam de outro app.
 */
export function PushPermission() {
  const navigation = useNavigation<AppNavigatorRoutesProps>();
  const markPushAsked = useFirstRunStore((s) => s.markPushAsked);

  // Os dois caminhos marcam como perguntado: recusar tambem e resposta, e
  // repetir a tela depois seria insistir em cima de um "nao".
  async function finish() {
    await markPushAsked();
    navigation.goBack();
  }

  return (
    // Rolagem obrigatoria (regra do projeto): o circulo de 260px mais a lista
    // de promessas nao cabe em telefone pequeno.
    <ScrollView
      flex={1}
      bg="$brandBackground"
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <VStack flex={1} bg="$brandBackground">
      <Center flex={1} px={16}>
        <Center width={260} height={260} borderRadius={130} bg="$greenTint">
          <BellRing size={92} color="#163300" />
        </Center>
      </Center>

      <VStack px={16} gap="$3">
        <Text
          fontFamily="$display"
          fontSize={36}
          lineHeight={38}
          letterSpacing={-1.4}
          color="$forest"
        >
          PODE FECHAR O APP
        </Text>
        <Text size="md" color="$brandTextSecondary" lineHeight={27}>
          Avisamos quando faltarem 2 pessoas. Sem isso, mantenha o app aberto.
        </Text>
        <VStack gap="$2.5" mt="$1.5">
          {PROMESSAS.map((p) => (
            <HStack key={p} gap="$2.5" alignItems="center">
              <Check size={16} color="#163300" />
              <Text size="sm" fontWeight="$medium" color="$brandTextPrimary">
                {p}
              </Text>
            </HStack>
          ))}
        </VStack>
      </VStack>

      <VStack px={16} pt="$7" pb={32} gap="$3" alignItems="center">
        {/* Nao pedimos a permissao aqui: quem pede e o `usePushRegistration`,
            no login, que e onde o token faz sentido. Esta tela so prepara o
            terreno e marca que a conversa ja aconteceu. */}
        <Button title="Quero ser avisada" onPress={finish} testID="push-accept" />
        <TouchableOpacity onPress={finish} testID="push-skip">
          <Text size="sm" fontWeight="$semibold" color="$brandTextSecondary">
            Prefiro acompanhar pelo app
          </Text>
        </TouchableOpacity>
      </VStack>
      </VStack>
    </ScrollView>
  );
}
