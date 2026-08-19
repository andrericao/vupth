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
      h="$12"
      px="$3"
      borderWidth="$1"
      borderColor="$success500"
      borderRadius="$md"
      variant="outline"
      $focus-borderWidth="$2"
    >
      <InputSlot>
        <InputIcon as={SearchIcon} color="$emerald900"/>
      </InputSlot>
      <InputField
        color="$success950"
        fontFamily="$body"
        {...rest}
      />
    </GluestackInput>
  );
}
