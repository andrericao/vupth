/** @type {import('tailwindcss').Config} */
// NativeWind v4 (DEC-5, migracao Gluestack v1 -> NativeWind, faseada). ESPELHO
// do tailwind.config.js do vupth-partner: os dois apps nao podem divergir.
// `content` cobre o App.tsx e
// src/ — como a migracao e tela por tela, o Tailwind so gera as classes que
// realmente aparecem no codigo (o v1 com props $token segue intocado).
module.exports = {
  content: [
    "./App.tsx",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // Os TTFs vem de `assets/fonts/` e sao carregados no `App.tsx`
      // — NAO de `@expo-google-fonts`: a Cloudflare Pages apaga node_modules
      // do deploy e o app publicado ficava num spinner eterno (2026-08-27).
      // Archivo substitui Poppins em heading/display; `mono` pros numeros
      // (fila, horarios) — precisa bater com config/gluestack-ui.config.ts.
      // O nome aqui e a chave do useFonts, entao mexer num lado exige o outro.
      fontFamily: {
        heading: ["Archivo_700Bold"],
        display: ["Archivo_800ExtraBold"],
        body: ["Inter_400Regular"],
        mono: ["DMMono_500Medium"],
      },
      // ═══ ESCALA DE TEXTO ═══ valores REAIS do arquivo de design, lidos da
      // tabela de variaveis (`GetVariables()`), nao inferidos. O papel de cada
      // nivel vem do frame "Foundations » TIPOGRAFIA":
      //
      //   xxxl 34 · 800 display · ls -1.5  Titulo Hero
      //   xxl  28 · 800 display · ls -1    Titulo de Tela
      //   xl   22 · 700 display · ls -0.5  Titulo de Secao
      //   lg   18 · 500 body               Subtitulo
      //   md   16 · 400 body               Corpo de texto padrao
      //   sm   14 · 400 body               Texto secundario / legendas
      //   xs   12 · 500 body               Rotulos e metadados
      //
      // Os NOMES sao os do arquivo de propósito: design e codigo passam a usar
      // a mesma palavra. `xs`, `sm` e `lg` ja batiam com o padrao do Tailwind;
      // `xl` muda de 20 para 22 (4 usos), e `md`/`xxl`/`xxxl` sao novos.
      // `text-base`, `text-2xl` e `text-3xl` seguem existindo mas estao FORA
      // da escala — migrar. Ver src/docs/DESIGN.md do vupth-partner.
      // "Tamanho da letra" (Andre, 26/09): cada tamanho le uma VARIAVEL CSS,
      // definida no layout raiz por `vars(varsDaFonte(passo))` (src/domain/fonte.ts).
      // No passo Normal os valores sao exatamente os de antes (ver o teste).
      fontSize: {
        xs: ["var(--text-xs)", { lineHeight: "var(--lh-xs)" }],
        sm: ["var(--text-sm)", { lineHeight: "var(--lh-sm)" }],
        md: ["var(--text-md)", { lineHeight: "var(--lh-md)" }],
        base: ["var(--text-base)", { lineHeight: "var(--lh-base)" }],
        lg: ["var(--text-lg)", { lineHeight: "var(--lh-lg)" }],
        xl: ["var(--text-xl)", { lineHeight: "var(--lh-xl)", letterSpacing: "-0.5px" }],
        "2xl": ["var(--text-2xl)", { lineHeight: "var(--lh-2xl)" }],
        xxl: ["var(--text-xxl)", { lineHeight: "var(--lh-xxl)", letterSpacing: "-1px" }],
        "3xl": ["var(--text-3xl)", { lineHeight: "var(--lh-3xl)" }],
        xxxl: ["var(--text-xxxl)", { lineHeight: "var(--lh-xxxl)", letterSpacing: "-1.5px" }],
        // Tamanhos soltos que as telas usavam como text-[13px]: agora text-f13.
        f10: "var(--f10)",
        f11: "var(--f11)",
        f13: "var(--f13)",
        f14: "var(--f14)",
        f15: "var(--f15)",
        f22: "var(--f22)",
        f26: "var(--f26)",
        f30: "var(--f30)",
        f32: "var(--f32)",
      },
      // ═══ RAIO ═══ tambem da tabela de variaveis. `card` (20) e `hero` (24)
      // sao tokens proprios do arquivo, alem da escala sm/md/lg/xl. Hoje ha 26
      // escapes `rounded-[20px]` no codigo — todos sao `rounded-card`.
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        card: "20px",
        hero: "24px",
        full: "999px",
      },
      // A escala `brand-*` (paleta "Verde Marca", ancorada em #3b7a3f desde
      // 2026-07-09) foi REMOVIDA em 2026-08-31: nenhuma classe do NativeWind
      // a usava mais. Todo componente `nw/` ja fala a identidade atual, o par
      // #9FE870 / #163300, que mora em `vupth.*` logo abaixo. As duas unicas
      // mencoes que sobraram no codigo sao comentarios contando que o token
      // ANTIGO era usado ali.
      //
      // ⚠️ Isto NAO quer dizer que a paleta antiga morreu no app: ela segue
      // viva nas telas do v1, que sao gluestack e leem `$green500` do
      // config/gluestack-ui.config.ts.— outro caminho, que nao passa por
      // aqui. Deixar a escala morta neste arquivo so convidava tela nova a
      // pegar #3b7a3f por engano.
      colors: {
        // Verde dos campos (v1 usava a escala `success` nos inputs/busca).
        success: { 500: "#348352", 950: "#071f11" },
        amber: { 500: "#FFB703", 600: "#d97706", 700: "#b45309" },
        danger: { 500: "#E63946", 600: "#dc2626" },
        // [marca-vupth] Tokens da nova identidade (Pencil, doc pencil-new.pen).
        // Namespaced sob `vupth` pra nao colidir com `brand`/`danger`/`amber`
        // acima (paleta antiga, ainda em uso). Precisa bater 1:1 com os tokens
        // `brand*` de config/gluestack-ui.config.ts.(client e partner) — mesma
        // regra do remap do green500. brandGreen so entra como FUNDO (nunca
        // texto/icone sobre claro); forest é o par de texto/icone por cima.
        vupth: {
          green: "#9FE870",
          forest: "#163300",
          forestSoft: "#223D0D",
          greenTint: "#E2F6D5",
          accentBlue: "#A0E1E1",
          accentPeach: "#FFC091",
          accentPink: "#FFD7EF",
          accentPlum: "#260A2F",
          background: "#FFFFFF",
          surface: "#F3F5F1",
          surfaceAlt: "#E2F6D5",
          textPrimary: "#163300",
          textSecondary: "#454745",
          // Ver brandTextPlaceholder no gluestack: o campo vazio parecia
          // preenchido porque o placeholder era textSecondary.
          textPlaceholder: "#6B706B",
          border: "#D7DDD3",
          danger: "#B3261E",
          dangerTint: "#F7E4E2",
          warning: "#FFC091",
          success: "#9FE870",
        },
      },
    },
  },
  plugins: [],
};
