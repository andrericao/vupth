import {
  MINUTOS_POR_KM,
  minutosAteSerAtendido,
  ordenarPraOntem,
  rotuloPraOntem,
} from '@domain/establishment/praOntem';
import { Establishment } from '@domain/establishment/types';

// Andre, 26/09: "o pra ontem é para quando a pessoa quer cortar porque tem algum
// compromisso, tipo casamento, festas, encontro. A pessoa pesquisa e aparece os
// mais próximos e livres".

const loja = (id: string, espera: number | null | undefined, km: number | null | undefined) =>
  ({
    id,
    name: id,
    ownerId: 'o',
    urlImage: null,
    open_status: 'OPEN',
    is_open: true,
    status: 'ACTIVE',
    services: [],
    estimated_wait_minutes: espera,
    distance_km: km,
  }) as Establishment;

describe('em quantos minutos a pessoa senta na cadeira', () => {
  it('a fila anda enquanto ela vai: vale o MAIOR entre espera e caminho, não a soma', () => {
    expect(minutosAteSerAtendido(loja('a', 20, 2))).toBe(20); // caminho 6 < fila 20
    expect(minutosAteSerAtendido(loja('b', 0, 4))).toBe(4 * MINUTOS_POR_KM); // sem fila: o caminho
  });

  it('sem distância (sem GPS ou loja não geocodificada), conta só a espera', () => {
    expect(minutosAteSerAtendido(loja('a', 15, null))).toBe(15);
    expect(minutosAteSerAtendido(loja('a', 15, undefined))).toBe(15);
  });

  it('espera desconhecida é desconhecida — não vira zero', () => {
    expect(minutosAteSerAtendido(loja('a', null, 1))).toBeNull();
    expect(minutosAteSerAtendido(loja('a', undefined, 1))).toBeNull();
  });
});

describe('a ordem do Pra ontem', () => {
  it('a da esquina com 40 min de fila vem DEPOIS da que fica a 3 km sem fila', () => {
    const esquina = loja('esquina', 40, 0.2);
    const longe = loja('longe', 0, 3);
    expect(ordenarPraOntem([esquina, longe]).map((e) => e.id)).toEqual(['longe', 'esquina']);
  });

  it('sem distância vai depois das com distância; espera desconhecida por último', () => {
    const lista = [loja('sem-espera', null, 0.1), loja('sem-km', 0, null), loja('perto', 30, 1)];
    expect(ordenarPraOntem(lista).map((e) => e.id)).toEqual(['perto', 'sem-km', 'sem-espera']);
  });

  it('empate mantém a ordem do servidor e a lista original não muda', () => {
    const lista = [loja('a', 10, 1), loja('b', 10, 2), loja('c', 5, 0)];
    expect(ordenarPraOntem(lista).map((e) => e.id)).toEqual(['c', 'a', 'b']);
    expect(lista.map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('o rótulo na linha da loja', () => {
  it('agora, minutos e horas', () => {
    expect(rotuloPraOntem(loja('a', 0, null))).toBe('Atende agora');
    expect(rotuloPraOntem(loja('a', 25, null))).toBe('Atende em ~25 min');
    expect(rotuloPraOntem(loja('a', 60, null))).toBe('Atende em ~1h');
    expect(rotuloPraOntem(loja('a', 75, null))).toBe('Atende em ~1h15');
    expect(rotuloPraOntem(loja('a', 125, null))).toBe('Atende em ~2h05');
  });

  it('espera desconhecida não ganha rótulo', () => {
    expect(rotuloPraOntem(loja('a', null, 1))).toBeNull();
  });
});
