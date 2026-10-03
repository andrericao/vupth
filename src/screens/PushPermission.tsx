import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { BellRing, Check } from "lucide-react-native";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { Button } from "@components/Button";
import { useFirstRunStore } from "@stores/firstRunStore";
import { fs } from "@stores/fonteStore";

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
      className="flex-1 bg-vupth-background"
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-1 bg-vupth-background">
      <View className="flex-1 px-4 items-center justify-center">
        <View className="w-[260px] h-[260px] rounded-[130px] bg-vupth-greenTint items-center justify-center">
          <BellRing size={92} color="#163300" />
        </View>
      </View>

      <View className="px-4 gap-3">
        <Text
          className="font-display text-vupth-forest"
          style={{ fontSize: fs(32), lineHeight: fs(34), letterSpacing: -1.4 }}
        >
          PODE FECHAR O APP
        </Text>
        <Text className="font-body text-md text-vupth-textSecondary" style={{ lineHeight: fs(23) }}>
          Avisamos quando faltarem 2 pessoas. Sem isso, mantenha o app aberto.
        </Text>
        <View className="gap-2.5 mt-1.5">
          {PROMESSAS.map((p) => (
            <View key={p} className="flex-row gap-2.5 items-center">
              <Check size={16} color="#163300" />
              <Text className="font-body text-sm font-medium text-vupth-textPrimary">
                {p}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View className="px-4 pt-7 pb-8 gap-3 items-center">
        {/* Nao pedimos a permissao aqui: quem pede e o `usePushRegistration`,
            no login, que e onde o token faz sentido. Esta tela so prepara o
            terreno e marca que a conversa ja aconteceu. */}
        <Button title="Quero ser avisada" onPress={finish} testID="push-accept" />
        <TouchableOpacity onPress={finish} testID="push-skip">
          <Text className="font-body text-sm font-semibold text-vupth-textSecondary">
            Prefiro acompanhar pelo app
          </Text>
        </TouchableOpacity>
      </View>
      </View>
    </ScrollView>
  );
}
