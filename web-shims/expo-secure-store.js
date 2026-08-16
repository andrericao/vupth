// Substituto de expo-secure-store para o bundle WEB apenas (ver metro.config.js).
//
// O pacote nao tem implementacao web: build/ExpoSecureStore.web.js exporta um
// objeto vazio, entao a 1a chamada estoura. Como sessao, fila e preferencias
// passam todas por ele, sem isto o app nao autentica no navegador — e o erro
// sobe ate um Alert.alert, que tambem e no-op no React Native Web, deixando a
// tela parada sem dizer nada.
//
// localStorage NAO e armazenamento seguro. Isto vale so para rodar o app no
// navegador durante o desenvolvimento; o alvo de producao continua iOS/Android,
// onde o pacote real e usado sem passar por aqui.

function store() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

// Navegador com storage bloqueado (modo privativo, cookies desligados): mantem
// a sessao viva ao menos enquanto a aba estiver aberta.
const fallback = new Map();

export async function getItemAsync(key) {
  const s = store();
  return s ? s.getItem(key) : fallback.get(key) ?? null;
}

export async function setItemAsync(key, value) {
  const s = store();
  if (s) s.setItem(key, value);
  else fallback.set(key, value);
}

export async function deleteItemAsync(key) {
  const s = store();
  if (s) s.removeItem(key);
  else fallback.delete(key);
}

export async function isAvailableAsync() {
  return true;
}
