import fs from 'fs';
import path from 'path';

// loja-fechada (Design, 17/10): "a linha apagada diz 'nao da para nada' — e dá:
// fechada agora, a loja aceita agendar e pedir corte". E `opacity` derruba o
// contraste do nome para menos de 4,5:1. Havia duas decisoes contraditorias (o
// amber do Andre, 23/07, e a linha apagada da Design, 26/08) e o codigo seguia a
// segunda; um comentario pedindo "nao apaguem" nao pegaria a proxima lista.
const ROOT = path.resolve(__dirname, '../../..');
const ler = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');

describe('loja fechada: badge AGENDAR, linha sem apagar', () => {
  it.each(['src/components/CardDaLoja.tsx', 'src/components/LinhaDaLojaFechada.tsx', 'src/screens/EstablishmentList.tsx'])(
    '%s nao aplica opacity na linha da loja',
    (arquivo) => {
      expect(ler(arquivo)).not.toMatch(/\bopacity=\{/);
    },
  );

  it('as duas listas e a tela da loja usam o mesmo BadgeAgendar', () => {
    expect(ler('src/components/CardDaLoja.tsx')).toContain('<BadgeAgendar');
    expect(ler('src/components/LinhaDaLojaFechada.tsx')).toContain('<BadgeAgendar');
    expect(ler('src/screens/EstablishmentList.tsx')).toContain('<LinhaDaLojaFechada');
    expect(ler('src/screens/EstablishmentDetail.tsx')).toContain('<BadgeAgendar');
  });

  it('o amber do tema e o #FFB703 do desenho', () => {
    expect(ler('config/gluestack-ui.config.ts')).toMatch(/amber500:\s*'#FFB703'/);
  });
});
