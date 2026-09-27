import { TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { VStack, HStack, Text, Center } from "@gluestack-ui/themed";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";

type Props = {
  /**
   * Titulo grande da tela. OPCIONAL: telas-heroi (login, cadastro, foto da
   * loja) tem o titulo no CORPO, em corpo maior, e o cabecalho ali e so a
   * navegacao. Sem titulo a linha continua com a mesma altura.
   */
  title?: string;
  subtitle?: string;
  /** Acao no canto direito. Use `HeaderIconButton` pra manter o formato. */
  action?: React.ReactNode;
  /** Sobrescreve o voltar padrao (`goBack`). */
  onBack?: () => void;
  /** Tela RAIZ de aba (Home, Atendimentos, Perfil): sem botao voltar. */
  root?: boolean;
  /**
   * Em que FUNDO o cabecalho esta. Decide so a cor dos botoes redondos —
   * o titulo e sempre forest, porque os tres fundos sao claros.
   *
   *  claro  telas normais (branco/surface)  -> botao em verde-claro
   *  foto   hero com imagem                 -> branco translucido, pra vazar
   *  marca  hero em brand-green             -> forest translucido; verde-claro
   *         sobre verde-claro sumiria
   */
  ground?: "claro" | "foto" | "marca";
};

function buttonBg(ground: Props["ground"]) {
  if (ground === "foto") return "#FFFFFFE6";
  if (ground === "marca") return "#16330014";
  return "$greenTint";
}

/**
 * Botao redondo do cabecalho. Existe pra que a acao da direita (favoritar,
 * compartilhar) tenha exatamente a mesma forma do voltar — antes cada tela
 * desenhava o proprio circulo e eles saiam com tamanhos diferentes.
 */
export function HeaderIconButton({
  onPress,
  children,
  ground,
  ...rest
}: {
  onPress: () => void;
  children: React.ReactNode;
  ground?: Props["ground"];
  testID?: string;
  accessibilityLabel?: string;
  accessibilityState?: { selected?: boolean };
}) {
  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="button" {...rest}>
      <Center width={40} height={40} borderRadius="$full" bg={buttonBg(ground)}>
        {children}
      </Center>
    </TouchableOpacity>
  );
}

/**
 * Cabecalho padrao das telas. Espelha `ScreenHeader` do partner — mesmo
 * contrato, pros dois apps nao divergirem de novo.
 *
 * [marca-vupth] Reescrito (QA Alexia 2026-08-21), duas mudancas:
 *
 * 1. **LINHA UNICA** — voltar · titulo · acao. Antes os botoes ocupavam uma
 *    linha propria ACIMA e empurravam o titulo pra baixo, entao o titulo
 *    comecava numa altura diferente em cada tela (com botao x sem botao). Com
 *    tudo na mesma linha, a altura do titulo e constante. `minHeight` de 44
 *    segura a linha estavel mesmo quando nao ha botao nenhum.
 *
 * 2. **Sem padding horizontal proprio** — o container da tela aplica os 16px
 *    padrao do app. Ter os dois dava padding duplo e o titulo recuava mais que
 *    o conteudo abaixo. Uma fonte so de padding lateral por tela.
 *
 * ⚠️ A tela NAO deve colocar `pt` no container: o cabecalho ja resolve o topo,
 * inclusive o `safe-area` (antes era um `pt={56}` chutado, que ficava curto em
 * aparelho com notch alto e sobrava em tela sem entalhe).
 */
export function ScreenHeader({ title, subtitle, action, onBack, root, ground }: Props) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const showBack = !root;

  return (
    <VStack style={{ paddingTop: insets.top + 12 }} pb="$4">
      {/* `flex-start`, nao `center`: centrado, um titulo de DUAS linhas (60px)
          estourava os 44 da linha e comecava no topo, enquanto um de uma linha
          (30px) ficava centrado 7px abaixo — medido no navegador: 12px contra
          19px. Ancorado no topo, a 1a linha do titulo comeca sempre na mesma
          altura, quebre ele ou nao. */}
      <HStack alignItems="flex-start" gap="$3" style={{ minHeight: 44 }}>
        {showBack && (
          <HeaderIconButton
            onPress={onBack ?? (() => navigation.goBack())}
            ground={ground}
            testID="back-button"
            accessibilityLabel="Voltar"
          >
            <ChevronLeft size={20} color="#163300" />
          </HeaderIconButton>
        )}

        {/* So o TITULO divide a linha com os botoes. O `flex` fica mesmo sem
            titulo — e o que empurra a acao pra direita. */}
        {/* Os 5 do topo centram a 1a linha do titulo (30 de entrelinha) no
            botao redondo (40): (40 − 30) / 2. */}
        <Text
          flex={1}
          mt={5}
          numberOfLines={2}
          fontFamily="$display"
          fontSize={26}
          lineHeight={30}
          letterSpacing={-1}
          color="$forest"
        >
          {title}
        </Text>

        {/* A acao ocupa uma faixa de 40 e se centra nela — a mesma altura do
            botao redondo do voltar. Sem isso, com a linha ancorada no topo
            (`flex-start`), um link de texto ficava colado no topo enquanto o
            titulo descia os 5 do respiro optico: "Cadastrar" nascia acima de
            "Estabelecimentos". Botao de 40 ja preenche a faixa e nao muda. */}
        {!!action && (
          <Center style={{ minHeight: 40 }}>
            {action}
          </Center>
        )}
      </HStack>

      {/* Subtitulo FORA da linha do titulo. Dentro dela, a coluna
          titulo+subtitulo ficava centrada no eixo e empurrava o titulo ~7px
          pra baixo so nas telas que tem subtitulo — medido no navegador: 12px
          sem, 19px com. O titulo tem de comecar na MESMA altura em toda tela.
          O recuo alinha o subtitulo com o titulo, saltando o botao voltar
          (40 de botao + 12 de gap). */}
      {!!subtitle && (
        <Text
          numberOfLines={2}
          size="sm"
          color="$brandTextSecondary"
          mt="$1"
          ml={showBack ? 52 : 0}
        >
          {subtitle}
        </Text>
      )}
    </VStack>
  );
}
