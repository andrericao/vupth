import { ComponentProps } from "react";
import { Input as GluestackInput2, InputField } from "@gluestack-ui/themed";

type Props = ComponentProps<typeof InputField>;

export function Input2({ ...rest }: Props) {
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
      <InputField
				color="$success950" 
				fontFamily="$body" 
				{...rest} 
			/>
    </GluestackInput2>
  );
}
