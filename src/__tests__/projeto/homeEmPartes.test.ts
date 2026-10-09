import { readFileSync } from 'fs';
import { join } from 'path';

// Andre, 18/09: "na home podemos apresentar de acordo como o usuário vai
// scrollando a tela, em lazy?". A metade do Client: desenhar em partes, e não
// redesenhar todas as linhas a cada render da Home (tique do countdown, letra
// da busca, pílula aparecendo). Montar a Home exigiria mockar meia aplicação;
// a varredura trava o que importa.

const HOME = readFileSync(join(__dirname, '../../screens/Home.tsx'), 'utf8');
// A linha da loja mora no proprio arquivo desde 09/10 (distancia-e-nota-no-card).
const CARD = readFileSync(join(__dirname, '../../components/CardDaLoja.tsx'), 'utf8');

describe('a Home desenha as lojas em partes', () => {
  it('a lista desenha a primeira dobra e o resto em lotes', () => {
    expect(HOME).toMatch(/initialNumToRender=\{\d+\}/);
    expect(HOME).toMatch(/maxToRenderPerBatch=\{\d+\}/);
    expect(HOME).toMatch(/windowSize=\{\d+\}/);
  });

  it('a linha é memorizada, e o toque e o renderItem são estáveis', () => {
    expect(CARD).toMatch(/export const CardDaLoja = memo\(/);
    expect(HOME).toMatch(/<CardDaLoja\b/);
    expect(HOME).toMatch(/renderItem=\{renderLoja\}/);
    expect(HOME).toMatch(/const handleEstablishmentPress = useCallback\(/);
  });
});
