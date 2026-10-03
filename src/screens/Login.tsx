import { useState } from "react";
import { Alert, TouchableOpacity } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Text, VStack, HStack, ScrollView } from "@gluestack-ui/themed";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { Input2 } from "@components/Input2";
import { ScreenHeader } from "@components/ScreenHeader";
import { Button } from "@components/Button";
import { validateLogin } from "@domain/auth/validateAuth";
import { postAuthRoute } from "@domain/auth/postAuthRoute";
import { AVISO_SEM_CONTA, erroDeAcesso } from "@domain/auth/errosDeAcesso";
import { useAuthStore } from "@stores/authStore";
import { useTabBarInset } from "@hooks/useTabBarInset";
import { fs } from "@stores/fonteStore";

type RouteParams = {
  redirectTo?: string;
  establishmentId?: string;
  professionalId?: string;
  professionalName?: string;
  establishmentName?: string;
  estimatedWaitMinutes?: number;
  serviceItemIds?: string[];
  targetTime?: string;
  establishmentOpen?: boolean;
};

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigation = useNavigation<AppNavigatorRoutesProps>();
  const route = useRoute();
  const tabBarInset = useTabBarInset();
  const params = (route.params as RouteParams) ?? {};
  const login = useAuthStore((s) => s.login);

  async function handleLogin() {
    const result = validateLogin(email, password);

    if (!result.isValid) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      await login(email, password);

      // Mesma regra do cadastro, agora numa funcao so (`postAuthRoute`):
      // quem foi interrompido no meio de entrar numa fila volta pro ponto
      // exato, com a selecao intacta. Eram duas copias que podiam divergir.
      const destino = postAuthRoute(params);
      if (destino.tipo === "reset") {
        navigation.reset({ index: 0, routes: [{ name: "home" }] });
      } else {
        navigation.replace(destino.rota as never, destino.params as never);
      }
    } catch (error) {
      const erro = erroDeAcesso(error, "Erro ao fazer login");
      if (erro.tipo === "sem-conta") {
        // 401 EMAIL_NOT_FOUND: em vez de "senha errada", oferecer o cadastro
        // com o e-mail já digitado (contrato do Backend, 03/10).
        Alert.alert(AVISO_SEM_CONTA.titulo, AVISO_SEM_CONTA.mensagem, [
          { text: AVISO_SEM_CONTA.corrigir, style: "cancel" },
          { text: AVISO_SEM_CONTA.criar, onPress: handleSignUp },
        ]);
      } else if (erro.tipo === "muitas-tentativas") {
        Alert.alert(erro.titulo, erro.mensagem);
      } else {
        Alert.alert("Erro", erro.mensagem);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSignUp() {
    navigation.navigate("signUp", {
      email: email.trim() || undefined,
      redirectTo: params.redirectTo,
      establishmentId: params.establishmentId,
      professionalId: params.professionalId,
      professionalName: params.professionalName,
      establishmentName: params.establishmentName,
      estimatedWaitMinutes: params.estimatedWaitMinutes,
      serviceItemIds: params.serviceItemIds,
      targetTime: params.targetTime,
      establishmentOpen: params.establishmentOpen,
    });
  }

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: "#FFFFFF" }}
    >
      {/* pb soma a faixa da tab bar: estas telas vivem dentro do
          Tab.Navigator, e sem a reserva o CTA do rodape nasce POR BAIXO
          da barra — o toque nao chega nele. */}
      <VStack flex={1} pb={32 + tabBarInset} px={16}>
        {/* Sem titulo: "OLA DE NOVO" e o heroi da tela, em 34px no corpo. O
            cabecalho aqui existe pelo voltar — e pra que o topo respeite o
            safe-area como em todas as outras telas. */}
        <ScreenHeader />

        <VStack gap="$2" mt="$3">
          <Text
            fontFamily="$display"
            fontSize={fs(34)}
            lineHeight={fs(36)}
            letterSpacing={-1.5}
            color="$forest"
          >
            OLÁ DE NOVO
          </Text>
          <Text size="md" color="$brandTextSecondary">
            Entre para acompanhar sua fila.
          </Text>
        </VStack>

        {/* O Pencil desenha "Continuar com Google/Apple" aqui. Nao entrou: o
            backend nao tem OAuth (so /auth/login com e-mail e senha), e botao
            que nao funciona e pior do que botao ausente. Quando o login social
            existir, e neste ponto que ele entra, acima do divisor. */}

        <VStack gap="$3" mt="$7">
          <VStack gap="$1">
            <Input2
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="E-mail"
              value={email}
              onChangeText={(text: string) => { setEmail(text); setErrors({}); }}
            />
            {errors.email && <Text color="$brandDanger" size="xs">{errors.email}</Text>}
          </VStack>

          <VStack gap="$1">
            <Input2
              isPassword
              placeholder="Senha"
              value={password}
              onChangeText={(text: string) => { setPassword(text); setErrors({}); }}
            />
            {errors.password && <Text color="$brandDanger" size="xs">{errors.password}</Text>}
          </VStack>

          <HStack justifyContent="flex-end">
            <TouchableOpacity onPress={() => navigation.navigate("forgotPassword", { email })}>
              <Text size="sm" fontWeight="$semibold" color="$brandTextSecondary">
                Esqueci minha senha
              </Text>
            </TouchableOpacity>
          </HStack>
        </VStack>

        <VStack flex={1} justifyContent="flex-end" gap="$4">
          <Button
            title={isSubmitting ? "Entrando..." : "Entrar"}
            onPress={handleLogin}
            testID="primary-login"
          />
          {/* "Criar conta" vira LINK, nao botao: entrar e o que esta tela pede.
              Dois botoes de peso parecido fazem quem ja tem conta hesitar
              (Andre 2026-08-05: "entrar e cadastrar nao podem ter o mesmo
              peso") — o link leva a decisao ainda mais longe do caminho
              principal, sem esconder. */}
          <HStack justifyContent="center" gap="$1.5" alignItems="center">
            <Text size="sm" color="$brandTextSecondary">
              Ainda não tem conta?
            </Text>
            <TouchableOpacity onPress={handleSignUp} testID="go-signup">
              <Text fontFamily="$heading" fontSize="$sm" color="$forest">
                Criar conta
              </Text>
            </TouchableOpacity>
          </HStack>
        </VStack>
      </VStack>
    </ScrollView>
  );
}
