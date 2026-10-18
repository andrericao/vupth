import fs from "fs";
import path from "path";

// O V estilizado da Design (17/10) no Client: icone e cor da notificacao do
// Android e o favicon da web. O icone e peca NATIVA: so vale com build novo, e
// sem esta guarda um arquivo apagado ou um plugin sem a config so apareceria no
// build (a notificacao sairia com o circulo cinza do Android, sem aviso algum).
// Espelho do teste do Partner (src/__tests__/projeto/marca.test.ts).
const ROOT = path.resolve(__dirname, "../../..");
const arq = (p: string) => path.join(ROOT, p);
const lerJson = (p: string) => JSON.parse(fs.readFileSync(arq(p), "utf8"));
const png = (p: string) => {
  const b = fs.readFileSync(arq(p));
  // assinatura PNG e o IHDR: largura e altura em 16..24, tipo de cor no byte 25
  expect(b.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), alfa: b[25] === 6 };
};

describe("marca — V estilizado", () => {
  it("icone da notificacao: 96x96 com transparencia", () => {
    const i = png("assets/marca/v-notificacao-96.png");
    expect([i.w, i.h]).toEqual([96, 96]);
    expect(i.alfa).toBe(true);
  });

  it("favicons PNG nos tamanhos pedidos (16, 32, 48, 180 e 512)", () => {
    expect(png("assets/marca/favicon-16.png").w).toBe(16);
    expect(png("assets/marca/favicon-32.png").w).toBe(32);
    expect(png("assets/marca/favicon-48.png").w).toBe(48);
    expect(png("assets/marca/apple-touch-icon-180.png").w).toBe(180);
    expect(png("assets/marca/favicon-512.png").w).toBe(512);
  });

  it("SVG do V e do favicon existem e sao vetor", () => {
    expect(fs.readFileSync(arq("assets/marca/v.svg"), "utf8")).toContain("<path");
    expect(fs.readFileSync(arq("assets/marca/favicon.svg"), "utf8")).toContain("<path");
  });

  it("o app.json poe o icone e a cor (forest) no plugin do expo-notifications", () => {
    const { plugins } = lerJson("app.json").expo;
    const par = plugins.find((p: unknown) => Array.isArray(p) && p[0] === "expo-notifications");
    expect(par?.[1]).toEqual({ icon: "./assets/marca/v-notificacao-96.png", color: "#163300" });
    expect(fs.existsSync(arq("assets/marca/v-notificacao-96.png"))).toBe(true);
  });

  it("o favicon do app.json e o V, nao o PNG antigo — e o arquivo existe", () => {
    const favicon: string = lerJson("app.json").expo.web.favicon;
    expect(favicon).toBe("./assets/marca/favicon-48.png");
    expect(fs.existsSync(arq(favicon))).toBe(true);
  });

  it("a web serve o favicon: arquivos em public/ e as tags no index.html", () => {
    const html = fs.readFileSync(arq("public/index.html"), "utf8");
    for (const f of ["favicon.svg", "favicon-16.png", "favicon-32.png", "favicon-512.png", "apple-touch-icon.png"]) {
      expect(fs.existsSync(arq(`public/${f}`))).toBe(true);
      expect(html).toContain(`/${f}`);
    }
  });

  it("o modelo do index.html mantem os marcadores que o Expo preenche (idioma e titulo)", () => {
    const html = fs.readFileSync(arq("public/index.html"), "utf8");
    expect(html).toContain('<html lang="%LANG_ISO_CODE%">');
    expect(html).toContain("<title>%WEB_TITLE%</title>");
    expect(html).toContain('<div id="root"></div>');
  });

  it("public/ e assets/marca/ guardam os mesmos arquivos (uma copia nao fica velha)", () => {
    const par: [string, string][] = [
      ["favicon.svg", "favicon.svg"],
      ["favicon-16.png", "favicon-16.png"],
      ["favicon-32.png", "favicon-32.png"],
      ["favicon-512.png", "favicon-512.png"],
      ["apple-touch-icon-180.png", "apple-touch-icon.png"],
    ];
    for (const [deAssets, dePublic] of par) {
      expect(fs.readFileSync(arq(`public/${dePublic}`)).equals(fs.readFileSync(arq(`assets/marca/${deAssets}`)))).toBe(true);
    }
  });
});
