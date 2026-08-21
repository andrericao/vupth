import { useState, useCallback } from "react";
import { Alert, TouchableOpacity } from "react-native";
import * as Updates from "expo-updates";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import {
  VStack,
  Text,
  Heading,
  Box,
  HStack,
  ScrollView,
  Center,
} from "@gluestack-ui/themed";
import {
  User,
  EnvelopeSimple,
  Lock,
  MapPin,
  CaretRight,
  SignOut,
  ArrowsClockwise,
} from "phosphor-react-native";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { Button } from "@components/Button";
import { WsDiagnostics } from "@components/WsDiagnostics";
import { DeleteAccountModal } from "@components/DeleteAccountModal";
import { cardShadow } from "@utils/styles";
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
        <CaretRight size={18} color="#454745" />
      </HStack>
      {!last && <Box height={1} bg="$brandBorder" />}
    </TouchableOpacity>
  );
}

export function Settings() {
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

  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Não informado";
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
      <VStack
        bg="$forest"
        pt={56}
        pb={isAuthenticated ? 32 : 20}
        px={20}
        gap="$3"
        alignItems="center"
      >
        {/* Visitante nao tem identidade pra mostrar — o avatar grande viraria
            um "?" gigante ocupando meia tela. Cabecalho encolhe e o card de
            criar conta, que e a acao real, sobe. */}
        {isAuthenticated ? (
          <>
            <Center width={88} height={88} borderRadius={44} bg="$brandGreen">
              <Text fontFamily="$display" fontSize={32} color="$forest">
                {initials}
              </Text>
            </Center>
            <VStack gap="$1" alignItems="center">
              <Text fontFamily="$display" fontSize={24} letterSpacing={-0.8} color="$white">
                {displayName}
              </Text>
              {user?.email && (
                <Text size="sm" color="$brandGreen">
                  {user.email}
                </Text>
              )}
            </VStack>
          </>
        ) : (
          <Text fontFamily="$display" fontSize={22} letterSpacing={-0.6} color="$white">
            Sua conta
          </Text>
        )}
      </VStack>

      <VStack flex={1} px={20} pt={20} pb={30}>

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
                icon={<EnvelopeSimple size={20} color="#163300" />}
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
                <SignOut size={19} color="#163300" />
                <Text size="sm" fontWeight="$semibold" color="$forest">
                  Sair da conta
                </Text>
              </HStack>
            </TouchableOpacity>
          </>
        ) : (
          <Box bg="$white" borderRadius="$2xl" p="$4" style={cardShadow}>
            <Text size="sm" color="$gray300" mb="$3">
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

        {awaited.length > 0 && (
          <VStack mt="$8">
            <Heading fontFamily="$heading" fontSize="$md" mb="$1">
              Funcionalidades aguardadas
            </Heading>
            <Text size="xs" color="$gray300" mb="$3">
              As mais tocadas fizeram mais falta — priorizar quando o backend liberar.
            </Text>
            <Box borderRadius="$2xl" overflow="hidden" style={cardShadow}>
              {awaited.map(([feature, count]) => (
                <HStack
                  key={feature}
                  bg="$white"
                  px="$4"
                  py="$3"
                  borderBottomWidth="$1"
                  borderBottomColor="$gray500"
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

        <WsDiagnostics />

        <VStack mt="$8" alignItems="center" gap="$3">
          <TouchableOpacity onPress={handleCheckUpdate} testID="check-update">
            <HStack
              bg="$brandSurface"
              borderRadius="$full"
              px={20}
              py={12}
              gap="$2"
              alignItems="center"
            >
              <ArrowsClockwise size={15} color="#163300" />
              <Text fontFamily="$heading" fontSize={13} color="$forest">
                {isChecking ? "Verificando..." : "Verificar atualização"}
              </Text>
            </HStack>
          </TouchableOpacity>
          {/* Versao em DM Mono: e numero de build, nao prosa — o token `mono`
              existe pra isso. */}
          <Text fontFamily="$mono" fontSize={10} color="$brandTextSecondary" textAlign="center">
            {Updates.runtimeVersion ?? "—"} · {Updates.channel ?? "dev"} · {otaInfo}
          </Text>
          {/* Deletar conta desce pra ca como LINK: e irreversivel, entao nao
              disputa atencao com o resto — mas continua alcancavel por quem
              procura (era um botao de mesmo peso que "sair"). */}
          {isAuthenticated && (
            <TouchableOpacity onPress={openDeleteAccount} testID="delete-account">
              <Text size="xs" fontWeight="$semibold" color="$brandDanger">
                Deletar minha conta
              </Text>
            </TouchableOpacity>
          )}
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
