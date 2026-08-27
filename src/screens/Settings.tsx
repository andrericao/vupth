import { useState, useCallback } from "react";
import { Alert, TouchableOpacity } from "react-native";
import * as Updates from "expo-updates";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  VStack,
  Text,
  Heading,
  Box,
  HStack,
  ScrollView,
  Center,
} from "@gluestack-ui/themed";
import { User, Mail, Lock, MapPin, ChevronRight, LogOut, RefreshCw } from "lucide-react-native";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { ScreenHeader } from "@components/ScreenHeader";
import { nomeDeExibicao } from "@domain/auth/displayName";
import { Button } from "@components/Button";
import { WsDiagnostics } from "@components/WsDiagnostics";
import { DeleteAccountModal } from "@components/DeleteAccountModal";
import { useAuthStore } from "@stores/authStore";
import { useComingSoonStore } from "@stores/comingSoonStore";
import { COMING_SOON_LABELS, ComingSoonFeature } from "@domain/comingSoon";
import { profileService } from "@services/profileService";
import { addressService, AddressResponse } from "@services/addressService";

function MenuItem({
  icon,
  label,
  value,
  onPress,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress: () => void;
  /** Ultima linha do card nao leva divisor. */
  last?: boolean;
}) {
  return (
    <TouchableOpacity onPress={onPress}>
      <HStack px={16} py={15} gap="$3" alignItems="center">
        {icon}
        <VStack flex={1} gap="$0.5">
          <Text size="xs" color="$brandTextSecondary">
            {label}
          </Text>
          {value && (
            <Text size="sm" fontWeight="$semibold" color="$brandTextPrimary" numberOfLines={1}>
              {value}
            </Text>
          )}
        </VStack>
        <ChevronRight size={18} color="#454745" />
      </HStack>
      {!last && <Box height={1} bg="$brandBorder" />}
    </TouchableOpacity>
  );
}

export function Settings() {
  const insets = useSafeAreaInsets();
  const [toquesNaVersao, setToquesNaVersao] = useState(0);
  const navigation = useNavigation<AppNavigatorRoutesProps>();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);

  const [mainAddress, setMainAddress] = useState<AddressResponse | null>(null);

  // Funcionalidades "em breve" mais tocadas primeiro = as que fizeram mais falta.
  const comingSoonCounts = useComingSoonStore((s) => s.counts);
  const awaited = (Object.entries(comingSoonCounts) as [string, number][])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);

  useFocusEffect(
    useCallback(() => {
      if (!accessToken) return;
      addressService.getMain(accessToken)
        .then(({ data }) => setMainAddress(data))
        .catch(() => setMainAddress(null));
    }, [accessToken]),
  );

  // Duas leituras diferentes do mesmo dado, por isso duas variaveis:
  //  · como VALOR da linha "Dados pessoais", vazio e "Não informado" — o campo
  //    existe e esta em branco, e dizer isso e o certo.
  //  · como NOME no topo, "Não informado" vira um nome falso: a pessoa le o
  //    proprio cartao de identidade e nao se reconhece. Sem nome cadastrado o
  //    topo cai no apelido do e-mail, que e sempre alguma coisa dela.
  // (O nome nunca chega a ser pedido: nao existe tela de completar perfil
  //  depois do cadastro. Enquanto ela nao existir, este e o menor mal.)
  const nomeCadastrado = [user?.first_name, user?.last_name].filter(Boolean).join(" ");
  const displayName = nomeCadastrado || "Não informado";
  // Mesma regra da Home, numa funcao so — eram duas copias que ja divergiam
  // (aqui caia no e-mail, la caia no texto de visitante).
  const nomeDoTopo = nomeDeExibicao(user);
  const displayAddress = mainAddress
    ? `${mainAddress.street}, ${mainAddress.number} — ${mainAddress.neighborhood}`
    : "Não informado";
  // Iniciais do nome; sem nome cadastrado, a primeira letra do e-mail — nunca
  // um circulo vazio.
  const initials =
    [user?.first_name, user?.last_name]
      .filter(Boolean)
      .map((n) => n![0]?.toUpperCase())
      .join("") || user?.email?.[0]?.toUpperCase() || "?";

  function handleLogout() {
    Alert.alert("Sair da conta", "Tem certeza que deseja sair da sua conta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          await logout();
          navigation.getParent()?.navigate("homeTab", { screen: "home" });
        },
      },
    ]);
  }

  const [showDelete, setShowDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function openDeleteAccount() {
    setDeleteError(null);
    setShowDelete(true);
  }

  // Contrato novo do backend (2026-08-07): exige a senha atual no corpo. Antes
  // mandávamos DELETE sem corpo e tomávamos 400 — o botão estava quebrado.
  async function handleDeleteAccount(currentPassword: string) {
    if (!accessToken) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await profileService.deleteAccount(accessToken, currentPassword);
      setShowDelete(false);
      await logout();
      // Settings vive na aba Config.; volta para a aba Home (pai = tabs).
      navigation.getParent()?.navigate("homeTab", { screen: "home" });
    } catch (error: any) {
      const code = error.response?.data?.code;
      const msg = error.response?.data?.message;

      if (code === "CURRENT_PASSWORD_INVALID") {
        // 401 de NEGÓCIO: erro de campo, não sessão expirada. O interceptor
        // global já isenta este código de deslogar (ver `api.ts`).
        setDeleteError("Senha incorreta. Confira e tente de novo.");
      } else if (code === "ACCOUNT_DELETE_NOT_ALLOWED") {
        // Bloqueio TEMPORÁRIO. A mensagem do backend diz o que fazer para
        // destravar (sair da fila, encerrar o atendimento, esperar a loja
        // esvaziar) — exibir como veio. Transformar em "não é possível apagar
        // esta conta" reprovaria na publicação das lojas de app.
        setDeleteError(msg ?? "Você tem um atendimento em andamento. Conclua antes de apagar a conta.");
      } else {
        setDeleteError(msg || error.message || "Erro ao deletar conta");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  const [isChecking, setIsChecking] = useState(false);

  async function handleCheckUpdate() {
    setIsChecking(true);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) {
        await Updates.fetchUpdateAsync();
        Alert.alert(
          "Atualização baixada",
          "O app vai reiniciar para aplicar a nova versão.",
          [{ text: "OK", onPress: () => Updates.reloadAsync() }],
        );
      } else {
        Alert.alert("Tudo certo", "Você já está na versão mais recente.");
      }
    } catch {
      Alert.alert(
        "Não foi possível verificar",
        "Atualizações OTA só funcionam no APK de build (não no Expo Go/modo dev).",
      );
    } finally {
      setIsChecking(false);
    }
  }

  const otaInfo = Updates.updateId
    ? `OTA ${Updates.updateId.slice(0, 8)}${Updates.createdAt ? ` · ${Updates.createdAt.toLocaleDateString()} ${Updates.createdAt.toLocaleTimeString()}` : ""}`
    : "bundle embutido (nenhum OTA aplicado)";

  return (
    <ScrollView
      flex={1}
      bg="$brandBackground"
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Cabecalho forest com a identidade (Pencil CLIENT · 14 Perfil): o
          avatar em brand-green e o unico ponto de verde-limao da tela, e ele
          esta sobre fundo escuro — a regra de contraste da marca. */}
      {/* O bloco forest so se justifica quando ha IDENTIDADE pra mostrar
          (avatar, nome, e-mail). Pra visitante ele virava uma faixa escura
          carregando so um titulo — mesmo problema da faixa verde da tela da
          loja. Sem conta, o cabecalho e o mesmo da aba Atendimentos: titulo
          em Archivo sobre o fundo claro. */}
      {isAuthenticated ? (
        <VStack bg="$forest" style={{ paddingTop: insets.top + 24 }} pb={32} px={16} gap="$3" alignItems="center">
          <Center width={88} height={88} borderRadius={44} bg="$brandGreen">
            <Text fontFamily="$display" fontSize={32} color="$forest">
              {initials}
            </Text>
          </Center>
          <VStack gap="$1" alignItems="center">
            <Text fontFamily="$display" fontSize={24} letterSpacing={-0.8} color="$white">
              {nomeDoTopo}
            </Text>
            {user?.email && (
              <Text size="sm" color="$brandGreen">
                {user.email}
              </Text>
            )}
          </VStack>
        </VStack>
      ) : (
        <Box px={16}>
          <ScreenHeader root title="Perfil" />
        </Box>
      )}

      <VStack flex={1} px={16} pt={20} pb={30}>

        {/* Opções de CONTA só para quem tem conta (visitante não vê trocar senha,
            e-mail, endereço nem deletar — boa prática; pedido Andre 2026-07-23). */}
        {isAuthenticated ? (
          <>
            <Box borderRadius="$card" overflow="hidden" bg="$brandSurface">
              <MenuItem
                icon={<User size={20} color="#163300" />}
                label="Dados pessoais"
                value={displayName}
                onPress={() => navigation.navigate("editProfile")}
              />
              <MenuItem
                icon={<Mail size={20} color="#163300" />}
                label="E-mail"
                value={user?.email ?? "—"}
                onPress={() => navigation.navigate("editEmail")}
              />
              <MenuItem
                icon={<Lock size={20} color="#163300" />}
                label="Senha"
                value="••••••"
                onPress={() => navigation.navigate("editPassword")}
              />
              <MenuItem
                icon={<MapPin size={20} color="#163300" />}
                label="Endereços"
                value={displayAddress}
                onPress={() => navigation.navigate("editAddress")}
                last
              />
            </Box>

            {/* Sair NAO e vermelho: e uma saida legitima, nao um erro. O
                vermelho fica reservado pro que e irreversivel (deletar), la
                embaixo. */}
            <TouchableOpacity onPress={handleLogout} testID="logout">
              <HStack
                bg="$brandSurface"
                borderRadius="$card"
                px={16}
                py={15}
                mt="$4"
                gap="$2.5"
                alignItems="center"
              >
                <LogOut size={19} color="#163300" />
                <Text size="sm" fontWeight="$semibold" color="$forest">
                  Sair da conta
                </Text>
              </HStack>
            </TouchableOpacity>
          </>
        ) : (
          /* Pro VISITANTE o convite e o UNICO conteudo da tela. Encostado no
             topo, ele deixava um vazio grande no meio que fazia a tela parecer
             inacabada; centrado, o espaco vira respiro em vez de falta. */
          <Box bg="$brandSurface" borderRadius="$card" p="$4" mt="$6">
            <Text size="sm" color="$brandTextSecondary" mb="$3">
              Você está navegando como visitante. Entre ou crie uma conta para
              gerenciar seu perfil, senha e endereço.
            </Text>
            {/* Mesma hierarquia do Perfil: criar conta é a pílula sólida, entrar
                fica como secundária (Andre 2026-08-05). */}
            <VStack gap="$3">
              <Button
                title="Criar conta grátis"
                onPress={() =>
                  navigation.getParent()?.navigate("homeTab", { screen: "signUp", params: {} })
                }
              />
              <Button
                variant="outline"
                title="Já tenho conta"
                onPress={() =>
                  navigation.getParent()?.navigate("homeTab", { screen: "login", params: {} })
                }
              />
            </VStack>
          </Box>
        )}

        {/* [QA] Contador de toques em "em breve" — instrumentacao do TIME
            ("as mais tocadas fizeram mais falta, priorizar quando o backend
            liberar"). Estava na cara do usuario, contando pra ele o backlog
            interno. Vai pro mesmo gesto do diagnostico de WS: 7 toques na
            versao. */}
        {toquesNaVersao >= 7 && awaited.length > 0 && (
          <VStack mt="$8">
            <Heading fontFamily="$heading" fontSize="$md" mb="$1">
              Funcionalidades aguardadas
            </Heading>
            <Text size="xs" color="$brandTextSecondary" mb="$3">
              As mais tocadas fizeram mais falta — priorizar quando o backend liberar.
            </Text>
            <Box borderRadius="$card" overflow="hidden">
              {awaited.map(([feature, count]) => (
                <HStack
                  key={feature}
                  bg="$brandSurface"
                  px="$4"
                  py="$3"
                  borderBottomWidth="$1"
                  borderBottomColor="$brandBorder"
                  alignItems="center"
                >
                  <Text size="sm" flex={1}>
                    {COMING_SOON_LABELS[feature as ComingSoonFeature] ?? feature}
                  </Text>
                  <Box bg="$greenTint" borderRadius="$full" px="$3" py="$1">
                    <Text size="xs" fontFamily="$heading" color="$forest">
                      {count}×
                    </Text>
                  </Box>
                </HStack>
              ))}
            </Box>
          </VStack>
        )}

        {/* `flex-end` empurra o rodape pro fim: antes ele vinha logo abaixo do
            conteudo e sobrava um vazio grande embaixo, que fazia a tela
            parecer inacabada — principalmente pro VISITANTE, que so tem o
            convite de conta acima. */}
        <VStack flex={1} justifyContent="flex-end" mt="$10" alignItems="center" gap="$3">
          <TouchableOpacity onPress={handleCheckUpdate} testID="check-update">
            <HStack
              bg="$brandSurface"
              borderRadius="$full"
              px={16}
              py={12}
              gap="$2"
              alignItems="center"
            >
              <RefreshCw size={15} color="#163300" />
              <Text fontFamily="$heading" fontSize={13} color="$forest">
                {isChecking ? "Verificando..." : "Verificar atualização"}
              </Text>
            </HStack>
          </TouchableOpacity>
          {/* Versao em DM Mono: e numero de build, nao prosa — o token `mono`
              existe pra isso. */}
          {/* [QA] 7 toques aqui abrem o diagnostico de WebSocket. Ele nasceu
              porque os logs sao gated por `__DEV__` e o QA roda bundle de
              producao, mas estava SOLTO nesta tela: o usuario final via
              "falhou o handshake", contagem de erros e a URL do servidor —
              ruido tecnico pra quem so quer mexer na conta (Alexia
              2026-08-21). Gesto de "modo desenvolvedor": segue acessivel em
              producao, some da vista de quem nao procura. */}
          <TouchableOpacity
            onPress={() => setToquesNaVersao((n) => n + 1)}
            accessibilityRole="button"
            accessibilityLabel="Informações da versão"
            testID="version-line"
          >
          {/* Junta so o que EXISTE: em dev o runtime e o canal vem vazios, e o
              template fixo imprimia "· · bundle embutido", com dois pontos
              orfaos na frente. */}
          <Text fontFamily="$mono" fontSize={10} color="$brandTextSecondary" textAlign="center">
            {[Updates.runtimeVersion, Updates.channel, otaInfo].filter(Boolean).join(" · ")}
          </Text>
          </TouchableOpacity>

          {toquesNaVersao >= 7 && <WsDiagnostics />}

          {/* Deletar conta desce pra ca como LINK: e irreversivel, entao nao
              disputa atencao com o resto — mas continua alcancavel por quem
              procura (era um botao de mesmo peso que "sair"). */}
          <HStack gap="$4" alignItems="center">
            <TouchableOpacity onPress={() => navigation.navigate("terms")} testID="terms">
              <Text size="xs" color="$brandTextSecondary">
                Termos e Privacidade
              </Text>
            </TouchableOpacity>
            {isAuthenticated && (
              <TouchableOpacity onPress={openDeleteAccount} testID="delete-account">
                <Text size="xs" fontWeight="$semibold" color="$brandDanger">
                  Deletar minha conta
                </Text>
              </TouchableOpacity>
            )}
          </HStack>
        </VStack>
      </VStack>

      <DeleteAccountModal
        visible={showDelete}
        isDeleting={isDeleting}
        error={deleteError}
        onConfirm={handleDeleteAccount}
        onClose={() => setShowDelete(false)}
      />
    </ScrollView>
  );
}
