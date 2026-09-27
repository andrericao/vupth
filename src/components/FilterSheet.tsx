import { Modal, Pressable, TouchableOpacity } from "react-native";
import { VStack, HStack, Box, Text } from "@gluestack-ui/themed";

import { ServiceType } from "@domain/establishment/types";
import { SERVICE_TYPE_LABELS } from "@domain/establishment/serviceType";

export type FilterValue = ServiceType | "ALL";

type Props = {
  visible: boolean;
  value: FilterValue;
  onSelect: (value: FilterValue) => void;
  onClose: () => void;
};

// "Todas" primeiro: e o estado padrao e tambem a saida de quem quer limpar o
// filtro. As categorias e os rotulos vem da FONTE UNICA (`SERVICE_TYPE_LABELS`)
// — escrever a lista aqui de novo e o que ja fez a mesma categoria aparecer
// traduzida numa tela e crua em outra.
const OPCOES: { value: FilterValue; label: string }[] = [
  { value: "ALL", label: "Todas" },
  ...(Object.keys(SERVICE_TYPE_LABELS) as ServiceType[]).map((k) => ({
    value: k as FilterValue,
    label: SERVICE_TYPE_LABELS[k],
  })),
];

/**
 * Filtro por categoria da Home (icone de filtro do campo de busca).
 *
 * A LOGICA de filtro ja existia inteira — `filterEstablishments` recebe a
 * categoria e a Home guarda `selectedFilter`. O que faltava era a UI: o
 * `sliders-horizontal` era um icone SOLTO, sem Pressable e sem onPress. Parecia
 * botao e nao fazia nada; o filtro so mudava por parametro de rota.
 *
 * Chip selecionado = `forest` + texto `brandGreen`, o par da marca sobre fundo
 * escuro (mesmo dos chips de periodo do relatorio e das abas dos Termos).
 */
export function FilterSheet({ visible, value, onSelect, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Box flex={1} bg="rgba(0,0,0,0.45)" justifyContent="flex-end">
        <Pressable
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          onPress={onClose}
          accessibilityLabel="Fechar filtro"
        />
        <VStack
          bg="$brandBackground"
          borderTopLeftRadius="$hero"
          borderTopRightRadius="$hero"
          px="$5"
          pt="$5"
          pb="$8"
          gap="$4"
        >
          <VStack gap="$1">
            <Text fontFamily="$display" fontSize={24} letterSpacing={-0.5} color="$forest">
              Filtrar por categoria
            </Text>
            <Text size="sm" color="$brandTextSecondary">
              Mostra só os lugares desse tipo.
            </Text>
          </VStack>

          <HStack gap="$2" flexWrap="wrap">
            {OPCOES.map((op) => {
              const ativo = op.value === value;
              return (
                <TouchableOpacity
                  key={op.value}
                  testID={`filter-${op.value}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: ativo }}
                  onPress={() => {
                    onSelect(op.value);
                    onClose();
                  }}
                >
                  <Box
                    bg={ativo ? "$forest" : "$brandSurface"}
                    borderRadius="$full"
                    px={16}
                    py={10}
                    mb="$2"
                  >
                    <Text
                      fontFamily="$heading"
                      fontSize={17}
                      color={ativo ? "$brandGreen" : "$brandTextSecondary"}
                    >
                      {op.label}
                    </Text>
                  </Box>
                </TouchableOpacity>
              );
            })}
          </HStack>
        </VStack>
      </Box>
    </Modal>
  );
}
