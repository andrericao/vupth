import { useState } from "react";
import { Alert, TouchableOpacity } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ScrollView, Text, VStack, HStack } from "@gluestack-ui/themed";
import { Check, X, TriangleAlert } from "lucide-react-native";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { Input2 } from "@components/Input2";
import { ScreenHeader } from "@components/ScreenHeader";
import { Button } from "@components/Button";
import { PasswordRules } from "@components/PasswordRules";
import { validateSignUp, getPasswordRules } from "@domain/auth/validateAuth";
import { erroDeAcesso } from "@domain/auth/errosDeAcesso";
import { useAuthStore } from "@stores/authStore";
import { useTabBarInset } from "@hooks/useTabBarInset";
import { LinksLegais } from "@components/LinksLegais";
import { fs } from "@stores/fonteStore";
import { useTema } from "@hooks/useTema";

type RouteParams = {
  email?: string;
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

export function SignUp() {
  const { cores } = useTema();
  const navigation = useNavigation<AppNavigatorRoutesProps>();
  const route = useRoute();
  const tabBarInset = useTabBarInset();
  const params = (route.params as RouteParams) ?? {};

  const [email, setEmail] = useState(params.email ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const register = useAuthStore((s) => s.register);
  const login = useAuthStore((s) => s.login);

  // Veio do fluxo da fila? Muda titulo, CTA e o aviso do topo. Sem isso, a
  // tela abriria "NAO PERCA SUA VEZ" pra quem so clicou em "Cadastrar" na
  // Home e nao tem vez nenhuma pra perder.
  const fromQueue = !!params.professionalId || params.redirectTo === "queueStatus";

  const passwordRules = getPasswordRules(password);
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  async function handleSignUp() {
    const result = validateSignUp(email, password, confirmPassword);

    if (!result.isValid) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      await register(email, password);
      await login(email, password);

      // Antes de mandar pro destino, PEDE O NOME. O cadastro so coleta
      // e-mail e senha, e nenhuma tela depois pergunta — sem isso a pessoa
      // chega na fila e o profissional ve "Cliente" no card, sem saber quem
      // chamar. A tela e pulavel; o destino original vai junto nos params e
      // ela termina exatamente onde este cadastro terminaria.
      navigation.replace("completeProfile", {
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
    } catch (error) {
      const erro = erroDeAcesso(error, "Erro ao cadastrar");
      if (erro.tipo === "muitas-tentativas") Alert.alert(erro.titulo, erro.mensagem);
      else Alert.alert("Erro", erro.tipo === "outro" ? erro.mensagem : "Erro ao cadastrar");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleLogin() {
    navigation.navigate("login", {
      redirectTo: params.redirectTo,
      establishmentId: params.establishmentId,
      professionalId: params.professionalId,
      professionalName: params.professionalName,
      establishmentName: params.establishmentName,
      estimatedWaitMinutes: params.estimatedWaitMinutes,
      serviceItemIds: params.serviceItemIds,
      targetTime: params.targetTime,
    }, { pop: true });
  }

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: cores.background }}
    >
      {/* pb soma a faixa da tab bar: estas telas vivem dentro do
          Tab.Navigator, e sem a reserva o CTA do rodape nasce POR BAIXO
          da barra — o toque nao chega nele. */}
      <VStack flex={1} pb={32 + tabBarInset} px={16}>
        {/* Sem titulo: o heroi ("NAO PERCA SUA VEZ") fica no corpo, em 32px.
            "Agora nao" so no fluxo da fila: e a saida de quem foi interrompido
            no meio de uma acao. Quem veio pela Home ja tem o voltar, e um
            segundo escape ali so polui. */}
        <ScreenHeader
          action={
            fromQueue ? (
              <TouchableOpacity onPress={() => navigation.goBack()} testID="skip-signup">
                <Text size="sm" fontWeight="$semibold" color="$brandTextSecondary">
                  Agora não
                </Text>
              </TouchableOpacity>
            ) : undefined
          }
        />

        <VStack gap="$2.5" mt="$1">
          {/* O aviso da fila e o motivo de a pessoa estar aqui — sem ele o
              titulo "nao perca sua vez" nao teria a que se referir. */}
          {fromQueue && (
            <HStack
              bg="$brandSurfaceAlt"
              borderRadius="$full"
              px={14}
              py={8}
              gap="$2"
              alignItems="center"
              alignSelf="flex-start"
            >
              <TriangleAlert size={15} color={cores.textPrimary} />
              <Text fontFamily="$heading" fontSize={fs(12)} color="$brandTextPrimary">
                {params.professionalName
                  ? `ENTRANDO NA FILA · ${params.professionalName.toUpperCase()}`
                  : "VOCÊ ESTÁ ENTRANDO NA FILA"}
              </Text>
            </HStack>
          )}
          <Text
            fontFamily="$display"
            fontSize={fromQueue ? 32 : 34}
            lineHeight={fromQueue ? 34 : 36}
            letterSpacing={-1.4}
            color="$brandTextPrimary"
          >
            {fromQueue ? "NÃO PERCA SUA VEZ" : "CRIAR CONTA"}
          </Text>
          <Text size="md" color="$brandTextSecondary">
            {fromQueue
              ? "Guarde seu lugar na fila e receba avisos, mesmo trocando de celular."
              : "Em segundos você entra na fila e acompanha sua vez pelo app."}
          </Text>
        </VStack>

        {/* O Pencil desenha "Continuar com Google/Apple" aqui — nao entrou:
            o backend so tem /auth/register com e-mail e senha. */}

        <VStack gap="$3" mt="$6">
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
              placeholder="Crie uma senha"
              value={password}
              onChangeText={(text: string) => { setPassword(text); setErrors({}); }}
            />
            {password.length > 0 && <PasswordRules rules={passwordRules} />}
            {errors.password && <Text color="$brandDanger" size="xs">{errors.password}</Text>}
          </VStack>

          <VStack gap="$1">
            <Input2
              isPassword
              mostrarLimites={false}
              placeholder="Confirmar senha"
              value={confirmPassword}
              onChangeText={(text: string) => { setConfirmPassword(text); setErrors({}); }}
            />
            {passwordsMatch && (
              <HStack alignItems="center" gap="$1" mt="$1">
                <Check size={14} color={cores.textPrimary} />
                <Text size="xs" color="$brandTextPrimary">Senhas conferem</Text>
              </HStack>
            )}
            {passwordsMismatch && (
              <HStack alignItems="center" gap="$1" mt="$1">
                <X size={14} color={cores.danger} />
                <Text size="xs" color="$brandDanger">Senhas não conferem</Text>
              </HStack>
            )}
          </VStack>
        </VStack>

        <VStack flex={1} justifyContent="flex-end" gap="$3" mt="$6">
          <Button
            title={
              isSubmitting
                ? "Criando..."
                : fromQueue
                  ? "Guardar meu lugar"
                  : "Criar conta"
            }
            onPress={handleSignUp}
            testID="primary-signup"
          />
          <Text
            size="2xs"
            color="$brandTextSecondary"
            textAlign="center"
            lineHeight={fs(15)}
          >
            Ao continuar você concorda com os Termos de Uso e a Política de Privacidade.
          </Text>
          <LinksLegais />
          <HStack justifyContent="center" gap="$1.5" alignItems="center">
            <Text size="sm" color="$brandTextSecondary">
              Já tem conta?
            </Text>
            <TouchableOpacity onPress={handleLogin} testID="go-login">
              <Text fontFamily="$heading" fontSize="$sm" color="$brandTextPrimary">
                Entrar
              </Text>
            </TouchableOpacity>
          </HStack>
        </VStack>
      </VStack>
    </ScrollView>
  );
}
