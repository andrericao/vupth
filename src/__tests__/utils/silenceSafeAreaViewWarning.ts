// Silencia APENAS o warning "SafeAreaView has been deprecated" que o Gluestack v1
// dispara AO SER IMPORTADO (a lib referencia o SafeAreaView legado do react-native;
// o app usa react-native-safe-area-context — não há nada a corrigir no nosso código).
// Precisa ser importado ANTES de '@gluestack-ui/themed' (imports rodam em ordem).
// Qualquer outro console.warn continua passando normalmente.
// Remover na migração para o Gluestack v2 (tech-debt pós-MVP).
const realWarn = console.warn;

console.warn = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes('SafeAreaView has been deprecated')) {
    return;
  }
  realWarn(...args);
};

export {};
