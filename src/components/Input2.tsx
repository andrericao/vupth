import { useState } from "react";
import { Platform, Pressable, TextInput, View, type TextInputProps } from "react-native";
import { Eye, EyeOff, Search, CircleX } from "lucide-react-native";

// NativeWind (DEC-5, passo 3): o campo deixa o Gluestack com a mesma API de
// antes — props do TextInput + isPassword, showSearchIcon e onClear —, entao
// as telas nao mudam.
type Props = TextInputProps & {
  isPassword?: boolean;
  showSearchIcon?: boolean;
  onClear?: () => void;
  /** Classes extras da caixa (ex.: "mt-2"). */
  className?: string;
};

// O TextInput do react-native-web e um <input> de verdade: herda a borda e o
// anel de foco do navegador, e o campo ganha uma segunda borda e fica
// espremido (achado do Partner, 08/09). O Gluestack trazia esse reset; agora e
// nosso — so na web, e o estilo de quem chama continua por cima.
export const RESET_WEB =
  Platform.OS === "web" ? ({ outlineStyle: "none", outlineWidth: 0, borderWidth: 0 } as const) : null;

export function Input2({
  isPassword = false,
  showSearchIcon = false,
  onClear,
  secureTextEntry,
  value,
  className = "",
  style,
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const [visible, setVisible] = useState(false);
  const [focado, setFocado] = useState(false);

  const isSecure = isPassword ? !visible : secureTextEntry;
  const hasValue = typeof value === "string" && value.length > 0;

  // Mesma altura/padding dos campos do PARTNER, para os dois apps terem
  // formularios do mesmo tamanho (Andre 2026-08-05). Altura MINIMA, nao
  // cravada: com a fonte do sistema ampliada, caixa travada corta o texto.
  const borda = focado ? "border-2 border-vupth-forest" : "border border-vupth-border";

  return (
    <View className={`flex-row items-center gap-2 bg-white rounded-xl px-3 min-h-[48px] ${borda} ${className}`}>
      <TextInput
        // O valor digitado e conteudo PRIMARIO: textPrimary, nao o
        // textSecondary dos rotulos, senao rotulo e resposta pesam igual.
        className="flex-1 font-body text-vupth-textPrimary"
        style={[RESET_WEB, style] as TextInputProps["style"]}
        placeholderTextColor="#6B706B"
        secureTextEntry={isSecure}
        value={value}
        onFocus={(e) => {
          setFocado(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocado(false);
          onBlur?.(e);
        }}
        {...rest}
      />
      {isPassword && (
        <Pressable
          onPress={() => setVisible((v) => !v)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={visible ? "Ocultar senha" : "Mostrar senha"}
        >
          {visible ? <Eye size={22} color="#454745" /> : <EyeOff size={22} color="#454745" />}
        </Pressable>
      )}
      {showSearchIcon && !hasValue && <Search size={20} color="#454745" />}
      {showSearchIcon && hasValue && onClear && (
        <Pressable onPress={onClear} hitSlop={8} accessibilityRole="button" accessibilityLabel="Limpar busca">
          <CircleX size={22} color="#454745" />
        </Pressable>
      )}
    </View>
  );
}
