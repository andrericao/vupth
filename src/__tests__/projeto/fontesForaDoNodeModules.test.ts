import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "../../..");
const APP = fs.readFileSync(path.join(ROOT, "App.tsx"), "utf8");

// GUARDA DAS FONTES DA MARCA (achado do front-partner, 2026-08-29, confirmado
// no nosso deploy no mesmo dia).
//
// O `expo export --platform web` grava cada asset espelhando o caminho de
// ORIGEM. Importar a fonte de `@expo-google-fonts/*` faz o TTF sair em
// `dist/assets/node_modules/@expo-google-fonts/...` — e a Cloudflare Pages
// DESCARTA `node_modules` do deploy, por design e sem avisar.
//
// ⚠️ O modo de falha nao aparece em teste de status code: com o fallback de
// SPA, o arquivo ausente responde 200 devolvendo o index.html. O que denuncia
// e o `content-type` (`text/html` em vez de `font/ttf`).
//
// Sao TRES condicoes, e as tres precisam valer juntas — por isso ficam aqui.

const FONTES = [
  "Inter_400Regular",
  "Inter_500Medium",
  "Inter_700Bold",
  "Archivo_700Bold",
  "Archivo_800ExtraBold",
  "DMMono_500Medium",
];

describe("fontes da marca sobrevivem ao deploy web", () => {
  it("o App NAO importa de @expo-google-fonts", () => {
    // Importar do pacote e o que joga o TTF para dentro de node_modules na
    // saida do export. Tambem e o que fazia as 42 fontes do pacote inteiro
    // entrarem no bundle, em vez das 6 que usamos.
    //
    // ⚠️ Proibir a STRING nao serve: o comentario que explica isto no App.tsx
    // precisa citar o pacote pelo nome. O que nao pode existir e o IMPORT.
    expect(APP).not.toMatch(/from\s+["']@expo-google-fonts/);
    expect(APP).not.toMatch(/require\(\s*["']@expo-google-fonts/);
  });

  it.each(FONTES)("o arquivo de %s existe em assets/fonts/", (fonte) => {
    expect(fs.existsSync(path.join(ROOT, "assets", "fonts", `${fonte}.ttf`))).toBe(true);
  });

  it.each(FONTES)("o App carrega %s por require de assets/fonts/", (fonte) => {
    expect(APP).toContain(`${fonte}: require("./assets/fonts/${fonte}.ttf")`);
  });

  it("o portao considera o ERRO, e nao so o carregado", () => {
    // Segurar a tela so no `fontsLoaded` transforma qualquer falha de fonte em
    // spinner eterno — foi o que derrubou o app publicado do parceiro. Fonte
    // que falha tem de degradar para a do sistema.
    expect(APP).toMatch(/const \[fontsLoaded, fontError\] = useFonts\(/);
    expect(APP).toMatch(/fontsLoaded \|\| Boolean\(fontError\)/);
    // E o portao de render tem de usar a variavel combinada, nao o cru.
    expect(APP).toContain("{!fontGateOpen ?");
    expect(APP).not.toContain("{!fontsLoaded ?");
  });
});
