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
    ignores: ['coverage/', '.expo/', 'node_modules/', '.claude/', 'dist/', 'web-build/'],
  },
]);
