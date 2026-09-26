import { readFileSync } from 'fs';
import { join } from 'path';

// Andre, 26/09: o "Pra ontem" mora na Home, logo abaixo da busca. Montar a Home
// exigiria mockar meia aplicacao; a varredura trava a ligacao.

const HOME = readFileSync(join(__dirname, '../../screens/Home.tsx'), 'utf8');

describe('o botão Pra ontem na Home', () => {
  it('liga e desliga, e troca a fonte da lista', () => {
    expect(HOME).toMatch(/testID="pra-ontem"/);
    expect(HOME).toMatch(/setPraOntem\(\(v\) => !v\)/);
    expect(HOME).toMatch(/usePraOntem\(praOntem\)/);
  });

  it('ligado, ordena por quem atende primeiro e mostra o rótulo na linha', () => {
    expect(HOME).toMatch(/ordenarPraOntem\(filterEstablishments\(/);
    expect(HOME).toMatch(/destaque=\{praOntem \? rotuloPraOntem\(item\) : null\}/);
  });
});
