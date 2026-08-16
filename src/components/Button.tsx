import { Button as GluestackButton, ButtonSpinner, Text } from "@gluestack-ui/themed";
import { ComponentProps } from "react";

// Omit o `variant` do Gluestack (que tem união própria) para não anular o nosso.
type Props = Omit<ComponentProps<typeof GluestackButton>, "variant"> & {
  title: string;
  variant?: "solid" | "outline" | "destructive";
  isLoading?: boolean;
};

// [marca-vupth] Botao com presenca: pilula (rounded full), altura 54, sombra
// suave e texto Archivo ($heading). Outline = acoes secundarias; destructive =
// pilula vermelha vazada (ex.: "Sair da fila"). Fundo solido usa $brandGreen
// (claro) com texto $forest por cima — nunca branco, porque brandGreen e claro
// demais pra sustentar texto branco (regra de contraste da marca).
const btnShadow = {
  shadowColor: "#1A281A",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.18,
  shadowRadius: 10,
  elevation: 4,
};

export function Button({
  title,
  variant = "solid",
  isLoading = false,
  isDisabled = false,
  ...rest
}: Props) {
  const isOutline = variant === "outline";
  const isDestructive = variant === "destructive";
  const isGhost = isOutline || isDestructive; // fundo transparente + borda
  const accent = isDestructive ? "$brandDanger" : "$forest";

  return (
    <GluestackButton
      w="$full"
      h={54}
      rounded="$full"
      bg={isGhost ? "transparent" : "$brandGreen"}
      $active-bg={isDestructive ? "$red100" : isOutline ? "$greenTint" : "$brandSuccess"}
      borderWidth={isGhost ? "$2" : "$0"}
      borderColor={accent}
      style={isGhost ? undefined : btnShadow}
      // `isDisabled` do Gluestack e so ESTADO VISUAL: deixa o botao apagado mas
      // o toque continua disparando o `onPress` (descoberto em 2026-08-07, pelo
      // teste do DeleteAccountModal). Quem escapou disso ate hoje escapou por
      // acaso, porque os handlers tinham guarda interna. Aqui o `disabled` de
      // verdade (o do Pressable) e amarrado junto, entao desabilitado nao clica.
      isDisabled={isDisabled}
      disabled={isLoading || isDisabled}
      {...rest}
    >
      {isLoading ? (
        <ButtonSpinner color={accent} />
      ) : (
        <Text fontFamily="$heading" fontSize="$md" color={accent}>
          {title}
        </Text>
      )}
    </GluestackButton>
  );
}
