import fs from 'fs';
import path from 'path';

// loja-fechada (Design, 17/10): "a linha apagada diz 'nao da para nada' — e dá:
// fechada agora, a loja aceita agendar e pedir corte". E `opacity` derruba o
// contraste do nome para menos de 4,5:1. O selo ambar (agendar-ambar, Andre
// 18/10) entrou, mas a linha continuou apagada; um comentario pedindo "nao
// apaguem" nao pegaria a proxima lista.
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
});
