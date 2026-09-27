import { useState } from "react";
import { Alert, TouchableOpacity } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ScrollView, Text, VStack, HStack } from "@gluestack-ui/themed";
import { UserRound } from "lucide-react-native";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { Input2 } from "@components/Input2";
import { Button } from "@components/Button";
import { ScreenHeader } from "@components/ScreenHeader";
import { postAuthRoute, PostAuthParams } from "@domain/auth/postAuthRoute";
import { profileService } from "@services/profileService";
import { useAuthStore } from "@stores/authStore";
import { fs } from "@stores/fonteStore";

/**
 * Pede o NOME, logo depois do cadastro.
 *
 * POR QUE ESTA TELA EXISTE — e nao e cosmetico:
 *
 * O cadastro do cliente pede e-mail e senha, mais nada. Nenhuma tela depois
 * pergunta o nome: o unico lugar que aceita e o "Dados pessoais", dentro do
 * Perfil, onde ninguem entra por conta propria. Resultado: quem se cadastra
 * pelo app e entra na fila chega ao profissional **sem nome** — e o card da
 * fila dele mostra o `clientName`. Sem nome, ele chama "Cliente" em voz alta
 * numa barbearia cheia. Nao da pra atender assim.
 *
 * POR QUE NAO E UM CAMPO NO CADASTRO: quem cria conta no meio do fluxo da fila
 * foi INTERROMPIDO ("nao perca sua vez") — cada campo a mais ali custa gente
 * que desiste no pior momento. Aqui, o cadastro ja terminou: a conta existe,
 * o lugar na fila esta garantido, e o pedido vem com o motivo na frente.
 *
 * DA PRA PULAR de proposito. Sem nome o app funciona (o profissional ve
 * "Cliente"); com nome funciona melhor. Bloquear seria cobrar um dado que nao
 * e obrigatorio pra nada.
 */
export function CompleteProfile() {
  const navigation = useNavigation<AppNavigatorRoutesProps>();
  const route = useRoute();
  const params = (route.params as PostAuthParams) ?? {};

  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  const accessToken = useAuthStore((s) => s.accessToken);
  const updateUser = useAuthStore((s) => s.updateUser);

  // Quem chega aqui vindo da fila tem um motivo mais concreto pra dar o nome:
  // alguem vai chamar por ele daqui a pouco.
  const daFila = params.redirectTo === "queueStatus" || params.redirectTo === "serviceSelection";

  function seguir() {
    const destino = postAuthRoute(params);
    if (destino.tipo === "reset") {
      navigation.reset({ index: 0, routes: [{ name: "home" }] });
      return;
    }
    navigation.replace(destino.rota as never, destino.params as never);
  }

  async function salvar() {
    const limpo = nome.trim();
    if (!limpo || !accessToken) return;

    setSalvando(true);
    try {
      // Mesmo endpoint que o "Dados pessoais" ja usa — nada novo no backend.
      const { data } = await profileService.updateGeneralInfos(
        { first_name: limpo },
        accessToken!,
      );
      await updateUser({ first_name: data.first_name ?? limpo });
      seguir();
    } catch {
      // Falhar aqui NAO pode custar o lugar na fila: o nome e um extra, e o
      // cadastro ja terminou. Avisa e segue pro destino.
      Alert.alert(
        "Não deu para salvar seu nome",
        "Você pode informar depois em Perfil › Dados pessoais.",
        [{ text: "Continuar", onPress: seguir }],
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <ScrollView
      flex={1}
      bg="$brandBackground"
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <VStack flex={1} px={16} pb={32}>
        {/* Sem voltar: a conta JA foi criada. Voltar pro cadastro seria
            oferecer refazer o que ja esta feito. A saida daqui e "Agora nao". */}
        <ScreenHeader root />

        <VStack gap="$2.5" mt="$2">
          <HStack
            bg="$greenTint"
            borderRadius="$full"
            px={14}
            py={8}
            gap="$2"
            alignItems="center"
            alignSelf="flex-start"
          >
            <UserRound size={15} color="#163300" />
            <Text fontFamily="$heading" fontSize={fs(12)} color="$forest">
              CONTA CRIADA
            </Text>
          </HStack>

          <Text
            fontFamily="$display"
            fontSize={fs(34)}
            lineHeight={fs(36)}
            letterSpacing={-1.5}
            color="$forest"
          >
            QUASE LÁ
          </Text>
          <Text size="md" color="$brandTextSecondary" lineHeight={fs(23)}>
            {daFila
              ? "Só o seu nome — é por ele que o profissional vai te chamar."
              : "Só o seu nome, para o profissional saber quem chamar."}
          </Text>
        </VStack>

        <VStack mt="$7">
          <Input2
            placeholder="Como podemos te chamar?"
            value={nome}
            onChangeText={setNome}
            autoCapitalize="words"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={salvar}
            testID="complete-profile-name"
          />
        </VStack>

        <VStack flex={1} justifyContent="flex-end" gap="$3" alignItems="center">
          <Button
            title={salvando ? "Salvando..." : "Continuar"}
            isDisabled={nome.trim().length === 0 || salvando}
            onPress={salvar}
            testID="complete-profile-save"
          />
          {/* Pular e legitimo: sem nome o app funciona. O link some do caminho
              principal sem esconder a saida. */}
          <TouchableOpacity onPress={seguir} disabled={salvando} testID="complete-profile-skip">
            <Text size="sm" fontWeight="$semibold" color="$brandTextSecondary">
              Agora não
            </Text>
          </TouchableOpacity>
        </VStack>
      </VStack>
    </ScrollView>
  );
}
