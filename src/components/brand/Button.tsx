import { Button as GluestackButton, ButtonSpinner, Text } from "@gluestack-ui/themed";
import { ComponentProps } from "react";

// Botao da nova marca (Pencil, doc pencil-new.pen — Button/Primary, /Secondary,
// /Outline, /Ghost). Convive com o Button.tsx antigo (paleta $green500) sem
// substitui-lo: adotar tela por tela, nao um remap global.
type Props = Omit<ComponentProps<typeof GluestackButton>, "variant"> & {
  title: string;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  isLoading?: boolean;
};

export function BrandButton({
  title,
  variant = "primary",
  isLoading = false,
  isDisabled = false,
  ...rest
}: Props) {
  // brandGreen so entra como FUNDO — nunca como cor de texto/icone sobre claro
  // (contraste). forest e sempre o par de texto por cima. Ver CLAUDE memory
  // "vupth-marca".
  const isGhost = variant === "ghost";
  const isOutline = variant === "outline";
  const bg =
    variant === "primary" ? "$brandGreen" : variant === "secondary" ? "$greenTint" : "transparent";
  const textColor = isGhost ? "$brandTextSecondary" : "$forest";

  return (
    <GluestackButton
      w={isGhost ? undefined : "$full"}
      h={isGhost ? undefined : 54}
      py={isGhost ? "$2" : undefined}
      rounded="$full"
      bg={bg}
      $active-bg={variant === "primary" ? "$brandSuccess" : variant === "secondary" ? "$brandSurfaceAlt" : "transparent"}
      borderWidth={isOutline ? "$2" : "$0"}
      borderColor="$forest"
      // `isDisabled` do Gluestack e so visual; o `disabled` de verdade (Pressable)
      // vai amarrado junto — ver nota no Button.tsx original.
      isDisabled={isDisabled}
      disabled={isLoading || isDisabled}
      {...rest}
    >
      {isLoading ? (
        <ButtonSpinner color={textColor} />
      ) : (
        <Text fontFamily="$heading" fontSize={isGhost ? "$sm" : "$md"} color={textColor}>
          {title}
        </Text>
      )}
    </GluestackButton>
  );
}
