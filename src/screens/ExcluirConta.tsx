import { TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { VStack, Text, Box, ScrollView } from "@gluestack-ui/themed";

import { ScreenHeader } from "@components/ScreenHeader";
import { CONTATO_DO_TITULAR } from "@screens/Terms";
import { fs } from "@stores/fonteStore";
import type { AppNavigatorRoutesProps } from "@routes/auth.routes";

type Secao = { titulo: string; corpo: string };

/**
 * /excluir-conta na web (paginas-legais, Evolucao Degrau 1, 08/10): a Play
 * Store pede uma URL onde o titular pede a exclusao SEM o app instalado. Vale
 * para os dois apps. A exclusao em si continua a do Perfil (senha atual,
 * DeleteAccountModal) — que na web ja funciona.
 *
 * ⚠️ RASCUNHO juridico, como a tela de Termos: o contato espera o Andre.
 */
export const COMO_EXCLUIR: Secao[] = [
  {
    titulo: "No app do cliente",
    corpo: "Perfil → Deletar conta. Para confirmar que é você, digite a sua senha atual.",
  },
  {
    titulo: "No app do profissional (VUPTH Parceiros)",
    corpo: "Conta → Deletar conta, também com a senha atual.",
  },
  {
    titulo: "Pela web, sem o app",
    corpo:
      "Entre na sua conta em vupth.pages.dev e vá em Perfil → Deletar conta. O botão abaixo leva até lá.",
  },
  {
    titulo: "Sem acesso à conta",
    corpo: `Escreva para ${CONTATO_DO_TITULAR} do e-mail cadastrado, pedindo a exclusão.`,
  },
  {
    titulo: "O que é apagado",
    corpo:
      "Seus dados pessoais: nome, e-mail, telefone, endereço e foto. Os atendimentos que você já fez continuam no histórico do profissional, sem o seu nome, porque são também dele e do estabelecimento.",
  },
];

export function ExcluirConta() {
  const navigation = useNavigation<AppNavigatorRoutesProps>();

  return (
    <ScrollView
      flex={1}
      bg="$brandBackground"
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      <Box px={16}>
        <ScreenHeader title="Excluir conta" />
      </Box>

      <VStack px={16} pt={8} gap="$4.5">
        {COMO_EXCLUIR.map((s) => (
          <VStack key={s.titulo} gap="$1.5">
            <Text fontFamily="$heading" fontSize={fs(15)} color="$brandTextPrimary">
              {s.titulo}
            </Text>
            <Text size="xs" color="$brandTextSecondary" lineHeight={fs(20)}>
              {s.corpo}
            </Text>
          </VStack>
        ))}

        {/* O Perfil mostra "Entrar" a quem nao esta logado, e "Deletar conta" a
            quem esta: um botao so serve os dois. */}
        <TouchableOpacity
          onPress={() => navigation.navigate("settings", undefined, { pop: true })}
          accessibilityRole="button"
          testID="ir-para-o-perfil"
        >
          <Box bg="$forest" borderRadius="$full" py={14} alignItems="center">
            <Text fontFamily="$heading" fontSize={fs(14)} color="$brandGreen">
              Ir para o Perfil
            </Text>
          </Box>
        </TouchableOpacity>

        <Text fontFamily="$mono" fontSize={fs(11)} color="$brandTextSecondary" mt="$2">
          Rascunho de 8 de outubro de 2026
        </Text>
      </VStack>
    </ScrollView>
  );
}
