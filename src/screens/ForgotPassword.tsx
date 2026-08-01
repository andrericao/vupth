import { useState } from "react";
import { Alert, TouchableOpacity } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { VStack, Heading, Text, ScrollView } from "@gluestack-ui/themed";

import { AppNavigatorRoutesProps, AppRoutes } from "@routes/auth.routes";
import { Header } from "@components/Header";
import { Input2 } from "@components/Input2";
import { Button } from "@components/Button";
import { PasswordRules } from "@components/PasswordRules";
import { getPasswordRules } from "@domain/auth/validateAuth";
import { authService } from "@services/authService";
import { waitForBackend } from "@services/healthService";

const EMAIL_RE = /\S+@\S+\.\S+/;

// Esqueci minha senha (backend fatia 1, 2026-07-22). Fluxo público em 2 passos:
// (1) e-mail → POST /auth/forgot-password (sempre 200, anti-enumeração) envia
// código de 6 dígitos por e-mail; (2) código + nova senha → POST /auth/reset-password.
export function ForgotPassword() {
  const navigation = useNavigation<AppNavigatorRoutesProps>();
  const route = useRoute();
  const params = (route.params ?? {}) as NonNullable<AppRoutes["forgotPassword"]>;

  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState(params.email ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // O Render Free hiberna: a 1a cutucada pode levar ~50s. Sem separar as fases,
  // o botao ficava "Enviando..." por ate 90s e parecia travado (feedback Andre
  // 2026-08-01: "ficou carregando o enviar").
  const [isWakingServer, setIsWakingServer] = useState(false);

  const rules = getPasswordRules(password);
  const allRulesPass = rules.every((r) => r.passed);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canSend = EMAIL_RE.test(email) && !isSubmitting;
  const canReset = code.trim().length === 6 && allRulesPass && passwordsMatch && !isSubmitting;

  async function handleSendCode() {
    if (!canSend) return;
    setIsSubmitting(true);
    try {
      // Cold start do Render: acorda a instância antes de enviar — sem isso o
      // request penava até 90s com o botão travado ("intocável") e sem código
      // chegando (feedback Andre 2026-07-23). O `onAttempt` avisa a UI de que a
      // espera é o servidor acordando, não o app travado.
      const ready = await waitForBackend({
        onAttempt: (attempt) => {
          // A partir da 2a tentativa está claro que a instância dormiu.
          if (attempt >= 2) setIsWakingServer(true);
        },
      });
      setIsWakingServer(false);
      if (!ready) {
        Alert.alert(
          "Servidor demorando",
          "O servidor está demorando para responder. Tente novamente em alguns instantes.",
        );
        return;
      }

      const isResend = step === "reset";
      await authService.forgotPassword(email.trim());
      // Sempre 200 (anti-enumeração) — não revelamos se o e-mail existe.
      if (isResend) {
        Alert.alert("Código reenviado! ✉️", "Confira seu e-mail (vale 15 minutos).");
      } else {
        setStep("reset");
      }
    } catch (error: any) {
      // Timeout do POST (SMTP síncrono travado no backend): o pedido PODE ter
      // sido registrado antes de o envio pendurar, então mandamos o cliente
      // para o passo do código em vez de deixá-lo na estaca zero.
      if (error.code === "ECONNABORTED") {
        Alert.alert(
          "O servidor não respondeu a tempo",
          "Se o e-mail estiver cadastrado, o código ainda pode chegar. Confira sua caixa (e o spam) e, se não vier em alguns minutos, toque em 'Reenviar código'.",
        );
        setStep("reset");
        return;
      }
      const msg = error.response?.data?.message || error.message || "Erro ao enviar o código";
      Alert.alert("Erro", msg);
    } finally {
      setIsWakingServer(false);
      setIsSubmitting(false);
    }
  }

  async function handleReset() {
    if (!canReset) return;
    setIsSubmitting(true);
    try {
      await authService.resetPassword(email.trim(), code.trim(), password);
      Alert.alert("Senha redefinida! 🎉", "Faça login com a sua nova senha.");
      navigation.navigate("login", {});
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
    <ScrollView flex={1} bg="$gray700" contentContainerStyle={{ flexGrow: 1 }}>
      <VStack flex={1} px={15} pt={60} pb={30}>
        <Header showBackButton />

        <Heading fontFamily="$heading" fontSize="$2xl" mt="$4" mb="$2">
          Esqueci minha senha
        </Heading>

        {step === "email" && (
          <VStack gap="$4">
            <Text size="sm" color="$gray300">
              Informe o e-mail da sua conta. Enviaremos um código de 6 dígitos para
              redefinir a senha.
            </Text>
            <Input2
              placeholder="E-mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Button
              title={
                isWakingServer
                  ? "Acordando o servidor..."
                  : isSubmitting
                    ? "Enviando..."
                    : "Enviar código"
              }
              onPress={handleSendCode}
              isDisabled={!canSend}
            />
            {isWakingServer && (
              <Text size="xs" color="$gray400" textAlign="center">
                O servidor hiberna quando fica sem uso e pode levar até 1 minuto para
                responder. Não feche o app.
              </Text>
            )}
          </VStack>
        )}

        {step === "reset" && (
          <VStack gap="$4">
            <Text size="sm" color="$gray300">
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
              <Text size="sm" color="$green500" fontFamily="$heading" textAlign="center">
                {isWakingServer
                  ? "Acordando o servidor..."
                  : isSubmitting
                    ? "Reenviando..."
                    : "Reenviar código"}
              </Text>
            </TouchableOpacity>
          </VStack>
        )}
      </VStack>
    </ScrollView>
  );
}
