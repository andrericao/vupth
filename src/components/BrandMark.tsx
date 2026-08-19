import { Image, ImageStyle, StyleProp } from "react-native";

/* ─────────────────────────── FONTE ÚNICA DA MARCA ───────────────────────────
 *
 * Trocar o logo do VUPTH = trocar `assets/icon.png`. Só isso.
 *
 * Esse é o MESMO arquivo que o `app.json` aponta como ícone nativo, então a
 * arte existe uma vez só: o que aparece na gaveta de apps e o que aparece
 * dentro do app não podem mais divergir. (Antes eram dois PNGs idênticos —
 * `assets/icon.png` e `src/assets/vupth-logo/vupth-v.png` — e quem trocasse
 * um esqueceria o outro.)
 *
 * O que NÃO sai daqui, porque é nativo e o `app.json` resolve em tempo de
 * build (não sai por OTA):
 *   - `assets/adaptive-icon.png` — ícone adaptativo do Android
 *   - `assets/splash.png`        — tela de abertura
 *   - `assets/favicon.png`       — web
 * Ao trocar a marca, regerar esses três a partir da mesma arte e fazer um
 * `eas build` novo.
 *
 * Decisão do Andre (2026-08-06): dentro do app entra APENAS o "V" — o nome
 * escrito não acompanha a marca nas telas.
 * ────────────────────────────────────────────────────────────────────────── */
const MARK = require("../../assets/icon.png");

/** Tamanho padrão do "V" nas telas — a mesma área que o desenho antigo ocupava. */
export const BRAND_MARK_SIZE = 50;

/** Proporção do arredondamento: mantém o formato de ladrilho em qualquer tamanho. */
const CORNER_RATIO = 0.24;

type Props = {
  /** Lado do quadrado, em px. Default: `BRAND_MARK_SIZE`. */
  size?: number;
  style?: StyleProp<ImageStyle>;
};

/**
 * O "V" do VUPTH. Único componente que conhece a arte da marca — qualquer tela
 * que precise do logo usa este, nunca um `require` próprio.
 */
export function BrandMark({ size = BRAND_MARK_SIZE, style }: Props) {
  return (
    <Image
      source={MARK}
      testID="brand-mark"
      accessibilityRole="image"
      accessibilityLabel="VUPTH"
      // O PNG carrega o fundo verde: os cantos arredondados fazem ele ler como
      // marca, e não como uma imagem solta no meio da tela.
      resizeMode="cover"
      style={[
        { width: size, height: size, borderRadius: size * CORNER_RATIO },
        style,
      ]}
    />
  );
}
