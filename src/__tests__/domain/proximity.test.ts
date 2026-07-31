import { MOCK_ESTABLISHMENTS } from '@domain/establishment/mockData';
import { Establishment } from '@domain/establishment/types';
import {
  proximityRank,
  sortByProximity,
  haversineKm,
  establishmentDistanceKm,
  formatDistanceKm,
  sortByDistance,
} from '@domain/establishment/proximity';

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

// ─── Distância real (GPS) — backend entregou o geocoding em 2026-07-27 ───────

// Coordenadas reais para checar a fórmula contra distâncias conhecidas.
const FLORIPA_CENTRO = { latitude: -27.5954, longitude: -48.548 };
const SAO_JOSE_SC = { latitude: -27.6136, longitude: -48.6284 };
const SAO_PAULO = { latitude: -23.5505, longitude: -46.6333 };

function withCoords(id: string, latitude: number, longitude: number, wait = 10): Establishment {
  const base = withAddr(id, 'Florianópolis', 'Centro', wait);
  return { ...base, address: { ...base.address!, latitude, longitude } };
}

describe('distância real (GPS)', () => {
  describe('haversineKm', () => {
    it('mesmo ponto = 0', () => {
      expect(haversineKm(FLORIPA_CENTRO, FLORIPA_CENTRO)).toBe(0);
    });

    it('Floripa → São José ≈ 9 km', () => {
      expect(haversineKm(FLORIPA_CENTRO, SAO_JOSE_SC)).toBeCloseTo(9, 0);
    });

    it('Floripa → São Paulo ≈ 490 km', () => {
      expect(haversineKm(FLORIPA_CENTRO, SAO_PAULO)).toBeGreaterThan(470);
      expect(haversineKm(FLORIPA_CENTRO, SAO_PAULO)).toBeLessThan(510);
    });

    it('é simétrica', () => {
      expect(haversineKm(SAO_JOSE_SC, SAO_PAULO)).toBeCloseTo(haversineKm(SAO_PAULO, SAO_JOSE_SC), 6);
    });
  });

  describe('establishmentDistanceKm', () => {
    it('null quando a loja ainda não foi geocodificada', () => {
      expect(establishmentDistanceKm(withAddr('a', 'X', 'Y', 5), FLORIPA_CENTRO)).toBeNull();
    });

    it('null quando o device não tem coordenada (GPS negado)', () => {
      expect(establishmentDistanceKm(withCoords('a', -27.6, -48.5), null)).toBeNull();
    });

    it('calcula quando os dois lados têm coordenada', () => {
      const km = establishmentDistanceKm(withCoords('a', SAO_JOSE_SC.latitude, SAO_JOSE_SC.longitude), FLORIPA_CENTRO);
      expect(km).toBeCloseTo(9, 0);
    });
  });

  describe('formatDistanceKm', () => {
    it('abaixo de 1 km vira metros arredondados a 50', () => {
      expect(formatDistanceKm(0.32)).toBe('300 m');
      expect(formatDistanceKm(0.87)).toBe('850 m');
    });

    it('nunca mostra menos de 50 m (precisão do GPS)', () => {
      expect(formatDistanceKm(0.004)).toBe('50 m');
    });

    it('até 10 km usa uma casa decimal com vírgula', () => {
      expect(formatDistanceKm(2.34)).toBe('2,3 km');
    });

    it('acima de 10 km arredonda para inteiro', () => {
      expect(formatDistanceKm(12.6)).toBe('13 km');
    });
  });

  describe('sortByDistance', () => {
    it('mais perto primeiro quando há coordenadas', () => {
      const list = [
        withCoords('longe', SAO_PAULO.latitude, SAO_PAULO.longitude),
        withCoords('perto', -27.5964, -48.549),
        withCoords('medio', SAO_JOSE_SC.latitude, SAO_JOSE_SC.longitude),
      ];
      expect(sortByDistance(list, FLORIPA_CENTRO, null).map((e) => e.id)).toEqual([
        'perto',
        'medio',
        'longe',
      ]);
    });

    it('quem não tem coordenada NÃO some — vai depois, na ordem da Fase 1', () => {
      const list = [
        withAddr('sem-coord-lenta', 'Florianópolis', 'Centro', 40),
        withCoords('com-coord', SAO_JOSE_SC.latitude, SAO_JOSE_SC.longitude),
        withAddr('sem-coord-rapida', 'Florianópolis', 'Centro', 5),
      ];
      const out = sortByDistance(list, FLORIPA_CENTRO, { city: 'Florianópolis', neighborhood: 'Centro' });
      expect(out.map((e) => e.id)).toEqual(['com-coord', 'sem-coord-rapida', 'sem-coord-lenta']);
    });

    it('sem GPS cai na ordenação por bairro/cidade (Fase 1)', () => {
      const list = [
        withAddr('outra-cidade', 'Fortaleza', 'Centro', 5, 'CE'),
        withAddr('meu-bairro', 'Florianópolis', 'Centro', 30),
      ];
      const out = sortByDistance(list, null, { city: 'Florianópolis', neighborhood: 'Centro', state: 'SC' });
      expect(out.map((e) => e.id)).toEqual(['meu-bairro', 'outra-cidade']);
    });
  });
});
