import {
  Input as GluestackInput,
  InputField,
  InputSlot,
  InputIcon,
  SearchIcon,
} from "@gluestack-ui/themed";
import { ComponentProps } from "react";

type Props = ComponentProps<typeof InputField>;

export function Input({ ...rest }: Props) {
  return (
    <GluestackInput
      bg="$light200"
      h="$14"
      px="$4"
      borderWidth="$0"
      borderRadius="$md"
    >
      <InputSlot>
        <InputIcon as={SearchIcon} color="$esmeral700"/>
      </InputSlot>
      <InputField
        color="$trueGray700"
        fontFamily="$body"
        placeholderTextColor="$trueGray400"
        {...rest}
      />
    </GluestackInput>
  );
}
