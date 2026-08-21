import { useState } from "react";
import { Image } from "react-native";
import { Center, Text } from "@gluestack-ui/themed";

type Props = {
  name: string;
  size?: number;
  /** Foto do estabelecimento/profissional (`urlImage`). */
  photoUrl?: string | null;
  /** Fundo do circulo quando cai nas iniciais. */
  bg?: string;
  /** Cor das iniciais — combine com o `bg` quando sair do padrao. */
  color?: string;
};

/**
 * Avatar redondo de estabelecimento/profissional: foto quando existe, iniciais
 * quando nao existe **ou quando a foto falha ao carregar**.
 *
 * O fallback no erro nao e detalhe: varias lojas tem `urlImage` de placeholder
 * que nao resolve (ex.: "https://img.com/x.jpg"), e o `Image` do RN nao desenha
 * nada nesse caso — a linha fica com um buraco no lugar do avatar. Sem o
 * `onError` aqui, cada tela precisaria lembrar disso sozinha (e uma ja tinha
 * esquecido).
 */
export function PlaceAvatar({
  name,
  size = 44,
  photoUrl,
  bg = "$greenTint",
  color = "$forest",
}: Props) {
  const [imageFailed, setImageFailed] = useState(false);

  if (photoUrl && !imageFailed) {
    return (
      <Image
        source={{ uri: photoUrl }}
        onError={() => setImageFailed(true)}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?";

  return (
    <Center width={size} height={size} borderRadius={size / 2} bg={bg}>
      <Text fontFamily="$display" fontSize={size * 0.34} color={color}>
        {initials}
      </Text>
    </Center>
  );
}
