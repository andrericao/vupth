import { MOCK_ESTABLISHMENTS } from '@domain/establishment/mockData';
import { Establishment } from '@domain/establishment/types';
import { proximityRank, sortByProximity } from '@domain/establishment/proximity';

function withAddr(
  id: string,
  city: string,
  neighborhood: string,
  wait: number | null,
  state = 'SC',
): Establishment {
  return {
    ...MOCK_ESTABLISHMENTS[0],
    id,
    open_status: 'OPEN',
    is_open: true,
    estimated_wait_minutes: wait,
    address: {
      street: 'R. X',
      number: '1',
      neighborhood,
      city,
      state,
      zipCode: '00000-000',
    },
  };
}

describe('proximityRank', () => {
  const loc = { city: 'Florianópolis', neighborhood: 'Centro', state: 'SC' };

  it('0 = mesmo bairro+cidade (acento/caixa ignorados)', () => {
    expect(proximityRank(withAddr('a', 'FLORIANOPOLIS', 'centro', 10), loc)).toBe(0);
  });
  it('1 = mesma cidade, bairro diferente', () => {
    expect(proximityRank(withAddr('b', 'Florianópolis', 'Trindade', 10), loc)).toBe(1);
  });
  it('2 = outra cidade', () => {
    expect(proximityRank(withAddr('c', 'Fortaleza', 'Centro', 10, 'CE'), loc)).toBe(2);
  });
  it('2 = mesma cidade mas UF diferente (homônimas)', () => {
    expect(proximityRank(withAddr('d', 'Florianópolis', 'Centro', 10, 'RS'), loc)).toBe(2);
  });
  it('2 = sem endereço', () => {
    const noAddr = { ...MOCK_ESTABLISHMENTS[0], id: 'e', address: undefined };
    expect(proximityRank(noAddr, loc)).toBe(2);
  });
});

describe('sortByProximity', () => {
  it('bairro → cidade → resto; dentro da faixa, menor espera primeiro', () => {
    const list = [
      withAddr('outra', 'Fortaleza', 'Centro', 5, 'CE'), // faixa 2
      withAddr('cidade-lenta', 'Florianópolis', 'Trindade', 40), // faixa 1
      withAddr('bairro', 'Florianópolis', 'Centro', 30), // faixa 0
      withAddr('cidade-rapida', 'Florianópolis', 'Agronômica', 10), // faixa 1
    ];
    const out = sortByProximity(list, { city: 'Florianópolis', neighborhood: 'Centro', state: 'SC' });
    // faixa 0 (bairro), depois faixa 1 ordenada por espera (10 antes de 40), depois faixa 2
    expect(out.map((e) => e.id)).toEqual(['bairro', 'cidade-rapida', 'cidade-lenta', 'outra']);
  });

  it('sem localização → ordem padrão (menor espera)', () => {
    const list = [withAddr('lenta', 'X', 'Y', 30), withAddr('rapida', 'X', 'Y', 5)];
    expect(sortByProximity(list, null).map((e) => e.id)).toEqual(['rapida', 'lenta']);
  });

  it('cidade vazia → ordem padrão', () => {
    const list = [withAddr('a', 'X', 'Y', 20)];
    expect(sortByProximity(list, { city: '' }).map((e) => e.id)).toEqual(['a']);
  });
});
