import { ComponentProps, useState } from "react";
import { TouchableOpacity } from "react-native";
import { Input as GluestackInput2, InputField, HStack } from "@gluestack-ui/themed";
import { Eye, EyeOff, Search, CircleX } from "lucide-react-native";

type Props = ComponentProps<typeof InputField> & {
  isPassword?: boolean;
  showSearchIcon?: boolean;
  onClear?: () => void;
};

export function Input2({ isPassword = false, showSearchIcon = false, onClear, secureTextEntry, value, ...rest }: Props) {
  const [visible, setVisible] = useState(false);

  const isSecure = isPassword ? !visible : secureTextEntry;
  const hasValue = typeof value === "string" && value.length > 0;

  return (
    // Mesma altura/padding dos campos do PARTNER (`h="$12"` / `px-3`), para os
    // dois apps terem formularios do mesmo tamanho (Andre 2026-08-05). Os
    // botoes ja batiam (54px nos dois).
    <GluestackInput2
      h="$12"
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
          {...rest}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setVisible((v) => !v)} hitSlop={8}>
            {visible ? (
              <Eye size={22} color="#6B7280" />
            ) : (
              <EyeOff size={22} color="#6B7280" />
            )}
          </TouchableOpacity>
        )}
        {showSearchIcon && !hasValue && (
          <Search size={20} color="#9CA3AF" />
        )}
        {showSearchIcon && hasValue && onClear && (
          <TouchableOpacity onPress={onClear} hitSlop={8}>
            <CircleX size={22} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </HStack>
    </GluestackInput2>
  );
}
