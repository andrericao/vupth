const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  ...expoConfig,
  {
    // `.claude/` guarda worktrees de agente — uma COPIA inteira do repo,
    // parada em outro commit. Sem ignorar, o lint reprova por arquivo que
    // nem existe nesta branch.
    ignores: ['coverage/', '.expo/', 'node_modules/', '.claude/'],
  },
]);
