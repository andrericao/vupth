import { useEffect, useRef, useState } from "react";
import { Alert, TouchableOpacity } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { VStack, Text, ScrollView } from "@gluestack-ui/themed";

import { AppNavigatorRoutesProps, AppRoutes } from "@routes/auth.routes";
import { ScreenHeader } from "@components/ScreenHeader";
import { Input2 } from "@components/Input2";
import { Button } from "@components/Button";
import { PasswordRules } from "@components/PasswordRules";
import { getPasswordRules } from "@domain/auth/validateAuth";
import { AVISO_SEM_CONTA, erroDeAcesso } from "@domain/auth/errosDeAcesso";
import { authService } from "@services/authService";
import { waitForBackend } from "@services/healthService";
import { useTabBarInset } from "@hooks/useTabBarInset";
import { fs } from "@stores/fonteStore";

const EMAIL_RE = /\S+@\S+\.\S+/;

// Esqueci minha senha (backend fatia 1, 2026-07-22). Fluxo público em 2 passos:
// (1) e-mail → POST /auth/forgot-password (sempre 200, anti-enumeração) envia
// código de 6 dígitos por e-mail; (2) código + nova senha → POST /auth/reset-password.
export function ForgotPassword() {
  const navigation = useNavigation<AppNavigatorRoutesProps>();
  const route = useRoute();
  const tabBarInset = useTabBarInset();
  const params = (route.params ?? {}) as NonNullable<AppRoutes["forgotPassword"]>;

  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState(params.email ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Fases do envio, separadas porque cada uma espera por uma coisa diferente:
  // "waking" = portao de readiness (o Render Free hiberna e a 1a cutucada leva
  // ~50s); "sending" = o POST em si. Sem separar, o botao ficava "Enviando..."
  // por ate 90s e parecia travado (feedback Andre 2026-08-01).
  const [sendPhase, setSendPhase] = useState<"idle" | "waking" | "sending">("idle");
  // Segundos de espera, exibidos enquanto o servidor acorda. Sem o contador a
  // tela fica muda e nada distingue "esperando" de "travado" (feedback Andre
  // 2026-08-05: "continua apenas carregando e nada").
  const [elapsed, setElapsed] = useState(0);
  // Permite desistir no meio do portao de readiness — que, sozinho, pode levar
  // ate 90s antes de o POST sair.
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!isSubmitting) return;
    const startedAt = Date.now();
    const id = setInterval(
      () => setElapsed(Math.round((Date.now() - startedAt) / 1000)),
      1000,
    );
    return () => clearInterval(id);
  }, [isSubmitting]);

  const rules = getPasswordRules(password);
  const allRulesPass = rules.every((r) => r.passed);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canSend = EMAIL_RE.test(email) && !isSubmitting;
  const canReset = code.trim().length === 6 && allRulesPass && passwordsMatch && !isSubmitting;
  // Servidor quente responde em menos de 1s; só depois disso vale dizer que a
  // espera é hibernação — assim o texto não pisca em quem não esperou nada.
  const isWakingServer = sendPhase === "waking" && elapsed >= 3;

  function handleCancel() {
    cancelledRef.current = true;
  }

  async function handleSendCode() {
    if (!canSend) return;
    cancelledRef.current = false;
    setElapsed(0);
    setSendPhase("waking");
    setIsSubmitting(true);
    try {
      // Cold start do Render: acorda a instância antes de enviar — sem isso o
      // request penava até 90s com o botão travado ("intocável") e sem código
      // chegando (feedback Andre 2026-07-23).
      const ready = await waitForBackend({
        // Tentativas CURTAS (o default é 60s). A 1a cutucada já acorda o Render
        // mesmo se o fetch for abortado, então esperar um minuto por tentativa
        // só servia para deixar a tela muda: com 8s o loop cicla e a UI
        // consegue avisar que a espera é o servidor.
        perAttemptMs: 8000,
        isCancelled: () => cancelledRef.current,
      });
      if (cancelledRef.current) return;
      setSendPhase("sending");
      if (!ready) {
        Alert.alert(
          "Sem conexão agora",
          "Não conseguimos conectar agora. Tente novamente em alguns instantes.",
        );
        return;
      }

      const isResend = step === "reset";
      await authService.forgotPassword(email.trim());
      // E-mail sem conta agora volta 404 EMAIL_NOT_FOUND (Backend, 03/10) e
      // cai no catch: a tela não segue para esperar um código que não vem.
      if (isResend) {
        Alert.alert("Código reenviado", "Confira seu e-mail (vale 15 minutos).");
      } else {
        setStep("reset");
      }
    } catch (error: any) {
      // Timeout do POST (SMTP síncrono travado no backend): o pedido PODE ter
      // sido registrado antes de o envio pendurar, então mandamos o cliente
      // para o passo do código em vez de deixá-lo na estaca zero.
      if (error.code === "ECONNABORTED") {
        Alert.alert(
          "O envio demorou para confirmar",
          "Se o e-mail estiver cadastrado, o código ainda pode chegar. Confira sua caixa (e o spam) e, se não vier em alguns minutos, toque em 'Reenviar código'.",
        );
        setStep("reset");
        return;
      }
      const erro = erroDeAcesso(error, "Erro ao enviar o código");
      if (erro.tipo === "sem-conta") {
        Alert.alert(AVISO_SEM_CONTA.titulo, AVISO_SEM_CONTA.mensagem, [
          { text: AVISO_SEM_CONTA.corrigir, style: "cancel" },
          {
            text: AVISO_SEM_CONTA.criar,
            onPress: () => navigation.navigate("signUp", { email: email.trim() }, { pop: true }),
          },
        ]);
      } else if (erro.tipo === "muitas-tentativas") {
        Alert.alert(erro.titulo, erro.mensagem);
      } else {
        Alert.alert("Erro", erro.mensagem);
      }
    } finally {
      setSendPhase("idle");
      setIsSubmitting(false);
    }
  }

  async function handleReset() {
    if (!canReset) return;
    setIsSubmitting(true);
    try {
      await authService.resetPassword(email.trim(), code.trim(), password);
      Alert.alert("Senha redefinida", "Faça login com a sua nova senha.");
      navigation.navigate("login", {}, { pop: true });
    } catch (error: any) {
      const codeErr = error.response?.data?.code;
      const msg =
        codeErr === "RESET_CODE_INVALID"
          ? "Código inválido ou já utilizado. Confira ou peça um novo."
          : codeErr === "RESET_CODE_EXPIRED"
            ? "Código expirado. Toque em 'Reenviar código'."
            : error.response?.data?.message || error.message || "Erro ao redefinir a senha";
      Alert.alert("Erro", msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView flex={1} bg="$brandBackground" contentContainerStyle={{ flexGrow: 1 }}>
      {/* pb soma a faixa da tab bar: estas telas vivem dentro do
          Tab.Navigator, e sem a reserva o CTA do rodape nasce POR BAIXO
          da barra — o toque nao chega nele. */}
      <VStack flex={1} pb={30 + tabBarInset} px={16} bg="$brandBackground">
        {/* Sem titulo no cabecalho: esta e uma tela de ENTRADA, e as tres do
            fluxo (login, cadastro, esqueci a senha) tem o mesmo desenho — o
            voltar sozinho em cima, o heroi em 34px no corpo. Antes o titulo
            morava DENTRO do cabecalho, entao esta era a unica das tres com o
            texto recuado ao lado do botao. */}
        <ScreenHeader />

        <VStack gap="$2" mt="$3">
          {/* O titulo acompanha o PASSO: quem ja recebeu o codigo nao esta
              mais "esquecendo a senha", esta criando uma nova. */}
          <Text
            fontFamily="$display"
            fontSize={fs(34)}
            lineHeight={fs(36)}
            letterSpacing={-1.5}
            color="$forest"
          >
            {step === "email" ? "ESQUECEU A SENHA?" : "NOVA SENHA"}
          </Text>
          <Text size="md" color="$brandTextSecondary">
            {step === "email"
              ? "Manda o e-mail — te ajudamos a voltar em menos de 1 minuto."
              : "Use o código que enviamos e escolha uma senha nova."}
          </Text>
        </VStack>

        <VStack pt={24} flex={1}>

        {step === "email" && (
          /* Campo em cima, CTA ANCORADO no rodape — o mesmo desenho do login e
             do cadastro. Colado no campo, ele deixava metade da tela vazia
             embaixo e a tela parecia inacabada. O `flex-end` interno empurra
             so o botao; o campo fica onde esta. */
          <VStack flex={1} gap="$4">
            <Input2
              placeholder="E-mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <VStack flex={1} justifyContent="flex-end" gap="$4">
            <Button
              title={
                isWakingServer
                  ? "Conectando..."
                  : isSubmitting
                    ? "Enviando..."
                    : "Enviar código"
              }
              onPress={handleSendCode}
              isDisabled={!canSend}
              testID="forgot-send"
            />
            {isWakingServer && (
              <VStack gap="$3">
                <Text size="xs" color="$brandTextSecondary" textAlign="center">
                  Está levando um pouco mais que o normal. Não feche o app.
                </Text>
                <TouchableOpacity onPress={handleCancel} testID="forgot-cancel-wait">
                  <Text size="sm" color="$brandTextSecondary" fontFamily="$heading" textAlign="center">
                    Cancelar espera
                  </Text>
                </TouchableOpacity>
              </VStack>
            )}
            </VStack>
          </VStack>
        )}

        {step === "reset" && (
          <VStack gap="$4">
            <Text size="sm" color="$brandTextSecondary">
              Se o e-mail estiver cadastrado, você receberá um código de 6 dígitos
              (vale 15 minutos). Digite-o abaixo com a nova senha.
            </Text>
            <Input2
              placeholder="Código de 6 dígitos"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
            />
            <VStack gap="$1">
              <Input2
                isPassword
                placeholder="Nova senha"
                value={password}
                onChangeText={setPassword}
              />
              {password.length > 0 && <PasswordRules rules={rules} />}
            </VStack>
            <Input2
              isPassword
              mostrarLimites={false}
              placeholder="Confirmar nova senha"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <Button
              title={isSubmitting ? "Redefinindo..." : "Redefinir senha"}
              onPress={handleReset}
              isDisabled={!canReset}
            />
            <TouchableOpacity onPress={handleSendCode} disabled={isSubmitting}>
              <Text size="sm" color="$forest" fontFamily="$heading" textAlign="center">
                {isWakingServer
                  ? "Conectando..."
                  : isSubmitting
                    ? "Reenviando..."
                    : "Reenviar código"}
              </Text>
            </TouchableOpacity>
          </VStack>
        )}
        </VStack>
      </VStack>
    </ScrollView>
  );
}
