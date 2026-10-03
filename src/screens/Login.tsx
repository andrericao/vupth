import { useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { Input2 } from "@components/Input2";
import { ScreenHeader } from "@components/ScreenHeader";
import { Button } from "@components/Button";
import { validateLogin } from "@domain/auth/validateAuth";
import { postAuthRoute } from "@domain/auth/postAuthRoute";
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
    } catch (error: any) {
      const message = error.response?.data?.message || "Erro ao fazer login";
      Alert.alert("Erro", message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSignUp() {
    navigation.navigate("signUp", {
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
      <View className="flex-1 px-4" style={{ paddingBottom: 32 + tabBarInset }}>
        {/* Sem titulo: "OLA DE NOVO" e o heroi da tela, em 34px no corpo. O
            cabecalho aqui existe pelo voltar — e pra que o topo respeite o
            safe-area como em todas as outras telas. */}
        <ScreenHeader />

        <View className="gap-2 mt-3">
          {/* O heroi segue com as medidas do v1 em `style` (34/36, ls -1.5). */}
          <Text
            className="font-display text-vupth-forest"
            style={{ fontSize: fs(34), lineHeight: fs(36), letterSpacing: -1.5 }}
          >
            OLÁ DE NOVO
          </Text>
          <Text className="font-body text-md text-vupth-textSecondary">
            Entre para acompanhar sua fila.
          </Text>
        </View>

        {/* O Pencil desenha "Continuar com Google/Apple" aqui. Nao entrou: o
            backend nao tem OAuth (so /auth/login com e-mail e senha), e botao
            que nao funciona e pior do que botao ausente. Quando o login social
            existir, e neste ponto que ele entra, acima do divisor. */}

        <View className="gap-3 mt-7">
          <View className="gap-1">
            <Input2
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="E-mail"
              value={email}
              onChangeText={(text: string) => { setEmail(text); setErrors({}); }}
            />
            {errors.email && <Text className="font-body text-xs text-vupth-danger">{errors.email}</Text>}
          </View>

          <View className="gap-1">
            <Input2
              isPassword
              placeholder="Senha"
              value={password}
              onChangeText={(text: string) => { setPassword(text); setErrors({}); }}
            />
            {errors.password && <Text className="font-body text-xs text-vupth-danger">{errors.password}</Text>}
          </View>

          <View className="flex-row justify-end">
            <TouchableOpacity onPress={() => navigation.navigate("forgotPassword", { email })}>
              <Text className="font-body text-sm font-semibold text-vupth-textSecondary">
                Esqueci minha senha
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="flex-1 justify-end gap-4">
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
          <View className="flex-row justify-center gap-1.5 items-center">
            <Text className="font-body text-sm text-vupth-textSecondary">
              Ainda não tem conta?
            </Text>
            <TouchableOpacity onPress={handleSignUp} testID="go-signup">
              <Text className="font-heading text-sm text-vupth-forest">
                Criar conta
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
