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
} from "@gluestack-ui/themed";
import {
  User,
  EnvelopeSimple,
  Lock,
  MapPin,
  CaretRight,
} from "phosphor-react-native";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { Header } from "@components/Header";
import { Button } from "@components/Button";
import { WsDiagnostics } from "@components/WsDiagnostics";
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
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress}>
      <Box
        bg="$white"
        px="$4"
        py="$4"
        borderBottomWidth="$1"
        borderBottomColor="$gray500"
      >
        <HStack alignItems="center" gap="$3">
          {icon}
          <VStack flex={1}>
            <Text size="xs" color="$gray300">{label}</Text>
            {value && (
              <Text size="sm" fontFamily="$heading">{value}</Text>
            )}
          </VStack>
          <CaretRight size={18} color="#9CA3AF" />
        </HStack>
      </Box>
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

  function handleDeleteAccount() {
    Alert.alert(
      "Deletar conta",
      "Tem certeza? Esta ação é irreversível e todos os seus dados serão perdidos.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Deletar",
          style: "destructive",
          onPress: async () => {
            try {
              if (accessToken) {
                await profileService.deleteAccount(accessToken);
              }
              await logout();
              // Settings vive na aba Config.; volta para a aba Home (pai = tabs).
              navigation.getParent()?.navigate("homeTab", { screen: "home" });
            } catch (error: any) {
              const msg = error.response?.data?.message || error.message || "Erro ao deletar conta";
              Alert.alert("Erro", msg);
            }
          },
        },
      ]
    );
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
    <VStack flex={1} px={15} pt={60} pb={30} bg="$gray700">
      <Header showBackButton />

      <Heading fontFamily="$heading" fontSize="$2xl" mt="$4" mb="$6">
        Configurações
      </Heading>

      {/* Opções de CONTA só para quem tem conta (visitante não vê trocar senha,
          e-mail, endereço nem deletar — boa prática; pedido Andre 2026-07-23). */}
      {isAuthenticated ? (
        <>
          <Box borderRadius="$2xl" overflow="hidden" style={cardShadow}>
            <MenuItem
              icon={<User size={22} color="#3B7A3F" />}
              label="Nome"
              value={displayName}
              onPress={() => navigation.navigate("editProfile")}
            />
            <MenuItem
              icon={<EnvelopeSimple size={22} color="#3B7A3F" />}
              label="E-mail"
              value={user?.email ?? "—"}
              onPress={() => navigation.navigate("editEmail")}
            />
            <MenuItem
              icon={<Lock size={22} color="#3B7A3F" />}
              label="Senha"
              value="••••••"
              onPress={() => navigation.navigate("editPassword")}
            />
            <MenuItem
              icon={<MapPin size={22} color="#3B7A3F" />}
              label="Endereço"
              value={displayAddress}
              onPress={() => navigation.navigate("editAddress")}
            />
          </Box>

          <VStack mt="$8">
            <Button
              title="Deletar conta"
              variant="outline"
              onPress={handleDeleteAccount}
              borderColor="$red500"
              $active-bg="$red500"
            />
          </VStack>
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
                <Box bg="$green100" borderRadius="$full" px="$3" py="$1">
                  <Text size="xs" fontFamily="$heading" color="$green700">
                    {count}×
                  </Text>
                </Box>
              </HStack>
            ))}
          </Box>
        </VStack>
      )}

      <WsDiagnostics />

      <VStack mt="$8" alignItems="center" gap="$1">
        <Text size="xs" color="$gray400">
          Runtime {Updates.runtimeVersion ?? "—"} · canal {Updates.channel ?? "dev"}
        </Text>
        <Text size="xs" color="$gray400">{otaInfo}</Text>
        <Button
          title={isChecking ? "Verificando..." : "Verificar atualização"}
          variant="outline"
          mt="$2"
          onPress={handleCheckUpdate}
        />
      </VStack>
    </VStack>
  );
}
