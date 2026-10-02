import { ActivityIndicator, Pressable, Text, type PressableProps } from "react-native";

// NativeWind (DEC-5, passo 3): primeira primitiva convertida — mesma API de
// antes (title, variant, isLoading, isDisabled), so que o espacamento de fora
// vem por `className` (ex.: "mt-4") em vez das props $token do Gluestack.
type Props = Omit<PressableProps, "children"> & {
  title: string;
  variant?: "solid" | "outline" | "destructive";
  isLoading?: boolean;
  isDisabled?: boolean;
  /** Classes extras da caixa (ex.: "mt-4") — sobrescrevem as do variant. */
  className?: string;
};

// [marca-vupth] Botao: pilula (rounded full), altura 54, texto Archivo
// (font-heading). Outline = acoes secundarias; destructive = pilula vermelha
// vazada (ex.: "Sair da fila"). Fundo solido usa vupth-green com texto
// forest por cima — nunca branco, porque o green e claro demais pra
// sustentar texto branco (regra de contraste da marca).
//
// SEM SOMBRA: o `Button/Primary` do Pencil tem `effect: NENHUMA`. A pilula ja
// tem presenca pela cor e pelo tamanho; sombra em botao era invencao nossa.
//
// Altura MINIMA, nao cravada: o app honra o ajuste de fonte do aparelho
// (allowFontScaling nunca e desligado), e caixa travada CORTA o rotulo
// quando a fonte cresce. Mesmo idioma do ScreenHeader e do Partner (DS4).
const BASE = "w-full min-h-[54px] rounded-full items-center justify-center px-4";
const BOX = {
  solid: "bg-vupth-green active:bg-vupth-success active:opacity-70",
  outline: "bg-transparent border-2 border-vupth-forest active:bg-vupth-greenTint active:opacity-80",
  destructive: "bg-transparent border-2 border-vupth-danger active:bg-vupth-dangerTint active:opacity-80",
} as const;
const TEXTO = {
  solid: "text-vupth-forest",
  outline: "text-vupth-forest",
  destructive: "text-vupth-danger",
} as const;
const SPINNER = { solid: "#163300", outline: "#163300", destructive: "#B3261E" } as const;

export function Button({
  title,
  variant = "solid",
  isLoading = false,
  isDisabled = false,
  className = "",
  ...rest
}: Props) {
  // Desabilitado nao clica: o `isDisabled` do Gluestack era so visual (achado
  // em 2026-08-07, teste do DeleteAccountModal). Aqui e o `disabled` do
  // Pressable, junto com o carregando — evita envio duplicado.
  const desligado = isLoading || isDisabled;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: desligado, busy: isLoading }}
      disabled={desligado}
      className={`${BASE} ${BOX[variant]} ${isDisabled ? "opacity-40" : ""} ${className}`}
      {...rest}
    >
      {isLoading ? (
        <ActivityIndicator color={SPINNER[variant]} />
      ) : (
        <Text className={`font-heading text-md ${TEXTO[variant]}`}>{title}</Text>
      )}
    </Pressable>
  );
}
