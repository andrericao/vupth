import { TouchableOpacity, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  VStack,
  Text,
  Heading,
  Center,
  Box,
  HStack,
  ScrollView,
} from "@gluestack-ui/themed";
import { ClipboardList, Settings, ChevronRight, LogOut } from "lucide-react-native";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { Header } from "@components/Header";
import { Button } from "@components/Button";
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
          <ChevronRight size={18} color="#9CA3AF" />
        </HStack>
      </Box>
    </TouchableOpacity>
  );
}

export function Profile() {
  const navigation = useNavigation<AppNavigatorRoutesProps>();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
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
    <ScrollView
      flex={1}
      bg="$brandBackground"
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <VStack flex={1} px={15} pt={60} pb={30}>
        <Header showBackButton />

        <Center mt="$6">
          <Box
            w={80}
            h={80}
            borderRadius="$full"
            bg="$forest"
            alignItems="center"
            justifyContent="center"
          >
            <Text color="$white" fontSize="$3xl" fontFamily="$heading">
              {user?.email?.charAt(0).toUpperCase() ?? "?"}
            </Text>
          </Box>
          <Heading fontFamily="$heading" fontSize="$xl" mt="$3">
            {isAuthenticated ? (user?.email ?? "Usuário") : "Visitante"}
          </Heading>
        </Center>

        <Box borderRadius="$2xl" mt="$8" overflow="hidden" style={cardShadow}>
          <MenuItem
            icon={<ClipboardList size={22} color="#163300" />}
            label="Atendimentos"
            onPress={() => navigation.getParent()?.navigate("atendimentosTab", { screen: "attendances" })}
          />
          <MenuItem
            icon={<Settings size={22} color="#163300" />}
            label="Configurações"
            onPress={() => navigation.getParent()?.navigate("settingsTab", { screen: "settings" })}
          />
        </Box>

        <VStack flex={1} justifyContent="flex-end">
          {/* Visitante não tem "sair da conta" — vê o convite para entrar/criar
              conta (boa prática; pedido Andre 2026-07-23). */}
          {isAuthenticated ? (
            <TouchableOpacity onPress={handleLogout}>
              <Box bg="$white" px="$4" py="$4" borderRadius="$2xl" style={cardShadow}>
                <HStack alignItems="center" gap="$3">
                  <LogOut size={22} color="#B3261E" />
                  <Text size="sm" color="$brandDanger">Sair da conta</Text>
                </HStack>
              </Box>
            </TouchableOpacity>
          ) : (
            // Para quem ainda não tem conta, CRIAR é a ação que importa: pílula
            // sólida na frente, "já tenho conta" como secundária (Andre
            // 2026-08-05: "cadastrar, na tela de visitantes deve ter um peso
            // maior, pode ser uma pílula").
            <VStack gap="$3">
              <Button
                title="Criar conta grátis"
                onPress={() => navigation.navigate("signUp", {})}
              />
              <Button
                variant="outline"
                title="Já tenho conta"
                onPress={() => navigation.navigate("login", {})}
              />
            </VStack>
          )}
        </VStack>
      </VStack>
    </ScrollView>
  );
}
