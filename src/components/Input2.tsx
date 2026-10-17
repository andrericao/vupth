import { ComponentProps, useState } from "react";
import { TouchableOpacity } from "react-native";
import { Input as GluestackInput2, InputField, HStack, Text, VStack } from "@gluestack-ui/themed";
import { Eye, EyeOff, Search, CircleX } from "lucide-react-native";

import { DICA_DA_SENHA, SENHA_MAX } from "@domain/auth/validateAuth";

type Props = ComponentProps<typeof InputField> & {
  isPassword?: boolean;
  showSearchIcon?: boolean;
  onClear?: () => void;
  /** Senha (DEC-79): mostra "De 6 a 64 caracteres" embaixo. Falso no "confirmar". */
  mostrarLimites?: boolean;
};

export function Input2({ isPassword = false, showSearchIcon = false, onClear, secureTextEntry, value, mostrarLimites = true, ...rest }: Props) {
  const [visible, setVisible] = useState(false);

  const isSecure = isPassword ? !visible : secureTextEntry;
  const hasValue = typeof value === "string" && value.length > 0;

  const campo = (
    // Mesma altura/padding dos campos do PARTNER (`h="$12"` / `px-3`), para os
    // dois apps terem formularios do mesmo tamanho (Andre 2026-08-05). Os
    // botoes ja batiam (54px nos dois).
    <GluestackInput2
      // Altura MINIMA, nao cravada: com a fonte do sistema ampliada, caixa
      // travada corta o texto digitado. 48 e o valor do token `$12`, mantido
      // para os formularios dos dois apps seguirem do mesmo tamanho.
      style={{ minHeight: 48 }}
      px="$3"
      bg="$white"
      borderWidth="$1"
      borderColor="$brandBorder"
      borderRadius="$xl"
      variant="outline"
      $focus-borderWidth="$2"
      $focus-borderColor="$forest"
    >
      <HStack flex={1} alignItems="center">
        <InputField
          // O valor digitado e conteudo PRIMARIO: fica em brandTextPrimary, nao
          // no brandTextSecondary dos rotulos, senao rotulo e resposta pesam igual.
          color="$brandTextPrimary"
          fontFamily="$body"
          secureTextEntry={isSecure}
          flex={1}
          value={value}
          // DEC-79: a senha vai de 6 a 64 em todos os apps.
          maxLength={isPassword ? SENHA_MAX : undefined}
          {...rest}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setVisible((v) => !v)}
            hitSlop={8}
            accessibilityLabel={visible ? "Esconder a senha" : "Mostrar a senha"}
            testID="input-ver-senha"
          >
            {visible ? (
              <Eye size={22} color="#454745" />
            ) : (
              <EyeOff size={22} color="#454745" />
            )}
          </TouchableOpacity>
        )}
        {showSearchIcon && !hasValue && (
          <Search size={20} color="#454745" />
        )}
        {showSearchIcon && hasValue && onClear && (
          <TouchableOpacity onPress={onClear} hitSlop={8} accessibilityLabel="Limpar" testID="input-limpar">
            <CircleX size={22} color="#454745" />
          </TouchableOpacity>
        )}
      </HStack>
    </GluestackInput2>
  );
  if (!isPassword || !mostrarLimites) return campo;
  return (
    <VStack gap="$1">
      {campo}
      <Text size="xs" color="$brandTextSecondary" testID="dica-da-senha">
        {DICA_DA_SENHA}
      </Text>
    </VStack>
  );
}
