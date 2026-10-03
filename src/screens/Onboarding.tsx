import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Users } from "lucide-react-native";

import { goToLoginAfterOnboarding } from "@routes/navigationRef";
import { Button } from "@components/Button";
import { BrandMark } from "@components/BrandMark";
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
      className="flex-1 bg-vupth-background"
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      {/* NativeWind (DEC-5): mesmas medidas do v1; o heroi e o corpo seguem
          com tamanho e altura de linha em `style`. */}
      <View className="flex-1 bg-vupth-background">
      {/* O Pencil usa uma foto de barbearia aqui. Nao entrou porque nao ha
          arte de onboarding no projeto — e ir buscar uma foto de banco de
          imagem por conta propria seria escolher a cara da marca sem combinar.
          No lugar, o painel usa o "V" sobre o verde-claro: e material que ja
          e nosso. Quando a arte existir, ela entra nesta caixa. */}
      <View className="px-4 pt-2">
        <View className="h-[330px] rounded-[28px] overflow-hidden bg-vupth-greenTint items-center justify-center">
          <BrandMark size={104} />
        </View>
      </View>

      <View className="flex-1 px-4 pt-7 gap-3">
        <Text
          className="font-display text-vupth-forest"
          style={{ fontSize: fs(38), lineHeight: fs(39), letterSpacing: -1.7 }}
        >
          CHEGA DE FILA
        </Text>
        <Text className="font-body text-md text-vupth-textSecondary" style={{ lineHeight: fs(23) }}>
          Veja quem está livre perto de você e entre na fila.
        </Text>
        {openNow > 0 && (
          <View className="flex-row gap-2 items-center mt-1">
            <Users size={16} color="#163300" />
            <Text className="font-body text-sm font-semibold text-vupth-textPrimary">
              {openNow === 1
                ? "1 lugar aberto agora perto de você"
                : `${openNow} lugares abertos agora perto de você`}
            </Text>
          </View>
        )}
      </View>

      <View className="px-4 pb-8 gap-3.5 items-center">
        <Button title="Ver filas perto de mim" onPress={() => go("home")} testID="onboarding-start" />
        <View className="flex-row gap-1.5 items-center">
          <Text className="font-body text-sm text-vupth-textSecondary">
            Já tem conta?
          </Text>
          <TouchableOpacity onPress={() => go("login")} testID="onboarding-login">
            <Text className="font-heading text-sm text-vupth-forest">
              Entrar
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      </View>
    </ScrollView>
  );
}
