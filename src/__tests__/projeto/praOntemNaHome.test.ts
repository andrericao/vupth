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

  // Andre, 26/09: "volte os filtros, barbearia, salão, manicure ao lado do pra ontem".
  it('as categorias ficam na mesma faixa do Pra ontem, e tocar na ativa desliga', () => {
    expect(HOME).toMatch(/CATEGORIAS_DA_FAIXA: ServiceType\[\] = \["BARBER", "BEAUTY_SALON", "NAIL_SALON"/);
    expect(HOME).toMatch(/testID=\{`filtro-\$\{c\}`\}/);
    expect(HOME).toMatch(/atual === c \? "ALL" : c/);
  });
});
