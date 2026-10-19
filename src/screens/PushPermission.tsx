import { TouchableOpacity } from "react-native";
import { VStack, HStack, Text, Center, ScrollView } from "@gluestack-ui/themed";
import { BellRing, Check } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@components/Button";
import { useFirstRunStore } from "@stores/firstRunStore";
import { fs } from "@stores/fonteStore";
import { recusarAvisoDePush } from "@hooks/ofertaDePush";
import { bordasDaEntrada } from "@utils/bordasDaEntrada";

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
  const markPushAsked = useFirstRunStore((s) => s.markPushAsked);
  // Por cima de tudo, fora do navegador (routes/index): nada reserva as bordas.
  // Sem as insets, no Android de ponta a ponta o "Prefiro acompanhar pelo app"
  // caia atras da barra do celular (print do Andre, 10/10 16h). O mesmo piso
  // da entrada, que tambem fica fora das abas.
  const { top, bottom } = bordasDaEntrada(useSafeAreaInsets());

  // Os dois caminhos marcam como perguntado: recusar tambem e resposta, e
  // repetir a tela depois seria insistir em cima de um "nao". Aceitar deixa o
  // `usePushRegistration` mostrar a caixa do sistema; recusar a dispensa.
  async function aceitar() {
    await markPushAsked();
  }
  async function recusar() {
    await recusarAvisoDePush();
    await markPushAsked();
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
      <VStack flex={1} bg="$brandBackground" style={{ paddingTop: top }}>
      <Center flex={1} px={16}>
        <Center width={260} height={260} borderRadius={130} bg="$greenTint">
          <BellRing size={92} color="#163300" />
        </Center>
      </Center>

      <VStack px={16} gap="$3">
        <Text
          fontFamily="$display"
          fontSize={fs(32)}
          lineHeight={fs(34)}
          letterSpacing={-1.4}
          color="$forest"
        >
          PODE FECHAR O APP
        </Text>
        <Text size="md" color="$brandTextSecondary" lineHeight={fs(23)}>
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

      <VStack px={16} pt="$7" gap="$3" alignItems="center" style={{ paddingBottom: bottom + 32 }} testID="push-rodape">
        {/* Nao pedimos a permissao aqui: quem pede e o `usePushRegistration`,
            assim que esta tela e respondida. Ela aparece na primeira entrada
            numa fila (ligar-push-permission, 05/10), sobre a tela da fila. */}
        <Button title="Avisar" onPress={aceitar} testID="push-accept" />
        <TouchableOpacity onPress={recusar} testID="push-skip">
          <Text size="sm" fontWeight="$semibold" color="$brandTextSecondary">
            Agora não
          </Text>
        </TouchableOpacity>
      </VStack>
      </VStack>
    </ScrollView>
  );
}
