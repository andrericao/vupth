import { readFileSync } from 'fs';
import { join } from 'path';

// Andre, 24/09: "o texto fica espremido no input de buscar o estabelecimento,
// na home". O campo tinha `padding: 0` e nenhuma altura: no Android a caixa
// ficava do tamanho do glifo; na web o <input> trazia borda e anel próprios.
// Montar a Home aqui exigiria mockar meia aplicação — a varredura trava o que
// importa: o campo tem altura, altura de linha e o reset de web.

const HOME = readFileSync(join(__dirname, '../../screens/Home.tsx'), 'utf8');
const campo = HOME.slice(HOME.indexOf('{/* Busca */}'), HOME.indexOf('testID="busca-home"') + 20);

describe('a busca da Home não espreme o texto', () => {
  it('o recorte achou o campo', () => {
    expect(campo).toContain('<TextInput');
  });

  it('a caixa tem altura mínima, e o texto altura de linha', () => {
    expect(campo).toMatch(/minHeight=\{50\}/);
    expect(campo).toMatch(/lineHeight: 20/);
  });

  it('sem o respiro de fonte do Android, e com o reset de web', () => {
    expect(campo).toMatch(/includeFontPadding: false/);
    expect(campo).toMatch(/RESET_WEB/);
  });

  it('não volta o `padding: 0` sem altura que causou o defeito', () => {
    expect(campo).not.toMatch(/padding: 0 \}/);
  });
});
