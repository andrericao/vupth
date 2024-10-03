import { Button as GluestackButton, Text } from "@gluestack-ui/themed";
import { ComponentProps } from "react";

type Props = ComponentProps<typeof GluestackButton> & {
  title: string;
  variant?: "solid" | "outline"
  isLoading?: boolean;
}

export function Button({title, variant = "solid", isLoading = false, ...rest}: Props){
  return(
    <GluestackButton
      w="$full"
      h="$14"
      bg={variant === "outline" ? "transparent" : "$green500"}
      $active-bg={variant === "outline" ? "$green500" : "$gray300"}
      borderWidth={variant === "outline" ? "$2" : "$0"}
      borderColor="$green500"
      { ...rest }>

      <Text 
      color={variant === "outline" ? "$green500" : "$white"}
      >{title}</Text>
    </GluestackButton>
  );
}