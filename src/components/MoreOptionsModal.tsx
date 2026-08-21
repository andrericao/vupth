import { Modal, TouchableOpacity, Pressable } from "react-native";
import { VStack, HStack, Box, Text } from "@gluestack-ui/themed";
import { ChevronRight } from "lucide-react-native";
import type { ComponentType } from "react";

export type MoreOption = {
  key: string;
  title: string;
  // Linha curta explicando o que acontece ao tocar (opcional).
  description?: string;
  /** Icone lucide opcional — ajuda a distinguir acoes de natureza diferente. */
  icon?: ComponentType<{ size?: number; color?: string }>;
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

// Menu de "mais opções" (decisão Andre 2026-08-01): a tela principal do
// estabelecimento fica só com a ação primária (entrar na fila / agendar) e as
// demais — solicitar corte, entrar por troca — vivem aqui.
//
// [marca-vupth] Refeito (QA Alexia 2026-08-21). O que estava errado:
//
// 1. TRÊS botões outline idênticos. "Fechar" — que é só descartar o modal —
//    tinha o mesmo peso visual das duas ações reais. Agora as ações são LINHAS
//    tocáveis (card `$brandSurface`, chevron) e "Fechar" é link discreto.
// 2. A descrição vinha DEPOIS do botão, solta. Lia-se a ação e só então a
//    explicação — ordem invertida. Agora título e descrição moram dentro da
//    mesma linha, e a descrição vem antes do toque, não depois.
// 3. Nada usava o sistema de card da marca (era branco sobre branco).
//
// O padrão é o mesmo do menu do dono e do perfil do profissional no partner:
// linha com ícone, título, apoio e chevron.
export function MoreOptionsModal({ visible, title, subtitle, options, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Box flex={1} bg="rgba(0,0,0,0.45)" justifyContent="center" px={24}>
        {/* Tocar fora fecha — era só pelo botão e pelo voltar do Android. */}
        <Pressable
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          onPress={onClose}
          accessibilityLabel="Fechar mais opções"
        />
        <VStack bg="$brandBackground" borderRadius="$hero" p="$5" gap="$4">
          <VStack gap="$1">
            <Text fontFamily="$display" fontSize={20} letterSpacing={-0.5} color="$forest">
              {title ?? "Mais opções"}
            </Text>
            {subtitle && (
              <Text size="sm" color="$brandTextSecondary">
                {subtitle}
              </Text>
            )}
          </VStack>

          <VStack gap="$2.5">
            {options.map((option) => {
              const Icon = option.icon;
              return (
                <TouchableOpacity
                  key={option.key}
                  testID={`more-option-${option.key}`}
                  disabled={option.disabled}
                  onPress={option.onPress}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={option.title}
                  accessibilityState={{ disabled: !!option.disabled }}
                >
                  <HStack
                    bg="$brandSurface"
                    borderRadius="$card"
                    p="$4"
                    gap="$3"
                    alignItems="center"
                    opacity={option.disabled ? 0.5 : 1}
                  >
                    {Icon && <Icon size={20} color="#163300" />}
                    <VStack flex={1} gap="$0.5">
                      <Text fontFamily="$heading" fontSize="$sm" color="$forest">
                        {option.title}
                      </Text>
                      {option.description && (
                        <Text size="xs" color="$brandTextSecondary">
                          {option.description}
                        </Text>
                      )}
                    </VStack>
                    <ChevronRight size={18} color="#454745" />
                  </HStack>
                </TouchableOpacity>
              );
            })}
          </VStack>

          {/* Descartar não é ação: é link discreto, não um terceiro botão de
              mesmo peso das opções acima. */}
          <TouchableOpacity onPress={onClose} testID="more-options-close">
            <Text
              size="sm"
              fontWeight="$semibold"
              color="$brandTextSecondary"
              textAlign="center"
            >
              Fechar
            </Text>
          </TouchableOpacity>
        </VStack>
      </Box>
    </Modal>
  );
}
