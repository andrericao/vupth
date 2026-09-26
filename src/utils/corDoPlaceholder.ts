// Caminho relativo: o jest nao resolve o "config/" do baseUrl do tsconfig.
import { gluestackUIConfig } from "../../config/gluestack-ui.config";

// A cor do placeholder vem do TEMA (`brandTextPlaceholder`). Ate 25/09 ela
// estava crua (#6B706B) em quatro `TextInput` — trocar o token no tema nao
// chegava a eles. O `TextInput` do React Native nao le token do Gluestack,
// entao o valor e resolvido aqui, uma vez.
export const COR_DO_PLACEHOLDER: string = gluestackUIConfig.tokens.colors.brandTextPlaceholder;
