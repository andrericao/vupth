import { ComponentProps, useState } from "react";
import { TouchableOpacity } from "react-native";
import { Input as GluestackInput2, InputField, HStack } from "@gluestack-ui/themed";
import { Eye, EyeSlash, MagnifyingGlass, XCircle } from "phosphor-react-native";

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
    <GluestackInput2
      h="$14"
      px="$4"
      bg="$white"
      borderWidth="$1"
      borderColor="$coolGray300"
      borderRadius="$xl"
      variant="outline"
      $focus-borderWidth="$2"
      $focus-borderColor="$green500"
    >
      <HStack flex={1} alignItems="center">
        <InputField
          color="$coolGray900"
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
              <EyeSlash size={22} color="#6B7280" />
            )}
          </TouchableOpacity>
        )}
        {showSearchIcon && !hasValue && (
          <MagnifyingGlass size={20} color="#9CA3AF" />
        )}
        {showSearchIcon && hasValue && onClear && (
          <TouchableOpacity onPress={onClear} hitSlop={8}>
            <XCircle size={22} color="#9CA3AF" weight="fill" />
          </TouchableOpacity>
        )}
      </HStack>
    </GluestackInput2>
  );
}
