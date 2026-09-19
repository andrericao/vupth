// Substituto de expo-secure-store para o bundle WEB apenas (ver metro.config.js).
//
// O pacote nao tem implementacao web: build/ExpoSecureStore.web.js exporta um
// objeto vazio, entao a 1a chamada estoura. Como sessao, fila e preferencias
// passam todas por ele, sem isto o app nao autentica no navegador — e o erro
// sobe ate um Alert.alert, que tambem e no-op no React Native Web, deixando a
// tela parada sem dizer nada.
//
// Armazenamento de navegador NAO e cofre. Mas a web deixou de ser so um atalho
// de desenvolvimento: https://vupth.pages.dev e um deploy publicado, e o que
// este arquivo decide vale para quem abrir o app por link.
//
// 🔓 localStorage desde 2026-09-19, por decisao do Andre: "mantenha o cache,
// nao deslogue a cada fechamento da web". A SESSAO SOBREVIVE ao fechar a aba,
// como em qualquer site que o usuario conhece.
//
// O que isso reverte, para quem vier depois nao achar que foi descuido: ate
// aqui era `sessionStorage` (mitigacao 1 do D8, 2026-08-12), e o token morria
// com a aba — o proximo que sentasse num computador compartilhado nao herdava
// a sessao. O preco era logar a cada visita, e foi esse preco que o Andre
// recusou. O RISCO que fica e o mesmo de qualquer site: quem usa computador
// compartilhado precisa SAIR pelo app.
//
// ⚠️ A outra metade da mitigacao CONTINUA valendo, e agora carrega sozinha o
// lado da seguranca: o CSP em `public/_headers` ataca o XSS, que e o vetor
// real — aqui o token e legivel por qualquer JS da mesma origem.
//
// ⚠️ O C26 do partner pede que os dois shims nao divirjam: o partner precisa
// da mesma troca, senao o cliente segue logado e o profissional nao.

function store() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

// Navegador com storage bloqueado (modo privativo, cookies desligados): a
// sessao vive enquanto a aba estiver aberta. E menos do que o localStorage
// entrega, mas e o maximo possivel sem storage — e melhor que nao logar.
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
