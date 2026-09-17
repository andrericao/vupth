import { readFileSync } from 'fs';
import { join } from 'path';

// O app.json declara o idioma da PÁGINA web. Sem ele, o Expo escreve
// `<html lang="en">` — e o navegador, acreditando, oferece traduzir uma página
// que já está em português.
//
// Foi o que aconteceu no Xiaomi (prints do Andre, 17/09, no app do parceiro):
// a aba "Início" virou "Não se trata de uma...", "Abrir estabelecimento" virou
// "Abrir estabelecer" e um contador virou "0 dólar". Nenhum desses textos
// existe no código — é a tradução automática mastigando português "traduzido"
// do inglês.
//
// Onde o Expo lê isto: @expo/cli, `webTemplate.js` — `exp.web?.lang ?? 'en'`.

const app = JSON.parse(readFileSync(join(__dirname, '../../../app.json'), 'utf-8'));

describe('a página web declara que está em português', () => {
  it('app.json → expo.web.lang = pt-BR', () => {
    expect(app.expo.web.lang).toBe('pt-BR');
  });

  it('e o valor é um código de idioma de verdade', () => {
    expect(app.expo.web.lang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
  });
});
