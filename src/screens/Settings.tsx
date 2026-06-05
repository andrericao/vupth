import { Alert, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
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
import { useAuthStore } from "@stores/authStore";
import { profileService } from "@services/profileService";

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

  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Não informado";

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
              navigation.navigate("home");
            } catch (error: any) {
              const msg = error.response?.data?.message || error.message || "Erro ao deletar conta";
              Alert.alert("Erro", msg);
            }
          },
        },
      ]
    );
  }

  return (
    <VStack flex={1} px={15} pt={60} pb={30} bg="$gray700">
      <Header showBackButton />

      <Heading fontFamily="$heading" fontSize="$2xl" mt="$4" mb="$6">
        Configurações
      </Heading>

      <Box borderRadius="$lg" overflow="hidden">
        <MenuItem
          icon={<User size={22} color="#22C55E" />}
          label="Nome"
          value={displayName}
          onPress={() => navigation.navigate("editProfile")}
        />
        <MenuItem
          icon={<EnvelopeSimple size={22} color="#22C55E" />}
          label="E-mail"
          value={user?.email ?? "—"}
          onPress={() => navigation.navigate("editEmail")}
        />
        <MenuItem
          icon={<Lock size={22} color="#22C55E" />}
          label="Senha"
          value="••••••"
          onPress={() => navigation.navigate("editPassword")}
        />
        <MenuItem
          icon={<MapPin size={22} color="#22C55E" />}
          label="Endereço"
          value="Não informado"
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
    </VStack>
  );
}
