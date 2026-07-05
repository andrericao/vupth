import { TouchableOpacity, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  VStack,
  Text,
  Heading,
  Center,
  Box,
  HStack,
} from "@gluestack-ui/themed";
import {
  ClipboardText,
  Gear,
  CaretRight,
  SignOut,
} from "phosphor-react-native";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { Header } from "@components/Header";
import { cardShadow } from "@utils/styles";
import { useAuthStore } from "@stores/authStore";

function MenuItem({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
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
          <Text size="sm" flex={1}>{label}</Text>
          <CaretRight size={18} color="#9CA3AF" />
        </HStack>
      </Box>
    </TouchableOpacity>
  );
}

export function Profile() {
  const navigation = useNavigation<AppNavigatorRoutesProps>();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  function handleLogout() {
    Alert.alert(
      "Sair da conta",
      "Tem certeza que deseja sair da sua conta?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sair",
          style: "destructive",
          onPress: async () => {
            await logout();
            navigation.reset({ index: 0, routes: [{ name: "home" }] });
          },
        },
      ],
    );
  }

  return (
    <VStack flex={1} px={15} pt={60} pb={30} bg="$gray700">
      <Header showBackButton />

      <Center mt="$6">
        <Box
          w={80}
          h={80}
          borderRadius="$full"
          bg="$green500"
          alignItems="center"
          justifyContent="center"
        >
          <Text color="$white" fontSize="$3xl" fontFamily="$heading">
            {user?.email?.charAt(0).toUpperCase() ?? "?"}
          </Text>
        </Box>
        <Heading fontFamily="$heading" fontSize="$xl" mt="$3">
          {user?.email ?? "Usuário"}
        </Heading>
      </Center>

      <Box borderRadius="$2xl" mt="$8" overflow="hidden" style={cardShadow}>
        <MenuItem
          icon={<ClipboardText size={22} color="#00B37E" />}
          label="Atendimentos"
          onPress={() => navigation.getParent()?.navigate("atendimentosTab", { screen: "attendances" })}
        />
        <MenuItem
          icon={<Gear size={22} color="#00B37E" />}
          label="Configurações"
          onPress={() => navigation.getParent()?.navigate("settingsTab", { screen: "settings" })}
        />
      </Box>

      <VStack flex={1} justifyContent="flex-end">
        <TouchableOpacity onPress={handleLogout}>
          <Box bg="$white" px="$4" py="$4" borderRadius="$2xl" style={cardShadow}>
            <HStack alignItems="center" gap="$3">
              <SignOut size={22} color="#E63946" />
              <Text size="sm" color="$red500">Sair da conta</Text>
            </HStack>
          </Box>
        </TouchableOpacity>
      </VStack>
    </VStack>
  );
}
