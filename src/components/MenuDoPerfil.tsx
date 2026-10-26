import { ReactNode } from "react";
import { TouchableOpacity } from "react-native";
import { VStack, Text, Box, HStack } from "@gluestack-ui/themed";
import { ChevronRight } from "lucide-react-native";

import { useTema } from "@hooks/useTema";
import { fs } from "@stores/fonteStore";

// As linhas e o cartao do Perfil (Settings) e do submenu "Dados cadastrais".
// Um desenho so: o mesmo agrupamento do menu do partner (Andre 2026-09-16).

export function MenuItem({
  icon,
  label,
  value,
  onPress,
  last,
  testID,
  comAviso,
}: {
  icon: ReactNode;
  label: string;
  value?: string;
  onPress: () => void;
  /** Ultima linha do card nao leva divisor. */
  last?: boolean;
  testID?: string;
  /** Dot de pendencia: em menu empilhado (titulo e subtitulo) fica AO LADO do titulo, nunca solto no canto (André, 24/10). */
  comAviso?: boolean;
}) {
  const { cores } = useTema();
  return (
    <TouchableOpacity onPress={onPress} testID={testID}>
      <HStack px={16} py={15} gap="$3" alignItems="center">
        {icon}
        <VStack flex={1} gap="$0.5">
          <HStack alignItems="center" gap="$1.5">
            <Text size="xs" color="$brandTextSecondary">
              {label}
            </Text>
            {comAviso && <Box w={8} h={8} borderRadius={4} bg="$brandDanger" testID={testID ? `${testID}-aviso` : "menu-aviso"} />}
          </HStack>
          {value && (
            <Text size="sm" fontWeight="$semibold" color="$brandTextPrimary" numberOfLines={1}>
              {value}
            </Text>
          )}
        </VStack>
        <ChevronRight size={18} color={cores.textSecondary} />
      </HStack>
      {!last && <Box height={1} bg="$brandBorder" />}
    </TouchableOpacity>
  );
}

// Rotulo em caixa alta sobre um card: o mesmo agrupamento do menu do partner
// (Andre 2026-09-16: "o menu igual o do partner, com submenus").
export function Grupo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <VStack gap="$2" testID={`grupo-${label}`}>
      <Text fontSize={fs(11)} fontWeight="$bold" letterSpacing={0.6} color="$brandTextSecondary">
        {label.toUpperCase()}
      </Text>
      <Box borderRadius="$card" overflow="hidden" bg="$brandSurface">
        {children}
      </Box>
    </VStack>
  );
}
