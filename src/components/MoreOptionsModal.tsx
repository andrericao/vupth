import { Modal } from "react-native";
import { VStack, Box, Text, Heading } from "@gluestack-ui/themed";

import { Button } from "@components/Button";
import { cardShadow } from "@utils/styles";

export type MoreOption = {
  key: string;
  title: string;
  // Linha curta explicando o que acontece ao tocar (opcional).
  description?: string;
  disabled?: boolean;
  onPress: () => void;
};

type Props = {
  visible: boolean;
  title?: string;
  subtitle?: string;
  options: MoreOption[];
  onClose: () => void;
};

// Menu de "mais opções" (decisão Andre 2026-07-29): a tela principal do
// estabelecimento fica só com a ação primária (entrar na fila / agendar) e as
// demais — solicitar corte, entrar por troca — vivem aqui, no mesmo espírito do
// ChangeTurnModal do cliente já na fila.
export function MoreOptionsModal({ visible, title, subtitle, options, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Box flex={1} bg="rgba(0,0,0,0.45)" justifyContent="center" px={24}>
        <VStack bg="$white" borderRadius="$2xl" p="$6" style={cardShadow}>
          <Heading fontFamily="$heading" fontSize="$lg">
            {title ?? "Mais opções"}
          </Heading>
          {subtitle && (
            <Text size="sm" color="$gray300" mt="$1">
              {subtitle}
            </Text>
          )}

          {options.map((option, index) => (
            <VStack key={option.key} mt={index === 0 ? "$5" : "$4"}>
              <Button
                title={option.title}
                variant="outline"
                isDisabled={option.disabled}
                testID={`more-option-${option.key}`}
                onPress={option.onPress}
              />
              {option.description && (
                <Text size="xs" color="$gray300" mt="$1" px="$1">
                  {option.description}
                </Text>
              )}
            </VStack>
          ))}

          <Button title="Fechar" variant="outline" mt="$5" onPress={onClose} />
        </VStack>
      </Box>
    </Modal>
  );
}
