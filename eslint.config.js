const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  ...expoConfig,
  {
    // `.claude/` guarda worktrees de agente — uma COPIA inteira do repo,
    // parada em outro commit. Sem ignorar, o lint reprova por arquivo que
    // nem existe nesta branch.
    //
    // `dist/` e `web-build/` sao a saida do `expo export`. Sem ignorar, um
    // `lint` rodado DEPOIS de gerar o site devolve milhares de problemas
    // vindos do bundle — e com `--max-warnings 0` no portao, isso reprova
    // tudo. Aviso do Andre em 27/08, depois de pisar nisso no parceiro.
    // .maestro/scripts roda no JS do Maestro (globais http, json, output), nao
    // no app — fora do lint, como no Partner.
    ignores: ['coverage/', '.expo/', 'node_modules/', '.claude/', 'dist/', 'web-build/', '.maestro/'],
  },
  {
    // tools/ roda no Node (ex.: a catraca da cobertura), fora do app.
    files: ['tools/**/*.js'],
    languageOptions: {
      globals: { __dirname: 'readonly', require: 'readonly', module: 'writable', process: 'readonly', console: 'readonly' },
    },
  },
]);
