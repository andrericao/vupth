import { readFileSync } from 'fs';
import { join } from 'path';

// A sessão na web vive no armazenamento do navegador, e QUAL deles é decisão de
// produto, não detalhe:
//
//   sessionStorage → morre ao fechar a aba (era assim desde 12/08, mitigação 1
//                    do D8: computador compartilhado não herda sessão)
//   localStorage   → sobrevive ao fechamento (Andre, 19/09: "mantenha o cache,
//                    não deslogue a cada fechamento da web")
//
// Quem trocar isto está mudando a decisão — e este teste existe para que a
// troca seja deliberada.

const shim = readFileSync(join(__dirname, '../../../web-shims/expo-secure-store.js'), 'utf-8');
const headers = readFileSync(join(__dirname, '../../../public/_headers'), 'utf-8');

describe('a sessão na web sobrevive ao fechar a aba', () => {
  it('o shim guarda no localStorage, não no sessionStorage', () => {
    expect(shim).toMatch(/typeof localStorage !== 'undefined' \? localStorage : null/);
    expect(shim).not.toMatch(/return typeof sessionStorage/);
  });

  it('e o arquivo DIZ o que a troca custou — senão vira descuido aos olhos de quem vier', () => {
    expect(shim).toMatch(/computador compartilhado/i);
    expect(shim).toMatch(/2026-09-19/);
  });

  it('o CSP continua de pé: é ele que ataca o XSS, o vetor real', () => {
    expect(headers).toMatch(/Content-Security-Policy:/);
    expect(headers).toMatch(/script-src 'self'/);
  });
});
