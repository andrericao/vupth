import { ComponentProps, useState } from "react";
import { TouchableOpacity } from "react-native";
import { Input as GluestackInput2, InputField, HStack } from "@gluestack-ui/themed";
import { Eye, EyeSlash } from "phosphor-react-native";

type Props = ComponentProps<typeof InputField> & {
  isPassword?: boolean;
};

export function Input2({ isPassword = false, secureTextEntry, ...rest }: Props) {
  const [visible, setVisible] = useState(false);

  const isSecure = isPassword ? !visible : secureTextEntry;

  return (
    <GluestackInput2
      h="$14"
      px="$4"
      borderWidth="$1"
      borderColor="$success500"
      borderRadius="$md"
      variant="outline"
      $focus-borderWidth="$2"
    >
      <HStack flex={1} alignItems="center">
        <InputField
          color="$success950"
          fontFamily="$body"
          secureTextEntry={isSecure}
          flex={1}
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
      </HStack>
    </GluestackInput2>
  );
}
