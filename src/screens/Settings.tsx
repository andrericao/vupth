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
import { cardShadow } from "@utils/styles";
import { useAuthStore } from "@stores/authStore";
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
  const logout = useAuthStore((s) => s.logout);

  const [mainAddress, setMainAddress] = useState<AddressResponse | null>(null);

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

      <Box borderRadius="$2xl" overflow="hidden" style={cardShadow}>
        <MenuItem
          icon={<User size={22} color="#00B37E" />}
          label="Nome"
          value={displayName}
          onPress={() => navigation.navigate("editProfile")}
        />
        <MenuItem
          icon={<EnvelopeSimple size={22} color="#00B37E" />}
          label="E-mail"
          value={user?.email ?? "—"}
          onPress={() => navigation.navigate("editEmail")}
        />
        <MenuItem
          icon={<Lock size={22} color="#00B37E" />}
          label="Senha"
          value="••••••"
          onPress={() => navigation.navigate("editPassword")}
        />
        <MenuItem
          icon={<MapPin size={22} color="#00B37E" />}
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
