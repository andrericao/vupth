import { Button as GluestackButton, ButtonSpinner, Text } from "@gluestack-ui/themed";
import { ComponentProps } from "react";

type Props = ComponentProps<typeof GluestackButton> & {
  title: string;
  variant?: "solid" | "outline";
  isLoading?: boolean;
};

// [verde-imersivo] Botao com presenca: pilula (rounded full), altura 54, sombra
// suave e texto Poppins ($heading). Outline mantido para acoes secundarias.
const btnShadow = {
  shadowColor: "#1B4332",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.18,
  shadowRadius: 10,
  elevation: 4,
};

export function Button({ title, variant = "solid", isLoading = false, ...rest }: Props) {
  const isOutline = variant === "outline";

  return (
    <GluestackButton
      w="$full"
      h={54}
      rounded="$full"
      bg={isOutline ? "transparent" : "$green500"}
      $active-bg={isOutline ? "$green100" : "$green600"}
      borderWidth={isOutline ? "$2" : "$0"}
      borderColor="$green500"
      style={isOutline ? undefined : btnShadow}
      disabled={isLoading}
      {...rest}
    >
      {isLoading ? (
        <ButtonSpinner color={isOutline ? "$green500" : "$white"} />
      ) : (
        <Text fontFamily="$heading" fontSize="$md" color={isOutline ? "$green500" : "$white"}>
          {title}
        </Text>
      )}
    </GluestackButton>
  );
}
