import { TouchableOpacity } from "react-native";
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

import { Header } from "@components/Header";
import { useAuthStore } from "@stores/authStore";

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
  const user = useAuthStore((s) => s.user);

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
          value="Não informado"
          onPress={() => {}}
        />
        <MenuItem
          icon={<EnvelopeSimple size={22} color="#22C55E" />}
          label="E-mail"
          value={user?.email ?? "—"}
          onPress={() => {}}
        />
        <MenuItem
          icon={<Lock size={22} color="#22C55E" />}
          label="Senha"
          value="••••••"
          onPress={() => {}}
        />
        <MenuItem
          icon={<MapPin size={22} color="#22C55E" />}
          label="Endereço"
          value="Não informado"
          onPress={() => {}}
        />
      </Box>
    </VStack>
  );
}
